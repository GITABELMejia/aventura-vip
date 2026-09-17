-- ============================================================================
-- 15_PUNTOS_RECOGIDA.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   El ADMIN configura PUNTOS DE RECOGIDA (hora + lugar). El CONDUCTOR puede
--   crear servicios directamente sobre reservas SIN asignar (PENDIENTE/ACEPTADA)
--   que coincidan con un punto (lugar) y cuya hora de recogida sea DESDE la hora
--   configurada.
--
--   * PUNTOS_RECOGIDA: SP_CREAR_PUNTO, SP_LISTAR_PUNTOS, SP_ACTUALIZAR_PUNTO,
--     SP_CAMBIAR_ESTADO_PUNTO.
--   * SP_LISTAR_RESERVAS_POOL  -> reservas "tomables" por el conductor.
--   * SP_INICIAR_SERVICIO_DIRECTO -> auto-asigna conductor + EN_CURSO + servicio.
--
-- ORDEN DE EJECUCION: despues de 14_VINCULAR_PASAJERO.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS PUNTOS_RECOGIDA CASCADE;

-- ============================================================================
-- TABLA: PUNTOS_RECOGIDA
-- ============================================================================
CREATE TABLE PUNTOS_RECOGIDA (
    ID         SERIAL        PRIMARY KEY,
    HORA       TIME          NOT NULL,
    LUGAR      VARCHAR(150)  NOT NULL,
    ESTADO     VARCHAR(20)   NOT NULL DEFAULT 'ACTIVO'
               CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

ALTER TABLE PUNTOS_RECOGIDA ADD CONSTRAINT FK_PUNTOS_CREADO
    FOREIGN KEY (CREADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE PUNTOS_RECOGIDA ADD CONSTRAINT FK_PUNTOS_MODIF
    FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

CREATE TRIGGER TRG_PUNTOS_MODIFICADO
BEFORE UPDATE ON PUNTOS_RECOGIDA
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

-- ============================================================================
-- SPs DE PUNTOS DE RECOGIDA
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_CREAR_PUNTO(
    P_HORA  TIME,
    P_LUGAR VARCHAR(150),
    P_AUTOR INTEGER
) RETURNS INTEGER AS $$
DECLARE V_ID INTEGER;
BEGIN
    INSERT INTO PUNTOS_RECOGIDA (HORA, LUGAR, CREADO_POR, MODIFICADO_POR)
    VALUES (P_HORA, P_LUGAR, P_AUTOR, P_AUTOR)
    RETURNING ID INTO V_ID;
    RETURN V_ID;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_LISTAR_PUNTOS() RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT P.ID, P.HORA, P.LUGAR, P.ESTADO
        FROM PUNTOS_RECOGIDA P
        ORDER BY P.HORA, P.LUGAR
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_ACTUALIZAR_PUNTO(
    P_ID    INTEGER,
    P_HORA  TIME,
    P_LUGAR VARCHAR(150),
    P_AUTOR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE PUNTOS_RECOGIDA
    SET HORA = P_HORA, LUGAR = P_LUGAR,
        MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_PUNTO(
    P_ID     INTEGER,
    P_ESTADO VARCHAR(20),
    P_AUTOR  INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE PUNTOS_RECOGIDA
    SET ESTADO = P_ESTADO, MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_RESERVAS_POOL (reservas "tomables" por el conductor)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_RESERVAS_POOL(
    P_CONDUCTOR_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            R.ID, R.PASAJERO_NOMBRE, R.PASAJERO_TELEFONO, R.FECHA_HORA,
            R.ORIGEN, R.DESTINO, R.NUM_PASAJEROS, R.NOTAS, R.ESTADO,
            R.CODIGO_SECRETO,
            PU.DNI    AS PASAJERO_DNI,
            PU.CORREO AS PASAJERO_CORREO
        FROM RESERVAS R
        LEFT JOIN USUARIOS PU ON PU.ID = R.PASAJERO_USUARIO_ID
        WHERE R.ESTADO IN ('PENDIENTE', 'ACEPTADA')
          AND R.CONDUCTOR_ID IS NULL
          AND R.SERVICIO_ID IS NULL
          AND EXISTS (
              SELECT 1 FROM PUNTOS_RECOGIDA Q
              WHERE Q.ESTADO = 'ACTIVO'
                AND Q.LUGAR = R.ORIGEN
          )
        ORDER BY R.FECHA_HORA, R.ID
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_INICIAR_SERVICIO_DIRECTO (auto-asigna conductor + crea servicio)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_INICIAR_SERVICIO_DIRECTO(
    P_RESERVA_ID   INTEGER,
    P_CONDUCTOR_ID INTEGER,
    P_AUTOR        INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_SERVICIO INTEGER;
BEGIN
    -- Solo reservas sin asignar y de un punto activo (desde la hora configurada).
    IF NOT EXISTS (
        SELECT 1 FROM RESERVAS R
        JOIN PUNTOS_RECOGIDA Q ON Q.LUGAR = R.ORIGEN
        WHERE R.ID = P_RESERVA_ID
          AND R.ESTADO IN ('PENDIENTE', 'ACEPTADA')
          AND R.CONDUCTOR_ID IS NULL
          AND R.SERVICIO_ID IS NULL
          AND Q.ESTADO = 'ACTIVO'
    ) THEN
        RETURN NULL;
    END IF;

    INSERT INTO SERVICIO (CONDUCTOR_ID, HORA_RECOGIDA, ESTADO, CREADO_POR, MODIFICADO_POR)
    VALUES (P_CONDUCTOR_ID, NOW(), 'EN_CURSO', P_AUTOR, P_AUTOR)
    RETURNING ID INTO V_SERVICIO;

    UPDATE RESERVAS
    SET CONDUCTOR_ID = P_CONDUCTOR_ID, SERVICIO_ID = V_SERVICIO,
        ESTADO = 'EN_CURSO', MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_RESERVA_ID;

    RETURN jsonb_build_object('id', V_SERVICIO);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_AGREGAR_RESERVA_SERVICIO_DIRECTO (auto-asigna pasajero del pool a un
--     servicio en curso del conductor)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_AGREGAR_RESERVA_SERVICIO_DIRECTO(
    P_SERVICIO_ID   INTEGER,
    P_RESERVA_ID    INTEGER,
    P_CONDUCTOR_ID  INTEGER,
    P_AUTOR         INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE RESERVAS R
    SET CONDUCTOR_ID = P_CONDUCTOR_ID, SERVICIO_ID = P_SERVICIO_ID,
        ESTADO = 'EN_CURSO', MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE R.ID = P_RESERVA_ID
      AND R.ESTADO IN ('PENDIENTE', 'ACEPTADA')
      AND R.CONDUCTOR_ID IS NULL
      AND R.SERVICIO_ID IS NULL
      AND EXISTS (
          SELECT 1 FROM SERVICIO S
          WHERE S.ID = P_SERVICIO_ID
            AND S.ESTADO = 'EN_CURSO'
            AND S.CONDUCTOR_ID = P_CONDUCTOR_ID
      );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 15_PUNTOS_RECOGIDA.SQL
-- ============================================================================