# Estado del Proyecto — Aventura Vip de Cusco

> Documento de respaldo/portabilidad. Cualquier sesion nueva de opencode (u otro
> asistente) puede leer este archivo para recuperar el contexto completo del
> proyecto sin depender del historial de conversacion.
>
> Ultima actualizacion: 2026-08-25 (Fase 1 login + Fase 2 dashboard/usuarios/organizacion, 100% SP-Centric)

---

## 1. Objetivo

Desarrollar para tesis el sistema multiplataforma de gestion de movilidad de
**Aventura Vip de Cusco** (servicio corporativo de taxis privados para Belmond:
Hotel Monasterio y Palacio Nazarenas).

**Fase 1 (Login) y Fase 2 (Dashboard integral + Usuarios + Organizacion) COMPLETAS**:
base de datos (jerarquia 3 niveles, 100% SP-Centric) + API REST + dashboard
integral (sidebar responsive, oscuro/claro, favoritos) + gestion de usuarios
(CRUD, permisos por checkboxes, presets por rol) + organizacion
(empresas/establecimientos/areas) + documentacion actualizada.
Siguiente gran pendiente: **modulo de Reservas** y **desplegar en Netlify** (ver seccion 9).

Todo el trabajo esta en: `~/Desktop/aventura vip/`
(proyecto anterior en `~/aventura-vip/` quedo en desuso/referencia).

---

## 2. Stack tecnológico

| Capa | Tecnologia | Detalle |
|---|---|---|
| Base de datos | PostgreSQL 15 | Docker, contenedor `av-test-pg`, puerto 5432, BD `aventura_vip`, usuario `aventura` / `aventura123`. **100% SP-Centric** (cero SQL directo en controllers) |
| Backend | Node.js + Express + TypeScript | Monolito modular, **SP-Centric** (logica en stored procedures) |
| Seguridad API | helmet + CORS restringido + rate limit | `express-rate-limit` (5 intentos/min por IP en login -> 429) |
| Frontend | React 18 + Vite 5 + Tailwind CSS | SPA + **PWA** (instalable, offline) + dashboard integral (sidebar responsive, oscuro/claro, favoritos) |
| Autenticacion | JWT (12 h) + bcrypt (pgcrypto) | Token en localStorage/sessionStorage (segun "Recordarme"); trabajadores con **DNI**, app publica con **correo** |
| Tests | vitest + supertest | **35 pruebas** de integracion (`npm test`, requieren la BD arriba) |
| Docs | fpdf2 (pip), python-docx | Generacion de PDF y Word desde HTML |

### Identidad visual (rebrand 2026-08)
- Colores oficiales: negro `#000000`, marron chocolate `#3D271C` (CMYK 71 83 88 57), ambar `#C17C26` (CMYK 28 56 96 0).
- Logo: `front-end/public/Logo.svg` (vectorizado desde Logo_1.png, vtracer).
- Fuentes: **Azonix** (titulos/lujo) y **Caviar Dreams** (texto), WOFF2 en `public/fonts/`.

Servidores/herramientas usadas durante desarrollo:
- `morgan` (logs HTTP), `nodemon` (dev), `cloudflared` (tunel HTTPS para probar en celular).
- Iconos de la PWA generados con Python/PIL (monograma AV dorado sobre antracita).

---

## 3. Base de datos

### 3.1. Scripts (en `back-end/db/`, ejecutar en ESTE orden)

```
00_SCHEMA.SQL          -> tablas (7) + CREATE EXTENSION pgcrypto
02_AUDIT_TRIGGER.SQL   -> trigger de auditoria (SP_ACTUALIZAR_MODIFICADO_AT)
01_PROCEDURES.SQL      -> stored procedures
03_SEEDS.SQL           -> roles, empresas, establecimientos, areas, cuentas demo, 9 permisos
05_USUARIOS_CRUD.SQL   -> CRUD de usuarios (SPs)
06_ORGANIZACION.SQL    -> empresas/establecimientos/areas (SPs)
07_SP_EXTRA.SQL        -> SP_OBTENER_CATALOGOS, SP_OBTENER_ROL_POR_NOMBRE
```

