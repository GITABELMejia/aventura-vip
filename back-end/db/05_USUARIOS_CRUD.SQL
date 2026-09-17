-- ============================================================================
-- 05_USUARIOS_CRUD.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Agrega las operaciones de CRUD del modulo de USUARIOS (gestion):
--     * SP_LISTAR_USUARIOS        -> listado con busqueda y filtros.
--     * SP_OBTENER_USUARIO        -> detalle de un usuario + permisos.
--     * SP_ACTUALIZAR_USUARIO     -> edita datos (la clave solo si se envia).
--     * SP_CAMBIAR_ESTADO_USUARIO -> activa/inactiva (bloqueo).
--     * SP_REEMPLAZAR_PERMISOS    -> sustituye los permisos de un usuario.
--     * SP_QUITAR_PERMISO         -> revoca un permiso puntual.
--
--   Tambien corrige la semantica de EMPRESAS: el personal de Aventura Vip
--   (ADMIN/OPERADOR/CONDUCTOR) pertenece a la empresa "Aventura Vip de Cusco"
--   (proveedor), no a Belmond (cliente).
--
-- ORDEN DE EJECUCION: despues de 03_SEEDS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) EMPRESA PROVEEDORA: "Aventura Vip de Cusco"
-- ----------------------------------------------------------------------------
INSERT INTO EMPRESAS (NOMBRE, RUC, DIRECCION) VALUES
    ('Aventura Vip de Cusco', '20601234567', 'Cusco, Peru')
ON CONFLICT (NOMBRE) DO NOTHING;

