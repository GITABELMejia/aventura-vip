-- ============================================================================
-- 09_DOCUMENTOS.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   Documentos del conductor: fotos de DNI y licencia de conducir (base64).
--   Solo los CONDUCTORES tienen documentos.
--
--   * El DNI y la licencia tienen DOS CARAS: ANVERSO (frente) y REVERSO (dorso).
--   * La licencia tiene DATOS PROPIOS (numero + fecha de caducidad) que se
--     guardan PRIMERO (tabla LICENCIAS); recien despues se cargan las fotos.
--
--   TABLA DOCUMENTOS (imagenes):
--     * SP_GUARDAR_DOCUMENTO    -> UPSERT por USUARIO+TIPO+CARA
--     * SP_LISTAR_DOCUMENTOS    -> listado (metadatos, sin base64)
--     * SP_OBTENER_DOCUMENTO    -> detalle (incluye base64)
--     * SP_ELIMINAR_DOCUMENTO   -> elimina un documento
--
--   TABLA LICENCIAS (datos de la licencia):
--     * SP_GUARDAR_LICENCIA     -> UPSERT por USUARIO
--     * SP_OBTENER_LICENCIA     -> detalle (numero + fecha_caducidad)
--
-- ORDEN DE EJECUCION: despues de 08_RESET_PASSWORD.SQL. Es RE-EJECUTABLE
-- (las funciones usan CREATE OR REPLACE; las tablas se reconstruyen).
-- ============================================================================

BEGIN;

-- Reconstruccion limpia si se re-aplica (DROP + CREATE de la nueva version).
DROP TABLE IF EXISTS DOCUMENTOS CASCADE;
DROP TABLE IF EXISTS LICENCIAS CASCADE;

-- ============================================================================
-- TABLA: DOCUMENTOS (IMAGENES DE DNI Y LICENCIA, UNA POR CARA)
-- ============================================================================
CREATE TABLE DOCUMENTOS (
    ID                SERIAL       PRIMARY KEY,
    USUARIO_ID        INTEGER      NOT NULL REFERENCES USUARIOS(ID),
    TIPO              VARCHAR(20)  NOT NULL CHECK (TIPO IN ('DNI', 'LICENCIA')),
    CARA              VARCHAR(20)  NOT NULL CHECK (CARA IN ('ANVERSO', 'REVERSO')),
    NOMBRE_ARCHIVO    VARCHAR(150) NOT NULL,
    MIME              VARCHAR(50)  NOT NULL,
    CONTENIDO_B64     TEXT         NOT NULL,
    ESTADO            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
                      CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),

    -- 1 imagen por CARA por TIPO por conductor: la nueva reemplaza a la anterior.
    UNIQUE (USUARIO_ID, TIPO, CARA),

    CREADO_AT       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- FK de auditoria.