Para inyectar en la BD local:
```
cd "back-end"
npm run db:init        # inyecta TODO el orden (00 -> 02 -> 01 -> 03 -> 05 -> 06 -> 07)
```
o manualmente con `docker exec -i av-test-pg psql -U aventura -d aventura_vip < db/<script>.SQL`

### 3.1b. Jerarquia (3 niveles, extensible)

```
EMPRESAS (Aventura Vip de Cusco, Belmond, Particular)
  -> ESTABLECIMIENTOS (hoteles/tiendas/restaurantes; Belmond: Monasterio, Nazarenas, Rio Sagrado)
     -> AREAS (Recepcion, Alimentos y Bebidas, Cocina, Housekeeping)
```
El establecimiento del usuario se deriva de su AREA_ID (joins en los SPs).
Regla: establecimiento+area OBLIGATORIOS si la empresa tiene establecimientos.

### 3.2. Tablas (6)

`ROLES`, `EMPRESAS`, `AREAS`, `USUARIOS`, `PERMISOS`, `USUARIOS_PERMISOS`.
Todas las tablas principales incluyen auditoria: `CREADO_AT`, `CREADO_POR`,
`MODIFICADO_AT`, `MODIFICADO_POR` (el trigger actualiza `MODIFICADO_AT`).

### 3.3. Procedimientos almacenados

- `SP_REGISTRAR_USUARIO` — crea usuario (clave con `crypt(p, gen_salt('bf',8))`).
- `SP_LOGIN` — valida **correo o DNI** + clave; retorna JSONB con datos + permisos.
- `SP_VALIDAR_USUARIO` — verifica que el usuario siga activo.
- `SP_ASIGNAR_PERMISO` — asigna permisos.
- `SP_ACTUALIZAR_MODIFICADO_AT` — trigger de auditoria.

### 3.4. Roles y permisos (PBAC)

Roles: `ADMIN`, `OPERADOR`, `CONDUCTOR`, `USUARIO`.
Permisos sembrados (7): `GESTIONAR_USUARIOS`, `VER_FINANZAS`, `GESTIONAR_FLOTA`,
`GESTIONAR_CONDUCTORES`, `CREAR_RESERVAS`, `DESPACHAR_COLA`, `VER_GPS`.

### 3.5. Cuentas demo (clave: `demo123`)

| Correo | DNI | Rol | Reserva |
|---|---|---|---|
| admin@aventura.com | 12345678 | ADMIN | No |
| operador@aventura.com | 23456789 | OPERADOR | No |
| jorge@aventura.com | 34567890 | CONDUCTOR | No |
| juan.perez@belmond.com | 45678901 | USUARIO | Si (`CREAR_RESERVAS`) |
| maria.tupac@belmond.com | 56789012 | USUARIO | No |

Convencion SQL: MAYUSCULAS sin comillas dobles.

---

## 4. Backend (API REST)

### 4.1. Configuracion

`back-end/.env` (no subir a repos; en produccion usar gestor de secretos):
```
PORT=3000
DATABASE_URL=postgres://aventura:aventura123@localhost:5432/aventura_vip
JWT_SECRET=aventura_vip_super_secreto_2026_cambiar_en_produccion
JWT_EXPIRES_IN=12h
```

Comandos (`cd back-end`): `npm run build` (tsc), `npm run dev` (nodemon),
`npm start` (node dist/server.js), `npm run db:init`.

### 4.2. Estructura final

```
back-end/src/
  app.ts                       # App Express (middlewares + rutas + 404 + errores)
  server.ts                    # Arranca el servidor
  config/
    database.ts                # Pool de conexiones (pg)
    env.ts                     # Valida DATABASE_URL y JWT_SECRET; exporta env tipado
  middlewares/
    auth.middleware.ts         # Valida JWT (Bearer)
    error.middleware.ts        # Manejador global (AppError)
  controllers/auth.controller.ts  # login y /me
  routes/auth.routes.ts        # POST /api/auth/login, GET /api/auth/me
  modules/auth/auth.types.ts   # Tipos/contratos
```

### 4.3. Endpoints

