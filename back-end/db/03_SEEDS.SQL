-- ============================================================================
-- 03_SEEDS.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Este script inserta los DATOS INICIALES necesarios para que el sistema
--   funcione de inmediato y para poder probar el login:
--
--     * Los 4 ROLES del sistema.
--     * Las EMPRESAS (Aventura Vip de Cusco, Belmond y Particular).
--     * Los ESTABLECIMIENTOS (hoteles de Belmond: Monasterio, Nazarenas, Rio Sagrado).
--     * Las AREAS de cada establecimiento (Recepcion, A&B, Cocina, Housekeeping).
--     * El CATALOGO DE PERMISOS (9 permisos iniciales).
--     * Las CUENTAS DE PRUEBA (creadas con SP_REGISTRAR_USUARIO).
--     * Los PERMISOS asignados a esas cuentas.
--
-- ORDEN DE EJECUCION:
--   DEBE ejecutarse al final: despues de 00_SCHEMA.SQL, 02_AUDIT_TRIGGER.SQL
--   y 01_PROCEDURES.SQL (porque usa procedimientos de 01).
--
-- ============================================================================
--
-- CUENTAS DE PRUEBA (todas con la clave: demo123)
-- ============================================================================
--   CORREO                    | DNI      | ROL        | Puede reservar
--   ---------------------------|----------|------------|----------------
--   admin@aventura.com         | 12345678 | ADMIN      | NO (gestiona)
--   operador@aventura.com      | 23456789 | OPERADOR   | NO (gestiona)
--   jorge@aventura.com         | 34567890 | CONDUCTOR  | NO (maneja)
--   juan.perez@belmond.com     | 45678901 | USUARIO    | SI (coordinador)
--   maria.tupac@belmond.com    | 56789012 | USUARIO    | NO (pasajera)
--
-- Para PROBAR el login con curl:
--   curl -X POST http://localhost:3000/api/auth/login \
--        -H "Content-Type: application/json" \
--        -d '{"correo_o_dni":"admin@aventura.com","clave":"demo123"}'
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) ROLES
-- ----------------------------------------------------------------------------
INSERT INTO ROLES (NOMBRE, DESCRIPCION) VALUES
    ('ADMIN',      'Control total del sistema'),
    ('OPERADOR',   'Gestiona reservas, cola y despacho'),
    ('CONDUCTOR',  'Maneja la flota y valida codigos de pasajeros'),
    ('USUARIO',    'Quien viaja (coordinador o pasajero)');

-- ----------------------------------------------------------------------------
-- 2) EMPRESAS
-- ----------------------------------------------------------------------------
--   * Aventura Vip de Cusco : el PROVEEDOR (personal ADMIN/OPERADOR/CONDUCTOR).
--   * Belmond               : el CLIENTE corporativo (usuarios que viajan).
--   * Particular            : cliente de la calle (modelo B2C).
-- ----------------------------------------------------------------------------
INSERT INTO EMPRESAS (NOMBRE, RUC, DIRECCION) VALUES
    ('Aventura Vip de Cusco', '20601234567', 'Cusco, Peru'),
    ('Belmond',      NULL, 'Cusco, Peru'),
    ('Particular',   NULL, 'Clientes de la calle (B2C)');

-- ----------------------------------------------------------------------------
-- 3) ESTABLECIMIENTOS (sedes de las empresas: hoteles, tiendas, restaurantes)
-- ----------------------------------------------------------------------------
-- Para que esto funcione, buscamos el ID de la empresa Belmond por su nombre.
INSERT INTO ESTABLECIMIENTOS (EMPRESA_ID, NOMBRE, DESCRIPCION)
SELECT E.ID, S.NOMBRE, S.DESCRIPCION
FROM EMPRESAS E,
     (VALUES
        ('Hotel Monasterio',     'Hotel Monasterio de Belmond'),
        ('Palacio Nazarenas',    'Palacio Nazarenas de Belmond'),
        ('Rio Sagrado',          'Rio Sagrado de Belmond')
     ) AS S(NOMBRE, DESCRIPCION)
WHERE E.NOMBRE = 'Belmond';

-- ----------------------------------------------------------------------------
-- 4) AREAS (sub-areas dentro de cada establecimiento)
-- ----------------------------------------------------------------------------
INSERT INTO AREAS (ESTABLECIMIENTO_ID, NOMBRE, DESCRIPCION)
SELECT EST.ID, A.NOMBRE, A.DESCRIPCION
FROM ESTABLECIMIENTOS EST,
     (VALUES
        ('Recepcion',                'Recepcion y lobby del establecimiento'),
        ('Alimentos y Bebidas',      'Restaurante, bar y servicio de comidas'),
        ('Cocina',                   'Cocina y preparacion de alimentos'),
        ('Housekeeping',             'Limpieza y mantenimiento de habitaciones')
     ) AS A(NOMBRE, DESCRIPCION)
WHERE EST.NOMBRE IN ('Hotel Monasterio', 'Palacio Nazarenas', 'Rio Sagrado');

-- ----------------------------------------------------------------------------
-- 5) CATALOGO DE PERMISOS
-- ----------------------------------------------------------------------------
INSERT INTO PERMISOS (CODIGO, DESCRIPCION) VALUES
    ('GESTIONAR_USUARIOS',     'Crear y editar usuarios'),
    ('CREAR_USUARIOS',         'Crear y editar cuentas de clientes (rol USUARIO)'),
    ('GESTIONAR_CATALOGOS',    'Gestionar empresas, establecimientos y areas'),
    ('VER_FINANZAS',           'Ver reportes financieros'),
    ('GESTIONAR_FLOTA',        'Gestionar la flota de vehiculos'),
    ('GESTIONAR_CONDUCTORES',  'Gestionar conductores'),
    ('CREAR_RESERVAS',         'Crear reservas de viajes'),
    ('DESPACHAR_COLA',         'Ordenar la cola de la noche'),
    ('VER_GPS',                'Ver ubicacion de los vehiculos en tiempo real');

