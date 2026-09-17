-- ============================================================================
-- 06_ORGANIZACION.SQL
-- ============================================================================
-- SISTEMA DE MOVILIDAD - AVENTURA VIP DE CUSCO
-- ----------------------------------------------------------------------------
-- DESCRIPCION:
--   CRUD del modulo "Organizacion" (catalogos de negocio): empresas,
--   establecimientos (hoteles, tiendas, restaurantes...) y sus areas.
--   El modelo es extensible: en el futuro se agregan mas empresas y cada una
--   puede tener sus propias cadenas de establecimientos con sus areas.
--
--   * SP_GUARDAR_EMPRESA        -> crea o edita una empresa.
--   * SP_GUARDAR_ESTABLECIMIENTO-> crea o edita un establecimiento.
--   * SP_GUARDAR_AREA           -> crea o edita un area.
--   * SP_CAMBIAR_ESTADO_*       -> activa/inactiva cada entidad.
--   * SP_LISTAR_*               -> listados con detalle para la gestion.
--
-- ORDEN DE EJECUCION: despues de 03_SEEDS.SQL. Es RE-EJECUTABLE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- EMPRESAS
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_GUARDAR_EMPRESA(
    P_ID        INTEGER,
    P_NOMBRE    VARCHAR(100),
    P_RUC       VARCHAR(11),
    P_TELEFONO  VARCHAR(20),
    P_DIRECCION VARCHAR(200),
    P_ESTADO    VARCHAR(20),
    P_AUTOR     INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    -- Crear si no trae ID; editar si lo trae.
    IF P_ID IS NULL THEN
        INSERT INTO EMPRESAS (NOMBRE, RUC, TELEFONO, DIRECCION, ESTADO, CREADO_POR, MODIFICADO_POR)
        VALUES (P_NOMBRE, P_RUC, P_TELEFONO, P_DIRECCION,
                COALESCE(P_ESTADO, 'ACTIVO'), P_AUTOR, P_AUTOR)
        RETURNING ID INTO V_ID;
    ELSE
        UPDATE EMPRESAS SET
            NOMBRE       = P_NOMBRE,
            RUC          = P_RUC,
            TELEFONO     = P_TELEFONO,
            DIRECCION    = P_DIRECCION,
            ESTADO       = COALESCE(P_ESTADO, ESTADO),
            MODIFICADO_POR = P_AUTOR
        WHERE ID = P_ID;
        V_ID := P_ID;
    END IF;

    RETURN jsonb_build_object('id', V_ID);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_EMPRESA(
    P_ID INTEGER, P_ESTADO VARCHAR(20), P_AUTOR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF P_ESTADO NOT IN ('ACTIVO', 'INACTIVO') THEN
        RETURN FALSE;
    END IF;
    UPDATE EMPRESAS SET ESTADO = P_ESTADO, MODIFICADO_POR = P_AUTOR WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_LISTAR_EMPRESAS()
RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            E.ID, E.NOMBRE, E.RUC, E.TELEFONO, E.DIRECCION, E.ESTADO,
            (SELECT COUNT(*) FROM ESTABLECIMIENTOS EST WHERE EST.EMPRESA_ID = E.ID) AS ESTABLECIMIENTOS
        FROM EMPRESAS E
        ORDER BY E.NOMBRE
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ESTABLECIMIENTOS
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_GUARDAR_ESTABLECIMIENTO(
    P_ID         INTEGER,
    P_EMPRESA_ID INTEGER,
    P_NOMBRE     VARCHAR(100),
    P_DESCRIPCION VARCHAR(200),
    P_ESTADO     VARCHAR(20),
    P_AUTOR      INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    IF P_ID IS NULL THEN
        INSERT INTO ESTABLECIMIENTOS (EMPRESA_ID, NOMBRE, DESCRIPCION, ESTADO, CREADO_POR, MODIFICADO_POR)
        VALUES (P_EMPRESA_ID, P_NOMBRE, P_DESCRIPCION,
                COALESCE(P_ESTADO, 'ACTIVO'), P_AUTOR, P_AUTOR)
        RETURNING ID INTO V_ID;
    ELSE
        UPDATE ESTABLECIMIENTOS SET
            EMPRESA_ID   = P_EMPRESA_ID,
            NOMBRE       = P_NOMBRE,
            DESCRIPCION  = P_DESCRIPCION,
            ESTADO       = COALESCE(P_ESTADO, ESTADO),
            MODIFICADO_POR = P_AUTOR
        WHERE ID = P_ID;
        V_ID := P_ID;
    END IF;

    RETURN jsonb_build_object('id', V_ID);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_ESTABLECIMIENTO(
    P_ID INTEGER, P_ESTADO VARCHAR(20), P_AUTOR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF P_ESTADO NOT IN ('ACTIVO', 'INACTIVO') THEN
        RETURN FALSE;
    END IF;
    UPDATE ESTABLECIMIENTOS SET ESTADO = P_ESTADO, MODIFICADO_POR = P_AUTOR WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_LISTAR_ESTABLECIMIENTOS()
RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            EST.ID, EST.EMPRESA_ID, E.NOMBRE AS EMPRESA,
            EST.NOMBRE, EST.DESCRIPCION, EST.ESTADO,
            (SELECT COUNT(*) FROM AREAS A WHERE A.ESTABLECIMIENTO_ID = EST.ID) AS AREAS
        FROM ESTABLECIMIENTOS EST
        JOIN EMPRESAS E ON E.ID = EST.EMPRESA_ID
        ORDER BY EST.NOMBRE
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AREAS
-- ============================================================================
CREATE OR REPLACE FUNCTION SP_GUARDAR_AREA(
    P_ID                  INTEGER,
    P_ESTABLECIMIENTO_ID  INTEGER,
    P_NOMBRE              VARCHAR(100),
    P_DESCRIPCION         VARCHAR(200),
    P_ESTADO              VARCHAR(20),
    P_AUTOR               INTEGER
) RETURNS JSONB AS $$
DECLARE
    V_ID INTEGER;
BEGIN
    IF P_ID IS NULL THEN
        INSERT INTO AREAS (ESTABLECIMIENTO_ID, NOMBRE, DESCRIPCION, ESTADO, CREADO_POR, MODIFICADO_POR)
        VALUES (P_ESTABLECIMIENTO_ID, P_NOMBRE, P_DESCRIPCION,
                COALESCE(P_ESTADO, 'ACTIVO'), P_AUTOR, P_AUTOR)
        RETURNING ID INTO V_ID;
    ELSE
        UPDATE AREAS SET
            ESTABLECIMIENTO_ID = P_ESTABLECIMIENTO_ID,
            NOMBRE             = P_NOMBRE,
            DESCRIPCION        = P_DESCRIPCION,
            ESTADO             = COALESCE(P_ESTADO, ESTADO),
            MODIFICADO_POR     = P_AUTOR
        WHERE ID = P_ID;
        V_ID := P_ID;
    END IF;

    RETURN jsonb_build_object('id', V_ID);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_CAMBIAR_ESTADO_AREA(
    P_ID INTEGER, P_ESTADO VARCHAR(20), P_AUTOR INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    IF P_ESTADO NOT IN ('ACTIVO', 'INACTIVO') THEN
        RETURN FALSE;
    END IF;
    UPDATE AREAS SET ESTADO = P_ESTADO, MODIFICADO_POR = P_AUTOR WHERE ID = P_ID;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SP_LISTAR_AREAS()
RETURNS JSONB AS $$
DECLARE V_RESULTADO JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO V_RESULTADO
    FROM (
        SELECT
            A.ID, A.ESTABLECIMIENTO_ID, EST.NOMBRE AS ESTABLECIMIENTO,
            E.NOMBRE AS EMPRESA, A.NOMBRE, A.DESCRIPCION, A.ESTADO
        FROM AREAS A
        JOIN ESTABLECIMIENTOS EST ON EST.ID = A.ESTABLECIMIENTO_ID
        JOIN EMPRESAS E ON E.ID = EST.EMPRESA_ID
        ORDER BY EST.NOMBRE, A.NOMBRE
    ) t;
    RETURN V_RESULTADO;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- FIN DE 06_ORGANIZACION.SQL
-- ============================================================================