- `POST /api/auth/login` — publico, con **rate limit** (5 intentos/min por IP -> 429). Cuerpo `{ correo_o_dni, clave }` -> `{ token, expira_en, usuario }`. **Regla:** trabajadores (Aventura/Belmond/sin empresa) con DNI; empresa "Particular" con correo.
- `GET /api/auth/me` — protegido (`Authorization: Bearer <token>`).
- `GET /api/usuarios?q=&rol=&estado=` — listado (GESTIONAR_USUARIOS o CREAR_USUARIOS).
- `GET /api/usuarios/:id` · `POST /api/usuarios` · `PUT /api/usuarios/:id` — con GESTIONAR o CREAR_USUARIOS (solo rol USUARIO si el actor solo tiene CREAR_USUARIOS).
- `PATCH /api/usuarios/:id/estado` · `POST/DELETE /api/usuarios/:id/permisos` — solo GESTIONAR_USUARIOS.
- `GET /api/catalogos` — roles/empresas/establecimientos/areas/permisos en un JSONB (SP_OBTENER_CATALOGOS).
- `GET/POST /api/organizacion/{empresas,establecimientos,areas}` + `PUT /:id` + `PATCH /:id/estado` — solo GESTIONAR_CATALOGOS.
- `GET /` — info del servidor.
- Errores estandar: 400, 401, 403 (permiso), 404, 409 (duplicado), 429 (rate limit), 500.

### 4.4. Pruebas

**35/35 pruebas automatizadas (vitest + supertest)** en `back-end/tests/`:
auth (DNI/correo/reglas/401/429/inyeccion SQL), usuarios (CRUD, permisos,
operadora limitada), organizacion (CRUD + 403). Requieren la BD arriba.
Ejecutar: `npm test`.

### 4.5. Arquitectura de datos

**100% SP-Centric**: ningun controller contiene SQL directo (grep de
`FROM <tabla>`/`INSERT`/`UPDATE`/`DELETE` = 0). Toda consulta pasa por
procedimientos almacenados (parametrizados, sin inyeccion SQL).

### 4.5. Seguridad (endurecida el 2026-08-20)

- **helmet** activo (CSP, X-Frame-Options, HSTS, etc.).
- **CORS restringido** por `CORS_ORIGENES` (default: localhost:5173 y 4173).
  En produccion hay que agregar el dominio Netlify a esa variable.
- **Rate limit** en el login configurable (`LOGIN_MAX_INTENTOS`, `LOGIN_VENTANA_MS`).
- `.gitignore` creado; `db/credenciales.txt` eliminado; plantilla `.env.example`.

---

## 5. Frontend (React + Vite + Tailwind + PWA)

### 5.1. Estructura

```
front-end/
  index.html                 # metas PWA (theme-color, apple-touch-icon)
  vite.config.ts             # react + VitePWA + server.host:true + proxy /api -> :3000
                             #   + preview.allowedHosts:true (tunel cloudflared)
  tailwind.config.js         # paleta antracita/dorado/hueso/esmeralda/coral + institucional
                             #   + animaciones, fonts, sombras (glow dorado)
  public/                    # icono-192x192, icono-512x512, icono-mascara, icono-apple
  src/
    main.tsx, App.tsx        # montaje + enrutador
    index.css                # fondo-vip, glass-card, linea-dorada, focus-dorado, reduced-motion
    config/api.ts            # API_BASE='/api', claves de almacenamiento
    services/auth.service.ts # login, obtenerPerfil, guardarSesion(persistir),
                             #   leerToken, leerUsuario, cerrarSesion,
                             #   tokenEstaExpirado; interceptor 401 (logout)
    router/index.tsx         # RutasProtegidas; verifica token + expiracion (exp JWT);
                             #   /login publico, / -> Dashboard
    types/index.ts           # Usuario, RespuestaLogin, PeticionLogin, ErrorApi
    pages/Login.tsx          # login premium
    pages/Dashboard.tsx      # saludo + rol/empresa/area + permisos
    components/
      Loader.tsx             # premium (pantalla completa) y spinner
      LogoVip.tsx            # monograma AV + sello girando + insignia MEMBER
      CampoFormulario.tsx    # compone Label + Input (misma API publica)
      ui/                    # PRIMITIVAS REUTILIZABLES:
        Button.tsx           # variantes principal/outline/ghost x tonos
                             #   dorado/institucional/peligro; cargando; renderAs="link"
        Label.tsx            # htmlFor, requerido (asterisco)
        Input.tsx            # estados default/focus/error/validado, icono, permiteRevelar
        Checkbox.tsx         # casilla dorada custom (peer sr-only)
        AlertaError.tsx      # banner error role="alert"
        Select.tsx           # listo para modulos futuros (empresas/areas/roles)
        Textarea.tsx         # listo para modulos futuros (notas/observaciones)
```