-- ----------------------------------------------------------------------------
-- 5) CUENTAS DE PRUEBA (se crean con el procedimiento que cifra la clave)
-- ----------------------------------------------------------------------------
-- Usamos funciones de busqueda para no depender de IDs fijos.
-- El primer usuario (admin) se crea con CREADO_POR = NULL.
SELECT SP_REGISTRAR_USUARIO(
    'Admin', 'Sistema', '12345678', 'admin@aventura.com', '999999999',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'ADMIN'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Aventura Vip de Cusco'),
    NULL, FALSE, NULL
);

SELECT SP_REGISTRAR_USUARIO(
    'Operador', 'Sistema', '23456789', 'operador@aventura.com', '988888888',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'OPERADOR'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Aventura Vip de Cusco'),
    NULL, FALSE,
    (SELECT ID FROM USUARIOS WHERE CORREO = 'admin@aventura.com')
);

SELECT SP_REGISTRAR_USUARIO(
    'Jorge', 'Condori', '34567890', 'jorge@aventura.com', '977777777',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'CONDUCTOR'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Aventura Vip de Cusco'),
    NULL, FALSE,
    (SELECT ID FROM USUARIOS WHERE CORREO = 'admin@aventura.com')
);

SELECT SP_REGISTRAR_USUARIO(
    'Rosa', 'Mamani', '31555789', 'rosa@aventura.com', '944444444',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'CONDUCTOR'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Aventura Vip de Cusco'),
    NULL, FALSE,
    (SELECT ID FROM USUARIOS WHERE CORREO = 'admin@aventura.com')
);

SELECT SP_REGISTRAR_USUARIO(
    'Juan', 'Perez', '45678901', 'juan.perez@belmond.com', '966666666',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'USUARIO'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Belmond'),
    (SELECT ID FROM AREAS WHERE NOMBRE = 'Recepcion'
       AND ESTABLECIMIENTO_ID = (SELECT ID FROM ESTABLECIMIENTOS WHERE NOMBRE = 'Hotel Monasterio')),
    TRUE,  -- coordinador: SI puede reservar
    (SELECT ID FROM USUARIOS WHERE CORREO = 'admin@aventura.com')
);

SELECT SP_REGISTRAR_USUARIO(
    'Maria', 'Tupac', '56789012', 'maria.tupac@belmond.com', '955555555',
    'demo123',
    (SELECT ID FROM ROLES WHERE NOMBRE = 'USUARIO'),
    (SELECT ID FROM EMPRESAS WHERE NOMBRE = 'Belmond'),
    (SELECT ID FROM AREAS WHERE NOMBRE = 'Cocina'
       AND ESTABLECIMIENTO_ID = (SELECT ID FROM ESTABLECIMIENTOS WHERE NOMBRE = 'Palacio Nazarenas')),
    FALSE,  -- pasajera: NO reserva, solo viaja
    (SELECT ID FROM USUARIOS WHERE CORREO = 'admin@aventura.com')
);

-- ----------------------------------------------------------------------------
-- 6) PERMISOS ASIGNADOS A CADA CUENTA DE PRUEBA
-- ----------------------------------------------------------------------------
-- ADMIN -> control total: se le entregan los 9 permisos.
SELECT SP_ASIGNAR_PERMISO(U.ID, 'GESTIONAR_USUARIOS')    FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'CREAR_USUARIOS')        FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'GESTIONAR_CATALOGOS')   FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'VER_FINANZAS')          FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'GESTIONAR_FLOTA')       FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'GESTIONAR_CONDUCTORES') FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'CREAR_RESERVAS')        FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'DESPACHAR_COLA')        FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'VER_GPS')               FROM USUARIOS U WHERE U.CORREO = 'admin@aventura.com';

-- OPERADOR -> gestion operativa (incluye crear cuentas de clientes).
SELECT SP_ASIGNAR_PERMISO(U.ID, 'CREAR_RESERVAS') FROM USUARIOS U WHERE U.CORREO = 'operador@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'DESPACHAR_COLA') FROM USUARIOS U WHERE U.CORREO = 'operador@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'VER_GPS')        FROM USUARIOS U WHERE U.CORREO = 'operador@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'CREAR_USUARIOS') FROM USUARIOS U WHERE U.CORREO = 'operador@aventura.com';

-- CONDUCTOR -> maneja la flota (ve ubicacion de su viaje).
SELECT SP_ASIGNAR_PERMISO(U.ID, 'VER_GPS') FROM USUARIOS U WHERE U.CORREO = 'jorge@aventura.com';
SELECT SP_ASIGNAR_PERMISO(U.ID, 'VER_GPS') FROM USUARIOS U WHERE U.CORREO = 'rosa@aventura.com';

-- COORDINADOR (juan.perez@belmond.com) -> solo puede reservar.
SELECT SP_ASIGNAR_PERMISO(U.ID, 'CREAR_RESERVAS') FROM USUARIOS U WHERE U.CORREO = 'juan.perez@belmond.com';

COMMIT;

-- ============================================================================
-- FIN DE 03_SEEDS.SQL
-- ============================================================================
