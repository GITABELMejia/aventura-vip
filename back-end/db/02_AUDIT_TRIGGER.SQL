-- ============================================================================
-- 02_AUDIT_TRIGGER.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Este script crea la funcion SP_ACTUALIZAR_MODIFICADO_AT y los TRIGGERS
--   que la ejecutan. Su trabajo es sencillo y automatico:
--
--       "Cada vez que una fila se MODIFICA (UPDATE), se actualiza sola la
--        columna MODIFICADO_AT con la fecha y hora del momento."
--
--   Asi la API no necesita preocuparse por esa fecha: el trigger la setea.
--
-- ORDEN DE EJECUCION:
--   Debe ejecutarse DESPUES de 00_SCHEMA.SQL (porque necesita las tablas)
--   y ANTES de 03_SEEDS.SQL (para que los seeds tambien queden auditados).
--
-- NOTA:
--   Si el dia de mañana se crea una tabla nueva, hay que agregar su trigger
--   aqui con el mismo patron:
--
--     CREATE TRIGGER TRG_<TABLA>_MODIFICADO
--     BEFORE UPDATE ON <TABLA>
--     FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- FUNCION: SP_ACTUALIZAR_MODIFICADO_AT
-- ----------------------------------------------------------------------------
-- Se ejecuta automaticamente en cada UPDATE (evento BEFORE UPDATE).
-- Pisa la columna MODIFICADO_AT con la fecha actual del servidor.
-- Devuelve NEW (la fila ya modificada) para que PostgreSQL continue.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT()
RETURNS TRIGGER AS $$
BEGIN
    NEW.MODIFICADO_AT := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGERS por tabla (BEFORE UPDATE => se dispara antes de guardar el cambio)
-- ----------------------------------------------------------------------------
CREATE TRIGGER TRG_ROLES_MODIFICADO
BEFORE UPDATE ON ROLES
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

CREATE TRIGGER TRG_EMPRESAS_MODIFICADO
BEFORE UPDATE ON EMPRESAS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

CREATE TRIGGER TRG_AREAS_MODIFICADO
BEFORE UPDATE ON AREAS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

CREATE TRIGGER TRG_USUARIOS_MODIFICADO
BEFORE UPDATE ON USUARIOS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

CREATE TRIGGER TRG_PERMISOS_MODIFICADO
BEFORE UPDATE ON PERMISOS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

COMMIT;

-- ============================================================================
-- FIN DE 02_AUDIT_TRIGGER.SQL
-- ============================================================================