### 5.2. PWA

- `vite-plugin-pwa` (registerType `autoUpdate`, precache 12 entradas ~304 KB).
- Build genera: `dist/sw.js`, `dist/manifest.webmanifest`, `dist/registerSW.js`.
- Manifest: name "Aventura Vip - Sistema de Movilidad", theme `#0A0A0B`, display `standalone`, lang es.
- Iconos: monograma AV dorado sobre antracita (192, 512, maskable, 180 apple).

### 5.3. Login premium

Flujo: loader fullscreen ~2.6 s (revelado AV + sello dorado girando + barra)
-> formulario glassmorphism en negro/dorado, layout 2 columnas, campo usuario
(correo o DNI), contrasena con ver/ocultar, "Recordarme" custom, "Olvidaste tu
clave", boton dorado con glow y spinner de carga, "Solicitar acceso VIP"
(mailto), desplegable de cuentas demo, footer legal. Accesible (aria,
prefers-reduced-motion).

---

## 6. Documentacion (en `back-end/docs/`)

- `GUIA_API_REST.html` / `.pdf` (12 pag) — guia de la API + seccion 12 frontend/PWA/celular/tunel. Generador: `generar_pdf.py` (fpdf2).
- `TESIS_INFORME.html` / `.pdf` (15 pag) / `.docx` — documento de tesis. Generadores: `generar_pdf_tesis.py`, `generar_docx_tesis.py`.
- Los PDF se regeneran ejecutando los `.py` (los generadores leen el HTML; fpdf2 solo acepta caracteres Latin-1: evitar em dash y caracteres de caja Unicode).
- `ESTADO_PROYECTO.md` (este archivo).

---

## 7. Como arrancar en local

```
# 0) Docker Desktop (si el daemon esta apagado)
open -a Docker          # esperar a que responda: docker info

# 1) Base de datos
docker start av-test-pg          # (o docker run --name av-test-pg -e POSTGRES_USER=aventura
                                 #   -e POSTGRES_PASSWORD=aventura123 -e POSTGRES_DB=aventura_vip
                                 #   -p 5432:5432 -d postgres:15-alpine)
cd "back-end" && npm run db:init # SOLO la primera vez: inyecta los 4 scripts.
                                 # NO es idempotente: si las tablas ya existen,
                                 # lanza errores de transaccion -> ignorar.

# 2) Backend (terminal 1)
cd "back-end" && npm install && npm run dev     # http://localhost:3000

# 3) Frontend (terminal 2)
cd "front-end" && npm install && npm run dev    # http://localhost:5173 (proxy /api -> :3000)

# 4) Build PWA + preview (opcional)
cd "front-end" && npm run build && npm run preview   # http://localhost:4173

# 5) Pruebas automatizadas del backend (requieren la BD arriba)
cd "back-end" && npm test
```

Probar login: `admin@aventura.com` / `demo123` (o las demas cuentas demo).

---

## 8. Probar en el celular

### Opcion A - red local
- `vite.config.ts` ya tiene `server.host: true`. IP del Mac: `ipconfig getifaddr en0`.
- Abrir `http://IP_DEL_MAC:5173` en el celular (misma Wi-Fi). No instalable (HTTP).

### Opcion B - PWA instalable via tunel HTTPS (cloudflared)
```
cd "front-end" && npm run build && npm run preview -- --host
# descargar binario (Intel: darwin-amd64; Apple Silicon: darwin-arm64)
#   curl -L -o cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz
#   tar -xzf cloudflared.tgz && chmod +x cloudflared && mv cloudflared ~/.local/bin/
~/.local/bin/cloudflared tunnel --url http://localhost:4173
```
Usar la URL `https://XXXX.trycloudflare.com` del log. En Android/Chrome:
"Instalar aplicacion"; en iOS/Safari: Compartir -> "Añadir a pantalla de inicio".
Nota: si el preview responde 403, es Vite bloqueando el host -> `preview.allowedHosts: true` (ya esta).
La URL es temporal; cerrar el tunel al terminar (`pkill cloudflared`).

