-- ============================================================================
-- 14_VINCULAR_PASAJERO.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- Permite vincular la reserva con un usuario pasajero (cliente), de modo que
-- el conductor pueda buscar pasajeros por nombre, correo o DNI.
--
--   * RESERVAS.PASAJERO_USUARIO_ID (nullable FK a USUARIOS).
--   * SP_CREAR_RESERVA            -> acepta el usuario vinculado (opcional).
--   * SP_LISTAR_RESERVAS_DISPONIBLES -> incluye dni/correo del pasajero.
--
-- ORDEN DE EJECUCION: despues de 13_ACEPTAR_RESERVA.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

ALTER TABLE RESERVAS ADD COLUMN IF NOT EXISTS PASAJERO_USUARIO_ID INTEGER
    REFERENCES USUARIOS(ID);

CREATE OR REPLACE FUNCTION SP_CREAR_RESERVA(
    P_USUARIO_ID        INTEGER,
    P_PASAJERO_NOMBRE   VARCHAR(80),
    P_PASAJERO_TELEFONO VARCHAR(20),
    P_FECHA_HORA        TIMESTAMPTZ,
    P_ORIGEN            VARCHAR(150),
    P_DESTINO           VARCHAR(150),
    P_NUM_PASAJEROS     INTEGER,
    P_NOTAS             VARCHAR(300),
    P_PASAJERO_USUARIO_ID INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    V_ID     INTEGER;
    V_CODIGO VARCHAR(6);
BEGIN
    V_CODIGO := LPAD((FLOOR(RANDOM() * 1000000))::INTEGER::TEXT, 6, '0');

    INSERT INTO RESERVAS (
        USUARIO_ID, PASAJERO_NOMBRE, PASAJERO_TELEFONO, FECHA_HORA,
        ORIGEN, DESTINO, NUM_PASAJEROS, NOTAS, ESTADO, CODIGO_SECRETO,
        PASAJERO_USUARIO_ID, CREADO_POR, MODIFICADO_POR
    ) VALUES (
        P_USUARIO_ID, P_PASAJERO_NOMBRE, P_PASAJERO_TELEFONO, P_FECHA_HORA,
        P_ORIGEN, P_DESTINO, P_NUM_PASAJEROS, P_NOTAS, 'PENDIENTE', V_CODIGO,
        P_PASAJERO_USUARIO_ID, P_USUARIO_ID, P_USUARIO_ID
    )
    RETURNING ID INTO V_ID;

    RETURN jsonb_build_object('id', V_ID, 'codigo_secreto', V_CODIGO);
END;
$$ LANGUAGE plpgsql;

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
            R.CODIGO_SECRETO,
            PU.DNI    AS PASAJERO_DNI,
            PU.CORREO AS PASAJERO_CORREO
        FROM RESERVAS R
        LEFT JOIN USUARIOS PU ON PU.ID = R.PASAJERO_USUARIO_ID
        WHERE R.CONDUCTOR_ID = P_CONDUCTOR_ID
          AND R.ESTADO = 'DESPACHADA'
          AND R.SERVICIO_ID IS NULL
        ORDER BY R.FECHA_HORA, R.ID
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 14_VINCULAR_PASAJERO.SQL
-- ============================================================================