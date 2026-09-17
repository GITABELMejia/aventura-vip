-- ============================================================================
-- 11_RESERVAS.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Modulo de RESERVAS (viajes). La OPERADORA recibe la llamada del cliente
--   y crea la reserva; luego la DESPACHA (asigna un conductor).
--
--   * SP_CREAR_RESERVA        -> crea (genera CODIGO_SECRETO de 6 digitos).
--   * SP_LISTAR_RESERVAS      -> listado (filtro estado/busqueda; propias/todas).
--   * SP_OBTENER_RESERVA      -> detalle.
--   * SP_DESPACHAR_RESERVA    -> asigna conductor (PENDIENTE -> DESPACHADA).
--   * SP_CAMBIAR_ESTADO_RESERVA -> EN_CURSO / COMPLETADA / CANCELADA.
--
-- ORDEN DE EJECUCION: despues de 10_FOTO_PERFIL.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- Reconstruccion limpia si se re-aplica.
DROP TABLE IF EXISTS RESERVAS CASCADE;

-- ============================================================================
-- TABLA: RESERVAS
-- ============================================================================
CREATE TABLE RESERVAS (
    ID                SERIAL        PRIMARY KEY,
    USUARIO_ID        INTEGER       NOT NULL REFERENCES USUARIOS(ID),
    PASAJERO_NOMBRE   VARCHAR(80)   NOT NULL,
    PASAJERO_TELEFONO VARCHAR(20),
    FECHA_HORA        TIMESTAMPTZ   NOT NULL,
    ORIGEN            VARCHAR(150)  NOT NULL,
    DESTINO           VARCHAR(150)  NOT NULL,
    NUM_PASAJEROS     INTEGER       NOT NULL DEFAULT 1
                      CHECK (NUM_PASAJEROS > 0),
    NOTAS             VARCHAR(300),
    ESTADO            VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (ESTADO IN ('PENDIENTE', 'ACEPTADA', 'DESPACHADA',
                                        'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    CONDUCTOR_ID      INTEGER       REFERENCES USUARIOS(ID),
    CODIGO_SECRETO    VARCHAR(6),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- FK de auditoria.
ALTER TABLE RESERVAS ADD CONSTRAINT FK_RESERVAS_CREADO
    FOREIGN KEY (CREADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE RESERVAS ADD CONSTRAINT FK_RESERVAS_MODIF
    FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

CREATE TRIGGER TRG_RESERVAS_MODIFICADO
BEFORE UPDATE ON RESERVAS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

CREATE INDEX IDX_RESERVAS_ESTADO     ON RESERVAS (ESTADO);
CREATE INDEX IDX_RESERVAS_USUARIO    ON RESERVAS (USUARIO_ID);
CREATE INDEX IDX_RESERVAS_CONDUCTOR  ON RESERVAS (CONDUCTOR_ID);
CREATE INDEX IDX_RESERVAS_FECHA      ON RESERVAS (FECHA_HORA);

-- ============================================================================
-- SP: SP_CREAR_RESERVA
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_CREAR_RESERVA(
    P_USUARIO_ID        INTEGER,
    P_PASAJERO_NOMBRE   VARCHAR(80),
    P_PASAJERO_TELEFONO VARCHAR(20),
    P_FECHA_HORA        TIMESTAMPTZ,
    P_ORIGEN            VARCHAR(150),
    P_DESTINO           VARCHAR(150),
    P_NUM_PASAJEROS     INTEGER,
    P_NOTAS             VARCHAR(300)
) RETURNS JSONB AS $$
DECLARE
    V_ID     INTEGER;
    V_CODIGO VARCHAR(6);
BEGIN
    -- Codigo secreto de 6 digitos para validar al pasajero.
    V_CODIGO := LPAD((FLOOR(RANDOM() * 1000000))::INTEGER::TEXT, 6, '0');

    INSERT INTO RESERVAS (
        USUARIO_ID, PASAJERO_NOMBRE, PASAJERO_TELEFONO, FECHA_HORA,
        ORIGEN, DESTINO, NUM_PASAJEROS, NOTAS, ESTADO, CODIGO_SECRETO,
        CREADO_POR, MODIFICADO_POR
    ) VALUES (
        P_USUARIO_ID, P_PASAJERO_NOMBRE, P_PASAJERO_TELEFONO, P_FECHA_HORA,
        P_ORIGEN, P_DESTINO, P_NUM_PASAJEROS, P_NOTAS, 'PENDIENTE', V_CODIGO,
        P_USUARIO_ID, P_USUARIO_ID
    )
    RETURNING ID INTO V_ID;

    RETURN jsonb_build_object('id', V_ID, 'codigo_secreto', V_CODIGO);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_RESERVAS
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_RESERVAS(
    P_USUARIO_ID   INTEGER,
    P_SOLO_PROPIAS BOOLEAN,
    P_ESTADO       VARCHAR(20) DEFAULT NULL,
    P_Q            TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            R.ID,
            R.USUARIO_ID,
            C.NOMBRES || ' ' || C.APELLIDOS          AS CREADOR,
            R.PASAJERO_NOMBRE,
            R.PASAJERO_TELEFONO,
            R.FECHA_HORA,
            R.ORIGEN,
            R.DESTINO,
            R.NUM_PASAJEROS,
            R.NOTAS,
            R.ESTADO,
            R.CONDUCTOR_ID,
            D.NOMBRES || ' ' || D.APELLIDOS          AS CONDUCTOR,
            R.CODIGO_SECRETO,
            R.CREADO_AT
        FROM RESERVAS R
        JOIN USUARIOS C ON C.ID = R.USUARIO_ID
        LEFT JOIN USUARIOS D ON D.ID = R.CONDUCTOR_ID
        WHERE (P_SOLO_PROPIAS = FALSE OR R.USUARIO_ID = P_USUARIO_ID)
          AND (P_ESTADO IS NULL OR R.ESTADO = P_ESTADO)
          AND (P_Q IS NULL OR P_Q = ''
               OR R.PASAJERO_NOMBRE ILIKE '%' || P_Q || '%'
               OR R.PASAJERO_TELEFONO ILIKE '%' || P_Q || '%'
               OR R.ORIGEN ILIKE '%' || P_Q || '%'
               OR R.DESTINO ILIKE '%' || P_Q || '%')
        ORDER BY R.FECHA_HORA, R.ID
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_RESERVA
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_RESERVA(
    P_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',               R.ID,
        'usuario_id',       R.USUARIO_ID,
        'creador',          C.NOMBRES || ' ' || C.APELLIDOS,
        'pasajero_nombre',  R.PASAJERO_NOMBRE,
        'pasajero_telefono',R.PASAJERO_TELEFONO,
        'fecha_hora',       R.FECHA_HORA,
        'origen',           R.ORIGEN,
        'destino',          R.DESTINO,
        'num_pasajeros',    R.NUM_PASAJEROS,
        'notas',            R.NOTAS,
        'estado',           R.ESTADO,
        'conductor_id',     R.CONDUCTOR_ID,
        'conductor',        D.NOMBRES || ' ' || D.APELLIDOS,
        'codigo_secreto',   R.CODIGO_SECRETO,
        'creado_at',        R.CREADO_AT
    ) INTO V_RESULTADO
    FROM RESERVAS R
    JOIN USUARIOS C ON C.ID = R.USUARIO_ID
    LEFT JOIN USUARIOS D ON D.ID = R.CONDUCTOR_ID
    WHERE R.ID = P_ID;

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_ACEPTAR_RESERVA
-- ----------------------------------------------------------------------------
-- La operadora aprueba la reserva (PENDIENTE -> ACEPTADA), antes de poder
-- asignar un conductor.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_ACEPTAR_RESERVA(
    P_ID    INTEGER,
    P_AUTOR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE RESERVAS
    SET ESTADO = 'ACEPTADA', MODIFICADO_AT = NOW(), MODIFICADO_POR = P_AUTOR
    WHERE ID = P_ID AND ESTADO = 'PENDIENTE';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_DESPACHAR_RESERVA
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_DESPACHAR_RESERVA(
    P_ID           INTEGER,
    P_CONDUCTOR_ID INTEGER,
    P_AUTOR        INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE RESERVAS
    SET ESTADO           = 'DESPACHADA',
        CONDUCTOR_ID     = P_CONDUCTOR_ID,
        MODIFICADO_AT    = NOW(),
        MODIFICADO_POR   = P_AUTOR
    WHERE ID = P_ID
      AND ESTADO = 'ACEPTADA'
      AND EXISTS (
          SELECT 1 FROM USUARIOS U
          JOIN ROLES R ON R.ID = U.ROL_ID
          WHERE U.ID = P_CONDUCTOR_ID AND R.NOMBRE = 'CONDUCTOR'
      );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_CAMBIAR_ESTADO_RESERVA
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_RESERVA(
    P_ID     INTEGER,
    P_ESTADO VARCHAR(20),
    P_AUTOR  INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE RESERVAS
    SET ESTADO         = P_ESTADO,
        MODIFICADO_AT  = NOW(),
        MODIFICADO_POR = P_AUTOR
    WHERE ID = P_ID
      AND P_ESTADO IN ('EN_CURSO', 'COMPLETADA', 'CANCELADA');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 11_RESERVAS.SQL
-- ============================================================================