---

## 9. PENDIENTE: Desplegar en Netlify (proximo paso)

Objetivo: publicar TODO (frontend PWA + API + PostgreSQL en la nube) en
`https://<sitio>.netlify.app`. El login, /me y la PWA deben funcionar por HTTPS
(ya no haria falta el tunel).

Plan (detallado y aprobado):

1. Instalar CLI: `npm install -g netlify-cli` + `netlify login` (navegador).
   (El usuario debe confirmar en el navegador con su cuenta Netlify.)
2. Backend como funcion serverless: `npm i serverless-http` en `back-end`.
   Crear `back-end/netlify/functions/api.ts`:
   ```ts
   import serverless from 'serverless-http';
   import app from '../../src/app';
   export const handler = serverless(app);
   ```
   (Respaldo si serverless-http falla: funcion v2 nativa Request/Response que monta Express.)
3. `netlify.toml` en la raiz del proyecto:
   ```toml
   [build]
     command = "cd back-end && npm install && cd ../front-end && npm install && npm run build"
     publish = "front-end/dist"
     functions = "back-end/netlify/functions"

   [functions]
     node_bundler = "esbuild"
     external_node_modules = ["express","pg","bcryptjs","jsonwebtoken","morgan","cors","dotenv"]

   [[redirects]]
     force = true
     from = "/api/*"
     status = 200
     to = "/.netlify/functions/api/:splat"

   [[redirects]]
     from = "/*"
     status = 200
     to = "/index.html"
   ```
4. Base de datos en la nube (PENDIENTE de decision del usuario):
   - Neon (gratis) — recomendado; `DATABASE_URL` con `?sslmode=require`.
   - Netlify Database (integrada, construida sobre Neon; requiere plan con creditos).
   - Supabase (gratis).
   Cargar los 4 scripts en orden usando:
   `docker run --rm -i postgres:15-alpine psql "$DATABASE_URL" < back-end/db/00_SCHEMA.SQL`
   (y 02, 01, 03 en ese orden). El script 00 ya incluye `CREATE EXTENSION IF NOT EXISTS pgcrypto`.
5. Env vars en Netlify: `netlify env:set DATABASE_URL ...` · `JWT_SECRET ...` ·
   `JWT_EXPIRES_IN 12h` · **`CORS_ORIGENES https://<sitio>.netlify.app`** (obligatorio:
   el CORS ahora es restringido) · `LOGIN_MAX_INTENTOS 5` · `LOGIN_VENTANA_MS 60000`.
6. Crear sitio y desplegar: `netlify init` (nuevo sitio) -> `netlify deploy --prod`.
7. Verificar: `curl` POST/GET a `/api/auth/login` y `/api/auth/me`; `manifest.webmanifest`,
   `sw.js`; instalar la PWA y probar desde el celular. Antes, prueba local con `netlify dev`.

Notas/riesgos:
- Funciones Netlify: limite 10 s / 1024 MB (suficiente para SP_LOGIN).
- morgan loguea en los logs de la funcion (ok).
- El proyecto NO es repo git; se puede desplegar por CLI sin GitHub, o inicializar git para CI.
  Al inicializar git, el `.gitignore` raiz ya excluye node_modules, dist, .env y secretos.

---

## 10. Estado actual del entorno

- Contenedor `av-test-pg` (PostgreSQL): **CORRIENDO** (BD reconstruida 2026-08-25 con la jerarquia de 3 niveles).
- Backend (3000) y frontend dev (5173): **CORRIENDO**.
- Pruebas automatizadas: **35/35** aprobadas (`npm test` en back-end).
- Documentos (TESIS_INFORME y GUIA_API_REST): **actualizados y regenerados** (PDF/DOCX, colores de marca).
- Pendientes: Fase 3 (Reservas), Flota, despliegue Netlify (seccion 9).
- Para retomar: seguir la seccion 7.
