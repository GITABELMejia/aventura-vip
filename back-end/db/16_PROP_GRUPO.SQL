-- ============================================================================
-- 16_PROP_GRUPO.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- Alinea el catalogo de BELMOND al modelo "PROPIEDAD + GRUPO":
--   * PROPIEDAD = ESTABLECIMIENTO (hotel/tren/barco).
--   * GRUPO     = AREA del establecimiento (Cocina, A&B, SPA, Front Office,
--                 Housekeeping, Logistica, Mantenimiento, Finanzas, TI,
--                 Seguridad).
-- Se precargan los grupos estandar en Hotel Monasterio y Palacio Nazarenas.
-- Se mantienen Rio Sagrado y los registros de prueba. RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Renombra los grupos existentes al estandar (solo las 2 propiedades).
-- ----------------------------------------------------------------------------
UPDATE AREAS SET NOMBRE = 'Front Office'
WHERE NOMBRE = 'Recepcion'
  AND ESTABLECIMIENTO_ID IN (
      SELECT ID FROM ESTABLECIMIENTOS
      WHERE EMPRESA_ID = (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Belmond')
        AND NOMBRE IN ('Hotel Monasterio', 'Palacio Nazarenas')
  );

UPDATE AREAS SET NOMBRE = 'A&B'
WHERE NOMBRE = 'Alimentos y Bebidas'
  AND ESTABLECIMIENTO_ID IN (
      SELECT ID FROM ESTABLECIMIENTOS
      WHERE EMPRESA_ID = (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Belmond')
        AND NOMBRE IN ('Hotel Monasterio', 'Palacio Nazarenas')
  );

-- ----------------------------------------------------------------------------
-- 2) Pre-carga los grupos estandar en las 2 propiedades (no duplica).
-- ----------------------------------------------------------------------------
INSERT INTO AREAS (ESTABLECIMIENTO_ID, NOMBRE, DESCRIPCION)
SELECT EST.ID, G.NOMBRE, NULL
FROM ESTABLECIMIENTOS EST
CROSS JOIN (
    VALUES
        ('Cocina', NULL),
        ('A&B', NULL),
        ('SPA', NULL),
        ('Front Office', NULL),
        ('Housekeeping', NULL),
        ('Logistica', NULL),
        ('Mantenimiento', NULL),
        ('Finanzas', NULL),
        ('TI', NULL),
        ('Seguridad', NULL)
) AS G(NOMBRE, DESCRIPCION)
WHERE EST.EMPRESA_ID = (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Belmond')
  AND EST.NOMBRE IN ('Hotel Monasterio', 'Palacio Nazarenas')
ON CONFLICT (ESTABLECIMIENTO_ID, NOMBRE) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3) Usuarios demo de Belmond quedan asociados a PROPIEDAD + GRUPO.
-- ----------------------------------------------------------------------------
-- Juan Perez -> Hotel Monasterio / Front Office.
UPDATE USUARIOS
SET AREA_ID = (
    SELECT A.ID FROM AREAS A
    JOIN ESTABLECIMIENTOS E ON E.ID = A.ESTABLECIMIENTO_ID
    WHERE E.NOMBRE = 'Hotel Monasterio' AND A.NOMBRE = 'Front Office'
)
WHERE CORREO = 'juan.perez@belmond.com';

-- Maria Tupac -> Palacio Nazarenas / Cocina.
UPDATE USUARIOS
SET AREA_ID = (
    SELECT A.ID FROM AREAS A
    JOIN ESTABLECIMIENTOS E ON E.ID = A.ESTABLECIMIENTO_ID
    WHERE E.NOMBRE = 'Palacio Nazarenas' AND A.NOMBRE = 'Cocina'
)
WHERE CORREO = 'maria.tupac@belmond.com';

COMMIT;

-- ============================================================================
-- FIN DE 16_PROP_GRUPO.SQL
-- ============================================================================