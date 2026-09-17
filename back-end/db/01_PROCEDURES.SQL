-- ============================================================================
-- 01_PROCEDURES.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Este script crea TODA la logica de negocio como FUNCIONES y
--   PROCEDIMIENTOS almacenados en PostgreSQL. La API de Node.js solo llama
--   a estas funciones (arquitectura "SP-centric").
--
--   Contenido:
--     * SP_REGISTRAR_USUARIO     -> crea un usuario nuevo (cifra la clave).
--     * SP_LOGIN                 -> valida credenciales (correo o DNI + clave).
--     * SP_VALIDAR_USUARIO       -> verifica que un usuario siga ACTIVO.
--     * SP_ASIGNAR_PERMISO       -> entrega un permiso a un usuario.
--
-- ORDEN DE EJECUCION:
--   Debe ejecutarse DESPUES de 00_SCHEMA.SQL y 02_AUDIT_TRIGGER.SQL.
--
-- NOTA IMPORTANTE SOBRE SEGURIDAD:
--   Las claves NUNCA se guardan en texto plano. Se cifran con la funcion
--   crypt() de pgcrypto usando el algoritmo bcrypt (blowfish) con factor 8.
--   La clave cifrada es la unica cosa que se almacena en USUARIOS.CLAVE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROCEDIMIENTO 1: SP_REGISTRAR_USUARIO
-- ----------------------------------------------------------------------------
-- Crea un usuario nuevo en la tabla USUARIOS.
--
-- PARAMETROS:
--   P_NOMBRES        : nombres de la persona (obligatorio).
--   P_APELLIDOS      : apellidos de la persona (obligatorio).
--   P_DNI            : documento de identidad (opcional, unico).
--   P_CORREO         : correo electronico (opcional, unico, se usa para login).
--   P_TELEFONO       : telefono (opcional).
--   P_CLAVE          : contrasena en texto plano; aqui se cifra (obligatorio).
--   P_ROL_ID         : id del rol (ADMIN/OPERADOR/CONDUCTOR/USUARIO).
--   P_EMPRESA_ID     : empresa a la que pertenece (NULL para particular).
--   P_AREA_ID        : area/hotel (opcional).
--   P_PUEDE_RESERVAR : si el usuario puede crear reservas.
--   P_CREADO_POR     : id del usuario que hace el registro (auditoria).
--
-- RETORNA: el ID del usuario recien creado (BIGINT).
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_REGISTRAR_USUARIO(
    P_NOMBRES        VARCHAR(80),
    P_APELLIDOS      VARCHAR(80),
    P_DNI            VARCHAR(8),
    P_CORREO         VARCHAR(120),
    P_TELEFONO       VARCHAR(20),
    P_CLAVE          VARCHAR(100),
    P_ROL_ID         INTEGER,
    P_EMPRESA_ID     INTEGER,
    P_AREA_ID        INTEGER,
    P_PUEDE_RESERVAR BOOLEAN,
    P_CREADO_POR     INTEGER
) RETURNS BIGINT AS $$
DECLARE
    V_NUEVO_ID BIGINT;
BEGIN
    -- Si no se indica el valor, el pasajero comun NO puede reservar.
    IF P_PUEDE_RESERVAR IS NULL THEN
        P_PUEDE_RESERVAR := FALSE;
    END IF;

    -- Se inserta el usuario. CLAVE se guarda cifrada con bcrypt.
    INSERT INTO USUARIOS (
        NOMBRES, APELLIDOS, DNI, CORREO, TELEFONO, CLAVE,
        ROL_ID, EMPRESA_ID, AREA_ID, PUEDE_RESERVAR,
        CREADO_POR, MODIFICADO_POR
    ) VALUES (
        P_NOMBRES, P_APELLIDOS, P_DNI, P_CORREO, P_TELEFONO,
        crypt(P_CLAVE, gen_salt('bf', 8)),
        P_ROL_ID, P_EMPRESA_ID, P_AREA_ID, P_PUEDE_RESERVAR,
        P_CREADO_POR, P_CREADO_POR
    )
    RETURNING ID INTO V_NUEVO_ID;

    RETURN V_NUEVO_ID;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCEDIMIENTO 2: SP_LOGIN
