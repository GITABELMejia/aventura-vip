-- ============================================================================
-- 07_SP_EXTRA.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Procedimientos de soporte para mantener el 100% de las consultas a la
--   base de datos dentro de procedimientos almacenados (SP-Centric):
--
--     * SP_OBTENER_CATALOGOS      -> todos los catalogos en UN JSONB.
--     * SP_OBTENER_ROL_POR_NOMBRE -> id de un rol por su nombre.
--
-- ORDEN DE EJECUCION: despues de 03_SEEDS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SP: SP_OBTENER_CATALOGOS
-- ----------------------------------------------------------------------------
-- Devuelve roles, empresas, establecimientos, areas y permisos en un solo
-- objeto JSONB (una sola llamada desde la API). Alimenta los formularios
-- del frontend (cascadas Empresa -> Establecimiento -> Area).
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_CATALOGOS()
RETURNS JSONB AS $$
DECLARE
    V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'roles', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', ID, 'nombre', NOMBRE, 'descripcion', DESCRIPCION))
            FROM (SELECT ID, NOMBRE, DESCRIPCION FROM ROLES ORDER BY ID) t
        ), '[]'::jsonb),
        'empresas', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', ID, 'nombre', NOMBRE))
            FROM (SELECT ID, NOMBRE FROM EMPRESAS WHERE ESTADO = 'ACTIVO' ORDER BY NOMBRE) t
        ), '[]'::jsonb),
        'establecimientos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', ID, 'empresa_id', EMPRESA_ID, 'nombre', NOMBRE))
            FROM (SELECT ID, EMPRESA_ID, NOMBRE FROM ESTABLECIMIENTOS WHERE ESTADO = 'ACTIVO' ORDER BY NOMBRE) t
        ), '[]'::jsonb),
        'areas', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', ID, 'establecimiento_id', ESTABLECIMIENTO_ID, 'nombre', NOMBRE))
            FROM (SELECT ID, ESTABLECIMIENTO_ID, NOMBRE FROM AREAS WHERE ESTADO = 'ACTIVO' ORDER BY NOMBRE) t
        ), '[]'::jsonb),
        'permisos', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', ID, 'codigo', CODIGO, 'descripcion', DESCRIPCION))
            FROM (SELECT ID, CODIGO, DESCRIPCION FROM PERMISOS ORDER BY CODIGO) t
        ), '[]'::jsonb)
    ) INTO V_RESULTADO;

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_ROL_POR_NOMBRE
-- ----------------------------------------------------------------------------
-- Devuelve el ID de un rol segun su nombre (NULL si no existe).
-- Se usa para validar que la operadora solo cree/edite cuentas de clientes.
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_ROL_POR_NOMBRE(
    P_NOMBRE VARCHAR(30)
) RETURNS INTEGER AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    SELECT ID INTO V_ID FROM ROLES WHERE NOMBRE = P_NOMBRE;
    RETURN V_ID;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 07_SP_EXTRA.SQL
-- ============================================================================
