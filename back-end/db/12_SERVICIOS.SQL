-- ============================================================================
-- 12_SERVICIOS.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Un SERVICIO agrupa varias RESERVAS (pasajeros) que comparten un mismo
--   viaje/recorrido. Flujo:
--     1) Operadora asigna reservas a un conductor (DESPACHADA).
--     2) Conductor "recoge" al primer pasajero -> crea el SERVICIO
--        (HORA_RECOGIDA) y enlaza esa reserva.
--     3) En "Servicios" agrega mas reservas (pasajeros) al servicio.
--     4) "Finalizar" -> HORA_FINALIZADO y todas sus reservas COMPLETADAS.
--
--   * SP_INICIAR_SERVICIO          -> crea el servicio al recoger 1er pasajero.
--   * SP_AGREGAR_RESERVA_SERVICIO  -> agrega una reserva (pasajero) al servicio.
--   * SP_FINALIZAR_SERVICIO        -> finaliza servicio + marcas sus reservas.
--   * SP_LISTAR_SERVICIOS_CONDUCTOR-> servicios del conductor + pasajeros.
--   * SP_LISTAR_RESERVAS_DISPONIBLES -> reservas DESPACHADA aun sin servicio.
--   * SP_LISTAR_SERVICIOS          -> historial (operadora/admin).
--
-- ORDEN DE EJECUCION: despues de 11_RESERVAS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- Reconstruccion limpia.
ALTER TABLE RESERVAS DROP CONSTRAINT IF EXISTS reservas_servicio_id_fkey;
ALTER TABLE RESERVAS DROP COLUMN IF EXISTS SERVICIO_ID;
DROP TABLE IF EXISTS SERVICIO CASCADE;
DROP FUNCTION IF EXISTS SP_LISTAR_MIS_VIAJES(INTEGER);

