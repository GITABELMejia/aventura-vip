-- ============================================================================
-- 10_FOTO_PERFIL.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Foto de perfil de los usuarios, almacenada en base64 (como los documentos).
--
--   * Se agregan las columnas FOTO_B64 y FOTO_MIME a USUARIOS.
--   * SP_ACTUALIZAR_FOTO_PERFIL  -> guarda/reemplaza la foto.
--   * SP_QUITAR_FOTO_PERFIL      -> elimina la foto (pone NULL).
--   * SP_LOGIN y SP_OBTENER_USUARIO se re-crean para incluir la foto en su JSON.
--
-- ORDEN DE EJECUCION: despues de 09_DOCUMENTOS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- COLUMNAS: FOTO_B64 (TEXT) + FOTO_MIME (VARCHAR)
-- ----------------------------------------------------------------------------
ALTER TABLE USUARIOS
    ADD COLUMN IF NOT EXISTS FOTO_B64  TEXT,
    ADD COLUMN IF NOT EXISTS FOTO_MIME VARCHAR(50);

-- ============================================================================
-- SP: SP_ACTUALIZAR_FOTO_PERFIL
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_ACTUALIZAR_FOTO_PERFIL(
    P_ID           INTEGER,
    P_FOTO_B64     TEXT,
    P_MIME         VARCHAR(50),
    P_MODIFICADO_POR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE USUARIOS
    SET FOTO_B64       = P_FOTO_B64,
        FOTO_MIME      = P_MIME,
        MODIFICADO_AT  = NOW(),
        MODIFICADO_POR = P_MODIFICADO_POR
    WHERE ID = P_ID;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_QUITAR_FOTO_PERFIL
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_QUITAR_FOTO_PERFIL(
    P_ID             INTEGER,
    P_MODIFICADO_POR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE USUARIOS
    SET FOTO_B64       = NULL,
        FOTO_MIME      = NULL,
        MODIFICADO_AT  = NOW(),
        MODIFICADO_POR = P_MODIFICADO_POR
    WHERE ID = P_ID;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP_LOGIN (re-creado para incluir la foto de perfil)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LOGIN(
    P_CORREO_O_DNI TEXT,
    P_CLAVE        TEXT
) RETURNS JSONB AS $$
DECLARE
    V_USUARIO RECORD;
    V_PERMISOS JSONB;
    V_ES_PUBLICO BOOLEAN;
BEGIN
    SELECT
        U.ID,
        U.NOMBRES,
        U.APELLIDOS,
        U.DNI,
        U.CORREO,
        U.TELEFONO,
        U.CLAVE,
        U.ROL_ID,
        U.FOTO_B64,
        U.FOTO_MIME,
        R.NOMBRE  AS ROL_NOMBRE,
        E.NOMBRE  AS EMPRESA_NOMBRE,
        EST.NOMBRE AS ESTABLECIMIENTO_NOMBRE,
        A.NOMBRE  AS AREA_NOMBRE,
        U.PUEDE_RESERVAR,
        U.EMPRESA_ID,
        U.AREA_ID
    INTO V_USUARIO
    FROM USUARIOS U
    JOIN ROLES R    ON R.ID = U.ROL_ID
    LEFT JOIN EMPRESAS E         ON E.ID = U.EMPRESA_ID
    LEFT JOIN AREAS A            ON A.ID = U.AREA_ID
    LEFT JOIN ESTABLECIMIENTOS EST ON EST.ID = A.ESTABLECIMIENTO_ID
    WHERE (U.CORREO = P_CORREO_O_DNI OR U.DNI = P_CORREO_O_DNI)
      AND U.ESTADO = 'ACTIVO';

    IF V_USUARIO.ID IS NULL THEN
        RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
    END IF;

    V_ES_PUBLICO := (V_USUARIO.EMPRESA_NOMBRE = 'Particular');

    IF V_ES_PUBLICO THEN
        IF V_USUARIO.CORREO IS DISTINCT FROM P_CORREO_O_DNI THEN
            RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
        END IF;
    ELSE
        IF V_USUARIO.DNI IS DISTINCT FROM P_CORREO_O_DNI THEN
            RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
        END IF;
    END IF;

    IF V_USUARIO.CLAVE <> crypt(P_CLAVE, V_USUARIO.CLAVE) THEN
        RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
    END IF;

    SELECT COALESCE(
        jsonb_agg(P.CODIGO ORDER BY P.CODIGO),
        '[]'::jsonb
    ) INTO V_PERMISOS
    FROM PERMISOS P
    JOIN USUARIOS_PERMISOS UP ON UP.PERMISO_ID = P.ID
    WHERE UP.USUARIO_ID = V_USUARIO.ID;

    RETURN jsonb_build_object(
        'id',             V_USUARIO.ID,
        'nombres',        V_USUARIO.NOMBRES,
        'apellidos',      V_USUARIO.APELLIDOS,
        'correo',         V_USUARIO.CORREO,
        'dni',            V_USUARIO.DNI,
        'telefono',       V_USUARIO.TELEFONO,
        'rol',            V_USUARIO.ROL_NOMBRE,
        'empresa',        V_USUARIO.EMPRESA_NOMBRE,
        'establecimiento',V_USUARIO.ESTABLECIMIENTO_NOMBRE,
        'area',           V_USUARIO.AREA_NOMBRE,
        'empresa_id',     V_USUARIO.EMPRESA_ID,
        'area_id',        V_USUARIO.AREA_ID,
        'puede_reservar', V_USUARIO.PUEDE_RESERVAR,
        'foto_b64',       V_USUARIO.FOTO_B64,
        'foto_mime',      V_USUARIO.FOTO_MIME,
        'permisos',       V_PERMISOS
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP_OBTENER_USUARIO (re-creado para incluir la foto de perfil)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_USUARIO(
    P_ID INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',              U.ID,
        'nombres',         U.NOMBRES,
        'apellidos',       U.APELLIDOS,
        'dni',             U.DNI,
        'correo',          U.CORREO,
        'telefono',        U.TELEFONO,
        'rol_id',          U.ROL_ID,
        'rol',             R.NOMBRE,
        'empresa_id',      U.EMPRESA_ID,
        'empresa',         E.NOMBRE,
        'establecimiento_id', EST.ID,
        'establecimiento', EST.NOMBRE,
        'area_id',         U.AREA_ID,
        'area',            A.NOMBRE,
        'puede_reservar',  U.PUEDE_RESERVAR,
        'foto_b64',        U.FOTO_B64,
        'foto_mime',       U.FOTO_MIME,
        'estado',          U.ESTADO,
        'permisos', COALESCE((
            SELECT jsonb_agg(P.CODIGO ORDER BY P.CODIGO)
            FROM PERMISOS P
            JOIN USUARIOS_PERMISOS UP ON UP.PERMISO_ID = P.ID
            WHERE UP.USUARIO_ID = U.ID
        ), '[]'::jsonb)
    ) INTO V_RESULTADO
    FROM USUARIOS U
    JOIN ROLES R      ON R.ID = U.ROL_ID
    LEFT JOIN EMPRESAS E         ON E.ID = U.EMPRESA_ID
    LEFT JOIN AREAS A            ON A.ID = U.AREA_ID
    LEFT JOIN ESTABLECIMIENTOS EST ON EST.ID = A.ESTABLECIMIENTO_ID
    WHERE U.ID = P_ID;

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 10_FOTO_PERFIL.SQL
-- ============================================================================