-- ============================================================================
-- 00_SCHEMA.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Este script crea el ESQUEMA (las tablas base) de la base de datos
--   "aventura_vip". No contiene datos de ejemplo (eso lo hace 03_SEEDS.SQL).
--
-- ORDEN DE EJECUCION DE LOS SCRIPTS (IMPORTANTE, respetar este orden):
--   1) 00_SCHEMA.SQL          -> crea las tablas
--   2) 02_AUDIT_TRIGGER.SQL   -> crea los triggers de auditoria (usa tablas)
--   3) 01_PROCEDURES.SQL      -> crea los procedimientos (usa tablas y triggers)
--   4) 03_SEEDS.SQL           -> inserta los datos iniciales de ejemplo
--
-- CONVENCIONES USADAS EN TODO EL PROYECTO:
--   * Los nombres de objetos se escriben en MAYUSCULAS.
--   * No se usan comillas dobles: PostgreSQL guarda los nombres en
--     minusculas y los hace insensibles a mayusculas/minusculas al usarlos.
--   * Toda tabla lleva CAMPOS DE AUDITORIA:
--       - CREADO_AT      : fecha/hora de creacion (automatico).
--       - CREADO_POR     : ID del usuario que creo el registro.
--       - MODIFICADO_AT  : fecha/hora de la ultima modificacion.
--       - MODIFICADO_POR : ID del usuario que hizo la ultima modificacion.
--     Los campos CREADO_AT y MODIFICADO_AT se llenan solos (DEFAULT + trigger).
--     Los campos ..._POR se rellenan desde la API (la consulta los setea).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- EXTENSION: pgcrypto
-- ----------------------------------------------------------------------------
-- Permite cifrar contrasenas con la funcion crypt() y el algoritmo bcrypt.
-- Es necesaria para los procedimientos SP_REGISTRAR_USUARIO y SP_LOGIN.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLA 1: ROLES
-- ----------------------------------------------------------------------------
-- Almacena los roles del sistema. Un rol define "que tipo de usuario es".
-- Los 4 roles iniciales son: ADMIN, OPERADOR, CONDUCTOR y USUARIO.
--   * ADMIN     : control total del sistema.
--   * OPERADOR  : gestiona reservas, cola y despacho.
--   * CONDUCTOR : maneja la flota y valida el codigo secreto del pasajero.
--   * USUARIO   : quien viaja (reservante o pasajero).
-- ============================================================================
CREATE TABLE ROLES (
    ID           SERIAL      PRIMARY KEY,
    NOMBRE       VARCHAR(30) NOT NULL UNIQUE,
    DESCRIPCION  VARCHAR(150),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 2: EMPRESAS
-- ----------------------------------------------------------------------------
-- Empresas / organizaciones que usan el servicio.
--   * Belmond (agrupa los hoteles Monastery y Nazarenas).
--   * Particular: "empresa" ficticia para clientes de la calle (modelo B2C).
-- ============================================================================
CREATE TABLE EMPRESAS (
    ID          SERIAL        PRIMARY KEY,
    NOMBRE      VARCHAR(100)  NOT NULL UNIQUE,
    RUC         VARCHAR(11),
    TELEFONO    VARCHAR(20),
    DIRECCION   VARCHAR(200),
    ESTADO      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVO'
                CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 3: ESTABLECIMIENTOS
-- ----------------------------------------------------------------------------
-- Establecimientos / sedes dentro de una empresa (hoteles, restaurantes,
-- tiendas, etc.). Por ejemplo, Belmond tiene el Hotel Monasterio, el Palacio
-- Nazarenas y el Rio Sagrado. El modelo es extensible: cualquier empresa
-- puede tener sus propios establecimientos.
-- ============================================================================
CREATE TABLE ESTABLECIMIENTOS (
    ID               SERIAL       PRIMARY KEY,
    EMPRESA_ID       INTEGER      NOT NULL REFERENCES EMPRESAS(ID),
    NOMBRE           VARCHAR(100) NOT NULL,
    DESCRIPCION      VARCHAR(200),
    ESTADO           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
                     CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),
    -- Un establecimiento no debe repetirse dentro de la misma empresa.
    UNIQUE (EMPRESA_ID, NOMBRE),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 4: AREAS
-- ----------------------------------------------------------------------------
-- Sub-areas dentro de un establecimiento (recepcion, alimentos y bebidas,
-- cocina, housekeeping, etc.). AREA_ESTABLECIMIENTO_ID apunta al
-- establecimiento al que pertenece el area.
-- ============================================================================
CREATE TABLE AREAS (
    ID               SERIAL       PRIMARY KEY,
    ESTABLECIMIENTO_ID INTEGER    NOT NULL REFERENCES ESTABLECIMIENTOS(ID),
    NOMBRE           VARCHAR(100) NOT NULL,
    DESCRIPCION      VARCHAR(200),
    ESTADO           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
                     CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),
    -- Un area no debe repetirse dentro del mismo establecimiento.
    UNIQUE (ESTABLECIMIENTO_ID, NOMBRE),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 5: USUARIOS
-- ----------------------------------------------------------------------------
-- TODAS las personas del sistema viven aqui (empleados, conductores, clientes).
--   * CLAVE          : contrasena cifrada con bcrypt (nunca en texto plano).
--   * ROL_ID         : que rol tiene la persona (ADMIN/OPERADOR/CONDUCTOR/USUARIO).
--   * EMPRESA_ID     : a que empresa pertenece (NULL si es cliente particular).
--   * AREA_ID        : a que area del establecimiento pertenece (opcional).
--   * PUEDE_RESERVAR : si el usuario puede crear reservas (coordinador).
--   * CODIGO_SECRETO : codigo de 6 digitos que el pasajero muestra al conductor.
--   * ESTADO         : ACTIVO (puede entrar) / INACTIVO (bloqueado).
-- ============================================================================
CREATE TABLE USUARIOS (
    ID              SERIAL       PRIMARY KEY,
    NOMBRES         VARCHAR(80)  NOT NULL,
    APELLIDOS       VARCHAR(80)  NOT NULL,
    DNI             VARCHAR(8)   UNIQUE,
    CORREO          VARCHAR(120) UNIQUE,
    TELEFONO        VARCHAR(20),
    CLAVE           VARCHAR(100) NOT NULL,
    ROL_ID          INTEGER      NOT NULL REFERENCES ROLES(ID),
    EMPRESA_ID      INTEGER      REFERENCES EMPRESAS(ID),
    AREA_ID         INTEGER      REFERENCES AREAS(ID),
    PUEDE_RESERVAR  BOOLEAN      NOT NULL DEFAULT FALSE,
    CODIGO_SECRETO  VARCHAR(6),
    ESTADO          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
                    CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 6: PERMISOS
-- ----------------------------------------------------------------------------
-- Catalogo de permisos del sistema (control de acceso por permiso - PBAC).
-- En lugar de fijar permisos por rol, se asignan permisos POR USUARIO.
-- Permite que existan administradores "parciales".
-- Los permisos iniciales son:
--   * GESTIONAR_USUARIOS   -> crear/editar usuarios.
--   * CREAR_USUARIOS       -> crear/editar cuentas de clientes (operadora).
--   * GESTIONAR_CATALOGOS  -> gestionar empresas, establecimientos y areas.
--   * VER_FINANZAS         -> ver reportes financieros.
--   * GESTIONAR_FLOTA      -> gestionar vehiculos.
--   * GESTIONAR_CONDUCTORES-> gestionar conductores.
--   * CREAR_RESERVAS       -> crear reservas (viaje).
--   * DESPACHAR_COLA       -> ordenar la cola de la noche.
--   * VER_GPS              -> ver ubicacion de vehiculos en tiempo real.
-- El sistema es escalable: se agregan filas nuevas aqui sin tocar el codigo.
-- ============================================================================
CREATE TABLE PERMISOS (
    ID           SERIAL      PRIMARY KEY,
    CODIGO       VARCHAR(50) NOT NULL UNIQUE,
    DESCRIPCION  VARCHAR(200),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- ============================================================================
-- TABLA 7: USUARIOS_PERMISOS
-- ----------------------------------------------------------------------------
-- Tabla intermedia (N:M) que asigna permisos a un usuario.
-- Un usuario puede tener muchos permisos y un permiso a muchos usuarios.
-- ============================================================================
CREATE TABLE USUARIOS_PERMISOS (
    USUARIO_ID  INTEGER NOT NULL REFERENCES USUARIOS(ID),
    PERMISO_ID  INTEGER NOT NULL REFERENCES PERMISOS(ID),
    ASIGNADO_AT TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Clave primaria compuesta: un mismo permiso no se asigna 2 veces al usuario.
    PRIMARY KEY (USUARIO_ID, PERMISO_ID)
);

-- ============================================================================
-- FK DE AUDITORIA
-- ----------------------------------------------------------------------------
-- Los campos CREADO_POR / MODIFICADO_POR referencian USUARIOS(ID), pero como
-- la tabla USUARIOS se creo antes, agregamos las llaves foraneas ahora.
-- Al borrar un usuario (poco comun) ponemos NULL en vez de romper registros.
-- ============================================================================
ALTER TABLE ROLES             ADD CONSTRAINT FK_ROLES_CREADO     FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE ROLES             ADD CONSTRAINT FK_ROLES_MODIF      FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE EMPRESAS          ADD CONSTRAINT FK_EMPRESAS_CREADO  FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE EMPRESAS          ADD CONSTRAINT FK_EMPRESAS_MODIF   FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE ESTABLECIMIENTOS  ADD CONSTRAINT FK_EST_CREADO       FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE ESTABLECIMIENTOS  ADD CONSTRAINT FK_EST_MODIF        FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE AREAS             ADD CONSTRAINT FK_AREAS_CREADO     FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE AREAS             ADD CONSTRAINT FK_AREAS_MODIF      FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE USUARIOS          ADD CONSTRAINT FK_USUARIOS_CREADO  FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE USUARIOS          ADD CONSTRAINT FK_USUARIOS_MODIF   FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE PERMISOS          ADD CONSTRAINT FK_PERMISOS_CREADO  FOREIGN KEY (CREADO_POR)     REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE PERMISOS          ADD CONSTRAINT FK_PERMISOS_MODIF   FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

-- ============================================================================
-- ÍNDICES (aceleran las consultas mas usadas)
-- ============================================================================
-- Login: se busca por CORREO o por DNI, con estado ACTIVO.
CREATE INDEX IDX_USUARIOS_CORREO ON USUARIOS (CORREO);
CREATE INDEX IDX_USUARIOS_DNI    ON USUARIOS (DNI);
CREATE INDEX IDX_USUARIOS_ROL    ON USUARIOS (ROL_ID);
-- Establecimientos por empresa.
CREATE INDEX IDX_EST_EMPRESA     ON ESTABLECIMIENTOS (EMPRESA_ID);
-- Areas por establecimiento.
CREATE INDEX IDX_AREAS_EST       ON AREAS (ESTABLECIMIENTO_ID);
-- Permisos por usuario.
CREATE INDEX IDX_UP_USUARIO      ON USUARIOS_PERMISOS (USUARIO_ID);

COMMIT;

-- ============================================================================
-- FIN DE 00_SCHEMA.SQL
-- ============================================================================
