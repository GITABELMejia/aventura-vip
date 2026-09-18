# AGENTS.md

Proyecto de tesis "Aventura Vip de Cusco" — sistema multiplataforma de movilidad.
Ruta de trabajo: `~/Desktop/aventura vip/` (OJO: espacios -> siempre entre comillas).

## Estructura
- `back-end/` — API REST (Node + Express + TypeScript). Depende de PostgreSQL en Docker (`av-test-pg`).
- `front-end/` — SPA (React 18 + Vite 5 + Tailwind) + PWA. Proxy dev `/api -> :3000`.
- `package.json` raíz — orquesta todo (`npm run build`, `npm start`, `npm run db:init`).
- Git: repo `GITABELMejia/aventura-vip` (rama `main`). Desplegado en Seenode.

## Funcionamiento
# Backend
docker start av-test-pg            # si Docker Desktop esta apagado: open -a Docker
cd back-end && npm run dev          # nodemon + ts-node (no usar node dist en dev)
npm run build && npm start          # produccion (tsc -> dist/server.js)
npm run db:init                     # inyecta los 18 scripts SQL en orden (NO es
                                    #   idempotente: falla si las tablas ya existen)
npm test                            # vitest + supertest (9 pruebas; REQUIERE la BD arriba)

# Frontend
cd front-end && npm run dev         # :5173 (api via proxy)
npm run build && npm run preview    # :4173 PWA; preview.allowedHosts=true (tunel cloudflare)

## Despliegue (produccion)
- App: https://aventura-vip.seenode.app — un solo servicio (Express sirve `/api` y `front-end/dist`).
- Build: `npm run build` · Start: `npm start` · Root Directory: raiz del repo.
- Auto-deploy activado: cada push a `main` dispara un deploy en Seenode.
- BD: PostgreSQL gestionado por Seenode. El SSL autofirmado se maneja en
  `src/config/database.ts` y `db/init.js` (la URL NO necesita `?sslmode=`).
- Inicializar la BD remota (una sola vez): `DATABASE_URL=... node back-end/db/init.js`.

## Base de datos (SP-Centric)
Orden de inyeccion OBLIGATORIO (no es secuencial): 00_SCHEMA -> 02_AUDIT_TRIGGER -> 01_PROCEDURES -> 03_SEEDS.
El `02` (trigger) debe ir antes del `01` (procedures). Toda la logica vive en stored procedures.
Identificadores SQL en MAYUSCULAS, sin comillas dobles. Usuarios demo clave `demo123` (ver 03_SEEDS.SQL o ESTADO_PROYECTO.md).

## Backend
- `.env` obligatorio (`DATABASE_URL`, `JWT_SECRET`); lo valida `src/config/env.ts`.
  Copiar `.env.example` como plantilla. Otros: `CORS_ORIGENES` (origenes permitidos,
  separados por coma), `LOGIN_MAX_INTENTOS`/`LOGIN_VENTANA_MS` (rate limit del login).
- Entry: `src/app.ts` (arranca Express). Middlewares: helmet + cors(restricto) + morgan.
- Endpoints: POST /api/auth/login (con rate limit -> 429), GET /api/auth/me (JWT Bearer 12h).
- Regla de login: TRABAJADORES (Aventura Vip, Belmond, sin empresa) entran con DNI;
  empresa "Particular" (app publica futura) con correo. Vive en SP_LOGIN.
- Modulos: `/api/usuarios` (GET/POST/PUT con GESTIONAR_USUARIOS o CREAR_USUARIOS;
  PATCH estado solo GESTIONAR; con solo CREAR_USUARIOS solo rol USUARIO),
  `/api/catalogos` (roles/empresas/establecimientos/areas/permisos),
  `/api/organizacion/*` (solo GESTIONAR_CATALOGOS; PUT usa id de la ruta, no del body).
- Pruebas en `back-end/tests/*.test.ts` (vitest + supertest). Config: `vitest.config.ts`
  (limita LOGIN_MAX_INTENTOS alto salvo la prueba dedicada de 429).

## Base de datos (jerarquia)
- EMPRESAS -> ESTABLECIMIENTOS (hoteles/tiendas/restaurantes) -> AREAS.
  El establecimiento del usuario se deriva del AREA_ID (join en los SPs).
  Obligatorio elegir establecimiento+area si la empresa tiene establecimientos.
- Scripts: 00_SCHEMA, 02_AUDIT_TRIGGER, 01_PROCEDURES, 03_SEEDS (9 permisos),
  05_USUARIOS_CRUD, 06_ORGANIZACION, 07_SP_EXTRA. NO idempotentes: para
  re-aplicar, DROP + recrear (npm run db:init ya usa el orden completo).
- REGLA DE ORO: 100% SP-Centric. NINGUNA consulta directa a tablas en
  controllers (grep: FROM <TABLA>/INSERT/UPDATE/DELETE debe dar 0). Catalogos
  via SP_OBTENER_CATALOGOS(); roles via SP_OBTENER_ROL_POR_NOMBRE().

## Frontend
- Config: `src/config/api.ts` (`API_BASE='/api'`; si existe `VITE_API_URL` al compilar,
  usa esa URL absoluta para un backend separado), `services/auth.service.ts`.
- Sesion: "Recordarme" -> localStorage; sin marcar -> sessionStorage (ambos se leen/limpian).
  `tokenEstaExpirado()` decodifica `exp` del JWT (atob, sin libreria); el interceptor de
  axios hace logout automatico en 401; el Dashboard valida con `/me` al cargar.
- UI: REUTILIZAR primitivas `src/components/ui/` (Button, Input, Label, Select, Textarea, Checkbox, AlertaError) en nuevos formularios/paginas.
- PWA: `vite-plugin-pwa`; el build genera `dist/sw.js` y `manifest.webmanifest` (no editar a mano).
- Comentarios/es docs en ESPANOL.

## Docs (back-end/docs/)
- `ESTADO_PROYECTO.md` = estado + plan Netlify (seccion 9; `serverless-http` aun NO instalado).
- PDF se generan con fpdf2 (solo Latin-1): NO usar em dash/guion Unicode ni cajas Unicode en el HTML fuente.

## Seguridad del proyecto
- `helmet` + CORS restringido por `CORS_ORIGENES` (en Seenode app y API comparten
  origen, asi que no se requiere CORS; solo si el frontend va aparte, ej. Vercel).
- Rate limit del login (fuerza bruta). JWT en localStorage (aceptable para tesis).
- No subir a git: `.env`, `db/credenciales.txt` (eliminado), `node_modules`, `dist` (ver .gitignore).

## Verificacion
- Login: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"correo_o_dni":"admin@aventura.com","clave":"demo123"}'`
- /me: repetir con `Authorization: Bearer <token>`.
- `npm test` en back-end (requiere BD arriba). Frontend: `npm run build` (tsc && vite build = typecheck).