-- ============================================================================
-- TABLA: SERVICIO (viaje ejecutado, agrupa reservas)
-- ============================================================================
CREATE TABLE SERVICIO (
    ID               SERIAL       PRIMARY KEY,
    CONDUCTOR_ID     INTEGER      REFERENCES USUARIOS(ID),
    HORA_RECOGIDA    TIMESTAMPTZ,
    HORA_FINALIZADO  TIMESTAMPTZ,
    ESTADO           VARCHAR(20)  NOT NULL DEFAULT 'EN_CURSO'
                     CHECK (ESTADO IN ('EN_CURSO', 'COMPLETADA', 'CANCELADA')),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

ALTER TABLE SERVICIO ADD CONSTRAINT FK_SERVICIO_CREADO
    FOREIGN KEY (CREADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE SERVICIO ADD CONSTRAINT FK_SERVICIO_MODIF
    FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

CREATE TRIGGER TRG_SERVICIO_MODIFICADO
BEFORE UPDATE ON SERVICIO
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

-- Reserva pertenece a UN servicio (agregada al recoger).
ALTER TABLE RESERVAS ADD COLUMN SERVICIO_ID INTEGER REFERENCES SERVICIO(ID);

CREATE INDEX IDX_SERVICIO_CONDUCTOR ON SERVICIO (CONDUCTOR_ID);
CREATE INDEX IDX_RESERVAS_SERVICIO   ON RESERVAS (SERVICIO_ID);

-- ============================================================================
-- SP: SP_INICIAR_SERVICIO (recoger primer pasajero)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_INICIAR_SERVICIO(
    P_RESERVA_ID INTEGER,
    P_AUTOR      INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_CONDUCTOR  INTEGER;
    V_SERVICIO   INTEGER;
BEGIN
    SELECT CONDUCTOR_ID INTO V_CONDUCTOR
    FROM RESERVAS
    WHERE ID = P_RESERVA_ID AND ESTADO = 'DESPACHADA';

    IF V_CONDUCTOR IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO SERVICIO (CONDUCTOR_ID, HORA_RECOGIDA, ESTADO, CREADO_POR, MODIFICADO_POR)
    VALUES (V_CONDUCTOR, NOW(), 'EN_CURSO', P_AUTOR, P_AUTOR)
    RETURNING ID INTO V_SERVICIO;

    UPDATE RESERVAS
    SET SERVICIO_ID = V_SERVICIO, ESTADO = 'EN_CURSO',
        MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_RESERVA_ID;

    RETURN jsonb_build_object('id', V_SERVICIO);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_AGREGAR_RESERVA_SERVICIO
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_AGREGAR_RESERVA_SERVICIO(
    P_SERVICIO_ID INTEGER,
    P_RESERVA_ID  INTEGER,
    P_AUTOR       INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE RESERVAS R
    SET SERVICIO_ID = P_SERVICIO_ID, ESTADO = 'EN_CURSO',
        MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE R.ID = P_RESERVA_ID
      AND R.ESTADO = 'DESPACHADA'
      AND R.SERVICIO_ID IS NULL
      AND EXISTS (
          SELECT 1 FROM SERVICIO S
          WHERE S.ID = P_SERVICIO_ID
            AND S.ESTADO = 'EN_CURSO'
            AND S.CONDUCTOR_ID = R.CONDUCTOR_ID
      );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_FINALIZAR_SERVICIO
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_FINALIZAR_SERVICIO(
    P_SERVICIO_ID INTEGER,
    P_AUTOR       INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE SERVICIO
    SET HORA_FINALIZADO = NOW(), ESTADO = 'COMPLETADA',
        MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_SERVICIO_ID AND ESTADO = 'EN_CURSO';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE RESERVAS
    SET ESTADO = 'COMPLETADA', MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE SERVICIO_ID = P_SERVICIO_ID AND ESTADO = 'EN_CURSO';

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_SERVICIOS_CONDUCTOR (servicios + pasajeros)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_SERVICIOS_CONDUCTOR(
    P_CONDUCTOR_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(srv), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            S.ID,
            S.ESTADO,
            S.HORA_RECOGIDA,
            S.HORA_FINALIZADO,
            S.CREADO_AT,
            COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id',               R.ID,
                    'pasajero_nombre',  R.PASAJERO_NOMBRE,
                    'pasajero_telefono',R.PASAJERO_TELEFONO,
                    'origen',           R.ORIGEN,
                    'destino',          R.DESTINO,
                    'num_pasajeros',    R.NUM_PASAJEROS,
                    'estado',           R.ESTADO,
                    'codigo_secreto',   R.CODIGO_SECRETO
                ) ORDER BY R.ID)
                FROM RESERVAS R WHERE R.SERVICIO_ID = S.ID
            ), '[]'::jsonb) AS pasajeros
        FROM SERVICIO S
        WHERE S.CONDUCTOR_ID = P_CONDUCTOR_ID
        ORDER BY S.HORA_RECOGIDA DESC NULLS LAST, S.ID
    ) srv;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_RESERVAS_DISPONIBLES (DESPACHADA aun sin servicio)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_RESERVAS_DISPONIBLES(
    P_CONDUCTOR_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            R.ID, R.PASAJERO_NOMBRE, R.PASAJERO_TELEFONO, R.FECHA_HORA,
            R.ORIGEN, R.DESTINO, R.NUM_PASAJEROS, R.NOTAS, R.ESTADO,
            R.CODIGO_SECRETO
        FROM RESERVAS R
        WHERE R.CONDUCTOR_ID = P_CONDUCTOR_ID
          AND R.ESTADO = 'DESPACHADA'
          AND R.SERVICIO_ID IS NULL
        ORDER BY R.FECHA_HORA, R.ID
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_SERVICIO (detalle para autorizar)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_SERVICIO(
    P_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',             S.ID,
        'conductor_id',   S.CONDUCTOR_ID,
        'estado',         S.ESTADO,
        'hora_recogida',  S.HORA_RECOGIDA,
        'hora_finalizado',S.HORA_FINALIZADO
    ) INTO V_RESULTADO
    FROM SERVICIO S
    WHERE S.ID = P_ID;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_SERVICIOS (historial para operadora/admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_SERVICIOS(
    P_ESTADO VARCHAR(20) DEFAULT NULL,
    P_Q      TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(srv), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            S.ID,
            S.CONDUCTOR_ID,
            D.NOMBRES || ' ' || D.APELLIDOS AS CONDUCTOR,
            S.HORA_RECOGIDA,
            S.HORA_FINALIZADO,
            S.ESTADO,
            S.CREADO_AT,
            COALESCE((
                SELECT jsonb_agg(R.PASAJERO_NOMBRE ORDER BY R.ID)
                FROM RESERVAS R WHERE R.SERVICIO_ID = S.ID
            ), '[]'::jsonb) AS pasajeros
        FROM SERVICIO S
        LEFT JOIN USUARIOS D ON D.ID = S.CONDUCTOR_ID
        WHERE (P_ESTADO IS NULL OR S.ESTADO = P_ESTADO)
        ORDER BY S.HORA_RECOGIDA DESC NULLS LAST, S.ID
    ) srv;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_CAMBIAR_ESTADO_RESERVA (re-creado: solo CANCELAR pendiente/despachada)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_RESERVA(
    P_ID     INTEGER,
    P_ESTADO VARCHAR(20),
    P_AUTOR  INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF P_ESTADO = 'CANCELADA' THEN
        UPDATE RESERVAS
        SET ESTADO = 'CANCELADA', MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
        WHERE ID = P_ID AND ESTADO IN ('PENDIENTE', 'ACEPTADA', 'DESPACHADA');
        RETURN FOUND;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 12_SERVICIOS.SQL
-- ============================================================================