-- El personal de Aventura pasa a la empresa proveedora.
UPDATE USUARIOS
SET EMPRESA_ID = (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Aventura Vip de Cusco')
WHERE CORREO IN ('admin@aventura.com', 'operador@aventura.com', 'jorge@aventura.com');

-- ============================================================================
-- SP: SP_LISTAR_USUARIOS
-- ----------------------------------------------------------------------------
-- Devuelve la lista de usuarios con busqueda (nombre/apellidos/correo/DNI) y
-- filtros por rol y estado. Cada usuario incluye sus permisos.
-- PARAMETROS (todos opcionales): P_Q (texto), P_ROL (nombre), P_ESTADO.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_USUARIOS(
    P_Q      TEXT DEFAULT NULL,
    P_ROL    VARCHAR(30) DEFAULT NULL,
    P_ESTADO VARCHAR(20) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            U.ID,
            U.NOMBRES,
            U.APELLIDOS,
            U.DNI,
            U.CORREO,
            U.TELEFONO,
            R.NOMBRE       AS ROL,
            E.NOMBRE       AS EMPRESA,
            EST.NOMBRE     AS ESTABLECIMIENTO,
            A.NOMBRE       AS AREA,
            U.PUEDE_RESERVAR,
            U.ESTADO,
            COALESCE((
                SELECT jsonb_agg(P.CODIGO ORDER BY P.CODIGO)
                FROM PERMISOS P
                JOIN USUARIOS_PERMISOS UP ON UP.PERMISO_ID = P.ID
                WHERE UP.USUARIO_ID = U.ID
            ), '[]'::jsonb) AS PERMISOS
        FROM USUARIOS U
        JOIN ROLES R      ON R.ID = U.ROL_ID
        LEFT JOIN EMPRESAS E         ON E.ID = U.EMPRESA_ID
        LEFT JOIN AREAS A            ON A.ID = U.AREA_ID
        LEFT JOIN ESTABLECIMIENTOS EST ON EST.ID = A.ESTABLECIMIENTO_ID
        WHERE (P_Q IS NULL OR P_Q = ''
               OR U.NOMBRES ILIKE '%' || P_Q || '%'
               OR U.APELLIDOS ILIKE '%' || P_Q || '%'
               OR U.CORREO ILIKE '%' || P_Q || '%'
               OR U.DNI ILIKE '%' || P_Q || '%')
          AND (P_ROL IS NULL OR R.NOMBRE = P_ROL)
          AND (P_ESTADO IS NULL OR U.ESTADO = P_ESTADO)
        ORDER BY U.ID
    ) t;

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_USUARIO
-- ----------------------------------------------------------------------------
-- Detalle de un usuario (con rol, empresa, area y permisos). NULL si no existe.
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

-- ============================================================================
-- SP: SP_ACTUALIZAR_USUARIO
-- ----------------------------------------------------------------------------
-- Edita los datos de un usuario. La clave SOLO se cambia si P_CLAVE_NUEVA
-- no es NULL. Retorna TRUE si el usuario existia.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_ACTUALIZAR_USUARIO(
    P_ID              INTEGER,
    P_NOMBRES         VARCHAR(80),
    P_APELLIDOS       VARCHAR(80),
    P_DNI             VARCHAR(8),
    P_CORREO          VARCHAR(120),
    P_TELEFONO        VARCHAR(20),
    P_ROL_ID          INTEGER,
    P_EMPRESA_ID      INTEGER,
    P_AREA_ID         INTEGER,
    P_PUEDE_RESERVAR  BOOLEAN,
    P_CLAVE_NUEVA     VARCHAR(100),
    P_MODIFICADO_POR  INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM USUARIOS WHERE ID = P_ID) THEN
        RETURN FALSE;
    END IF;

    UPDATE USUARIOS SET
        NOMBRES        = P_NOMBRES,
        APELLIDOS      = P_APELLIDOS,
        DNI            = P_DNI,
        CORREO         = P_CORREO,
        TELEFONO       = P_TELEFONO,
        ROL_ID         = P_ROL_ID,
        EMPRESA_ID     = P_EMPRESA_ID,
        AREA_ID        = P_AREA_ID,
        PUEDE_RESERVAR = COALESCE(P_PUEDE_RESERVAR, FALSE),
        CLAVE          = CASE
                            WHEN P_CLAVE_NUEVA IS NOT NULL AND P_CLAVE_NUEVA <> ''
                            THEN crypt(P_CLAVE_NUEVA, gen_salt('bf', 8))
                            ELSE CLAVE
                         END,
        MODIFICADO_POR = P_MODIFICADO_POR
    WHERE ID = P_ID;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_CAMBIAR_ESTADO_USUARIO
-- ----------------------------------------------------------------------------
-- Activa o inactiva (bloquea) un usuario. Retorna TRUE si se proceso.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_USUARIO(
    P_ID             INTEGER,
    P_ESTADO         VARCHAR(20),
    P_MODIFICADO_POR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF P_ESTADO NOT IN ('ACTIVO', 'INACTIVO') THEN
        RETURN FALSE;
    END IF;

    UPDATE USUARIOS SET
        ESTADO         = P_ESTADO,
        MODIFICADO_POR = P_MODIFICADO_POR
    WHERE ID = P_ID;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_REEMPLAZAR_PERMISOS
-- ----------------------------------------------------------------------------
-- Sustituye TODOS los permisos de un usuario por la lista de codigos dada.
-- Se usa al guardar el formulario de edicion (checkboxes de permisos).
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_REEMPLAZAR_PERMISOS(
    P_USUARIO_ID INTEGER,
    P_CODIGOS    TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM USUARIOS WHERE ID = P_USUARIO_ID) THEN
        RETURN FALSE;
    END IF;

    -- 1) Quitar los permisos actuales.
    DELETE FROM USUARIOS_PERMISOS WHERE USUARIO_ID = P_USUARIO_ID;

    -- 2) Asignar solo los codigos que existen en el catalogo.
    INSERT INTO USUARIOS_PERMISOS (USUARIO_ID, PERMISO_ID)
    SELECT P_USUARIO_ID, P.ID
    FROM PERMISOS P
    WHERE P.CODIGO = ANY(P_CODIGOS)
      AND P_CODIGOS IS NOT NULL;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_QUITAR_PERMISO
-- ----------------------------------------------------------------------------
-- Revoca UN permiso de un usuario (gestion puntual).
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_QUITAR_PERMISO(
    P_USUARIO_ID INTEGER,
    P_PERMISO_ID INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM USUARIOS_PERMISOS
    WHERE USUARIO_ID = P_USUARIO_ID AND PERMISO_ID = P_PERMISO_ID;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 05_USUARIOS_CRUD.SQL
-- ============================================================================