-- ----------------------------------------------------------------------------
-- Valida las credenciales de acceso. Es el CORAZON del login.
--
-- PARAMETROS:
--   P_CORREO_O_DNI : el usuario entra escribiendo su CORREO o su DNI.
--   P_CLAVE        : la contrasena en texto plano (se compara con la cifrada).
--
-- QUE HACE:
--   1) Busca al usuario por CORREO o por DNI con estado ACTIVO.
--   2) Si no existe, lanza el error 'CREDENCIALES_INVALIDAS' (la API lo
--      convierte en HTTP 401 No autorizado).
--   3) Compara la clave con la cifrada usando crypt(). Si no coincide,
--      lanza el mismo error (así no revelamos cuál dato estuvo mal).
--   4) Si todo es correcto, devuelve un JSON con los datos del usuario Y
--      su lista de permisos (para que la API los cargue en el token JWT).
--
-- RETORNA: un objeto JSONB con { id, nombres, apellidos, correo, dni,
--           telefono, rol, empresa, area, puede_reservar, permisos: [...] }.
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
    -- 1) Buscar al usuario (por correo o por DNI) y activo.
    SELECT
        U.ID,
        U.NOMBRES,
        U.APELLIDOS,
        U.DNI,
        U.CORREO,
        U.TELEFONO,
        U.CLAVE,
        U.ROL_ID,
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

    -- 2) Usuario inexistente o inactivo -> mismo error generico.
    IF V_USUARIO.ID IS NULL THEN
        RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
    END IF;

    -- 3) REGLA DE IDENTIFICADOR DE ACCESO:
    --    * Trabajadores (Aventura Vip, hoteles, o sin empresa) -> DNI.
    --    * Empresa "Particular" (app publica estilo Uber) -> correo.
    --    Si el identificador no corresponde al tipo de cuenta, se rechaza
    --    con el mismo error generico (sin revelar detalles).
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

    -- 4) Clave incorrecta -> mismo error generico (seguridad).
    IF V_USUARIO.CLAVE <> crypt(P_CLAVE, V_USUARIO.CLAVE) THEN
        RAISE EXCEPTION 'CREDENCIALES_INVALIDAS';
    END IF;

    -- 5) Obtener los permisos del usuario (si no tiene, arreglo vacio).
    SELECT COALESCE(
        jsonb_agg(P.CODIGO ORDER BY P.CODIGO),
        '[]'::jsonb
    ) INTO V_PERMISOS
    FROM PERMISOS P
    JOIN USUARIOS_PERMISOS UP ON UP.PERMISO_ID = P.ID
    WHERE UP.USUARIO_ID = V_USUARIO.ID;

    -- 6) Armar la respuesta JSON (jamas se devuelve la clave cifrada).
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
        'permisos',       V_PERMISOS
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCEDIMIENTO 3: SP_VALIDAR_USUARIO
-- ----------------------------------------------------------------------------
-- Verifica que un usuario (dado su ID) siga existiendo y este ACTIVO.
-- Se usa en el middleware de autenticacion de la API: cada vez que llega una
-- peticion con un token JWT, la API confirma aqui que el usuario no fue
-- bloqueado o borrado.
--
-- PARAMETROS:
--   P_ID : id del usuario a validar.
--
-- RETORNA: TRUE si el usuario existe y esta ACTIVO, FALSE en caso contrario.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_VALIDAR_USUARIO(
    P_ID INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    V_EXISTE BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM USUARIOS
        WHERE ID = P_ID
          AND ESTADO = 'ACTIVO'
    ) INTO V_EXISTE;

    RETURN V_EXISTE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROCEDIMIENTO 4: SP_ASIGNAR_PERMISO
-- ----------------------------------------------------------------------------
-- Asigna un permiso a un usuario. Si el permiso o el usuario no existen,
-- no hace nada (control de errores silencioso para no romper el login).
--
-- PARAMETROS:
--   P_USUARIO_ID : id del usuario que recibe el permiso.
--   P_CODIGO     : codigo del permiso (ej: 'GESTIONAR_USUARIOS').
--
-- RETORNA: TRUE si se asigno, FALSE si no se pudo (datos invalidos).
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_ASIGNAR_PERMISO(
    P_USUARIO_ID INTEGER,
    P_CODIGO     VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Solo inserta si existen BOTH el usuario y el permiso.
    INSERT INTO USUARIOS_PERMISOS (USUARIO_ID, PERMISO_ID)
    SELECT P_USUARIO_ID, P.ID
    FROM PERMISOS P
    WHERE P.CODIGO = P_CODIGO
      AND EXISTS (SELECT 1 FROM USUARIOS WHERE ID = P_USUARIO_ID);

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 01_PROCEDURES.SQL
-- ============================================================================
