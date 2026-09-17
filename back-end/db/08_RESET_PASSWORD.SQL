-- ============================================================================
-- 08_RESET_PASSWORD.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Procedimiento para que un administrador resetee la contraseña de un usuario
--   a la clave fija "AventuraCusco" (según requerimiento).
--
--   Requisitos:
--   * Solo usuarios con permiso GESTIONAR_USUARIOS pueden ejecutarlo
--   * La contraseña se fija a "AventuraCusco" (hasheada con bcrypt)
--   * Registra quién realizó el reset (auditoría)
--   * Valida que el usuario exista
--
-- ORDEN DE EJECUCION: despues de 07_SP_EXTRA.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SP: SP_RESET_CLAVE_USUARIO
-- ----------------------------------------------------------------------------
-- Resetea la contraseña de un usuario a "AventuraCusco" (hasheada con bcrypt).
-- Solo usuarios con permiso GESTIONAR_USUARIOS pueden ejecutarlo (validado en API).
--
-- PARAMETROS:
--   P_ID_USUARIO    INTEGER  -- ID del usuario cuya contraseña se resetea
--   P_MODIFICADO_POR INTEGER  -- ID del admin que ejecuta el reset (auditoría)
--
-- RETORNA: BOOLEAN (TRUE si se reseteó, FALSE si usuario no existe)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_RESET_CLAVE_USUARIO(
    P_ID_USUARIO     INTEGER,
    P_MODIFICADO_POR INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    V_EXISTE BOOLEAN;
BEGIN
    -- 1) Validar que el usuario existe
    SELECT EXISTS(SELECT 1 FROM USUARIOS WHERE ID = P_ID_USUARIO)
    INTO V_EXISTE;

    IF NOT V_EXISTE THEN
        RETURN FALSE;
    END IF;

    -- 2) Resetear la contraseña a "AventuraCusco" (hasheada con bcrypt)
    -- Usamos gen_salt('bf', 8) para bcrypt con costo 8 (igual que SP_REGISTRAR_USUARIO)
    UPDATE USUARIOS SET
        CLAVE = crypt('AventuraCusco', gen_salt('bf', 8)),
        MODIFICADO_POR = P_MODIFICADO_POR,
        MODIFICADO_AT = NOW()
    WHERE ID = P_ID_USUARIO;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 08_RESET_PASSWORD.SQL
-- ============================================================================