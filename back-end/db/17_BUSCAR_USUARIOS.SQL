-- ============================================================================
-- 17_BUSCAR_USUARIOS.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- Busqueda de usuarios para el formulario de reservas: cualquier usuario con
-- sesion puede buscar a quien sera el pasajero (por nombre, correo o DNI).
-- No exige permisos de gestion de usuarios (GESTIONAR/CREAR_USUARIOS).
-- RE-EJECUTABLE.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION SP_BUSCAR_USUARIOS(
    P_Q TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            U.ID, U.NOMBRES, U.APELLIDOS, U.DNI, U.CORREO, U.TELEFONO,
            R.NOMBRE     AS ROL,
            E.NOMBRE     AS EMPRESA,
            EST.NOMBRE   AS ESTABLECIMIENTO,
            A.NOMBRE     AS AREA
        FROM USUARIOS U
        JOIN ROLES R      ON R.ID = U.ROL_ID
        LEFT JOIN EMPRESAS E         ON E.ID = U.EMPRESA_ID
        LEFT JOIN AREAS A            ON A.ID = U.AREA_ID
        LEFT JOIN ESTABLECIMIENTOS EST ON EST.ID = A.ESTABLECIMIENTO_ID
        WHERE U.ESTADO = 'ACTIVO'
          AND (P_Q = ''
               OR U.NOMBRES ILIKE '%' || P_Q || '%'
               OR U.APELLIDOS ILIKE '%' || P_Q || '%'
               OR U.CORREO ILIKE '%' || P_Q || '%'
               OR U.DNI ILIKE '%' || P_Q || '%')
        ORDER BY U.NOMBRES, U.APELLIDOS
        LIMIT 20
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 17_BUSCAR_USUARIOS.SQL
-- ============================================================================