ALTER TABLE DOCUMENTOS ADD CONSTRAINT FK_DOCUMENTOS_CREADO
    FOREIGN KEY (CREADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE DOCUMENTOS ADD CONSTRAINT FK_DOCUMENTOS_MODIF
    FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

-- Trigger de auditoria (mismo patron SP_ACTUALIZAR_MODIFICADO_AT).
CREATE TRIGGER TRG_DOCUMENTOS_MODIFICADO
BEFORE UPDATE ON DOCUMENTOS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

-- ============================================================================
-- TABLA: LICENCIAS (DATOS DE LA LICENCIA DE CONDUCIR)
-- ============================================================================
CREATE TABLE LICENCIAS (
    ID                SERIAL       PRIMARY KEY,
    USUARIO_ID        INTEGER      NOT NULL UNIQUE REFERENCES USUARIOS(ID),
    NUMERO_DOCUMENTO  VARCHAR(30)  NOT NULL,
    FECHA_CADUCIDAD   DATE         NOT NULL,
    ESTADO            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
                      CHECK (ESTADO IN ('ACTIVO', 'INACTIVO')),

    CREADO_AT       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CREADO_POR      INTEGER,
    MODIFICADO_AT   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    MODIFICADO_POR  INTEGER
);

-- FK de auditoria.
ALTER TABLE LICENCIAS ADD CONSTRAINT FK_LICENCIAS_CREADO
    FOREIGN KEY (CREADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;
ALTER TABLE LICENCIAS ADD CONSTRAINT FK_LICENCIAS_MODIF
    FOREIGN KEY (MODIFICADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL;

-- Trigger de auditoria.
CREATE TRIGGER TRG_LICENCIAS_MODIFICADO
BEFORE UPDATE ON LICENCIAS
FOR EACH ROW EXECUTE FUNCTION SP_ACTUALIZAR_MODIFICADO_AT();

-- ============================================================================
-- SP: SP_GUARDAR_DOCUMENTO (UPSERT)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_GUARDAR_DOCUMENTO(
    P_USUARIO_ID        INTEGER,
    P_TIPO              VARCHAR(20),
    P_CARA              VARCHAR(20),
    P_NOMBRE_ARCHIVO    VARCHAR(150),
    P_MIME              VARCHAR(50),
    P_CONTENIDO_B64     TEXT,
    P_AUTOR             INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    INSERT INTO DOCUMENTOS (
        USUARIO_ID, TIPO, CARA, NOMBRE_ARCHIVO, MIME, CONTENIDO_B64,
        CREADO_POR, MODIFICADO_POR
    ) VALUES (
        P_USUARIO_ID, P_TIPO, P_CARA, P_NOMBRE_ARCHIVO, P_MIME, P_CONTENIDO_B64,
        P_AUTOR, P_AUTOR
    )
    ON CONFLICT (USUARIO_ID, TIPO, CARA) DO UPDATE SET
        NOMBRE_ARCHIVO    = EXCLUDED.NOMBRE_ARCHIVO,
        MIME              = EXCLUDED.MIME,
        CONTENIDO_B64     = EXCLUDED.CONTENIDO_B64,
        ESTADO            = 'ACTIVO',
        MODIFICADO_POR    = EXCLUDED.MODIFICADO_POR
    RETURNING ID INTO V_ID;

    RETURN jsonb_build_object('id', V_ID);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_LISTAR_DOCUMENTOS (metadatos, sin base64)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_LISTAR_DOCUMENTOS(
    P_USUARIO_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            D.ID, D.TIPO, D.CARA, D.NOMBRE_ARCHIVO,
            D.MIME, D.ESTADO, D.MODIFICADO_AT
        FROM DOCUMENTOS D
        WHERE D.USUARIO_ID = P_USUARIO_ID
        ORDER BY D.TIPO, D.CARA
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_DOCUMENTO (con base64)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_DOCUMENTO(
    P_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',             D.ID,
        'usuario_id',     D.USUARIO_ID,
        'tipo',           D.TIPO,
        'cara',           D.CARA,
        'nombre_archivo', D.NOMBRE_ARCHIVO,
        'mime',           D.MIME,
        'contenido_b64',  D.CONTENIDO_B64,
        'estado',         D.ESTADO
    ) INTO V_RESULTADO
    FROM DOCUMENTOS D
    WHERE D.ID = P_ID;

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_ELIMINAR_DOCUMENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_ELIMINAR_DOCUMENTO(
    P_ID INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM DOCUMENTOS WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_GUARDAR_LICENCIA (UPSERT de los datos de la licencia)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_GUARDAR_LICENCIA(
    P_USUARIO_ID        INTEGER,
    P_NUMERO_DOCUMENTO  VARCHAR(30),
    P_FECHA_CADUCIDAD   DATE,
    P_AUTOR             INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    INSERT INTO LICENCIAS (
        USUARIO_ID, NUMERO_DOCUMENTO, FECHA_CADUCIDAD, CREADO_POR, MODIFICADO_POR
    ) VALUES (
        P_USUARIO_ID, P_NUMERO_DOCUMENTO, P_FECHA_CADUCIDAD, P_AUTOR, P_AUTOR
    )
    ON CONFLICT (USUARIO_ID) DO UPDATE SET
        NUMERO_DOCUMENTO  = EXCLUDED.NUMERO_DOCUMENTO,
        FECHA_CADUCIDAD   = EXCLUDED.FECHA_CADUCIDAD,
        ESTADO            = 'ACTIVO',
        MODIFICADO_POR    = EXCLUDED.MODIFICADO_POR
    RETURNING ID INTO V_ID;

    RETURN jsonb_build_object('id', V_ID);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SP: SP_OBTENER_LICENCIA (datos de la licencia, o null)
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_OBTENER_LICENCIA(
    P_USUARIO_ID INTEGER
) RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT jsonb_build_object(
        'numero_documento', L.NUMERO_DOCUMENTO,
        'fecha_caducidad',  L.FECHA_CADUCIDAD
    ) INTO V_RESULTADO
    FROM LICENCIAS L
    WHERE L.USUARIO_ID = P_USUARIO_ID
      AND L.ESTADO = 'ACTIVO';

    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 09_DOCUMENTOS.SQL
-- ============================================================================