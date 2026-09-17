-- ============================================================================
-- 13_ACEPTAR_RESERVA.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- La OPERADORA debe ACEPTAR la reserva antes de poder ASIGNAR un conductor.
-- Agrega el estado ACEPTADA y los SP correspondientes.
--
--   * Reescribe el CHECK de ESTADO incluyendo ACEPTADA.
--   * SP_ACEPTAR_RESERVA    -> PENDIENTE -> ACEPTADA.
--   * SP_DESPACHAR_RESERVA  -> ACEPTADA -> DESPACHADA (asignar conductor).
--   * SP_CAMBIAR_ESTADO_RESERVA -> cancelar (PENDIENTE/ACEPTADA/DESPACHADA).
--
-- ORDEN DE EJECUCION: despues de 12_SERVICIOS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

ALTER TABLE RESERVAS DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE RESERVAS ADD CONSTRAINT reservas_estado_check
    CHECK (ESTADO IN ('PENDIENTE', 'ACEPTADA', 'DESPACHADA',
                      'EN_CURSO', 'COMPLETADA', 'CANCELADA'));

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
-- FIN DE 13_ACEPTAR_RESERVA.SQL
-- ============================================================================