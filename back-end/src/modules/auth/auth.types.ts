// ============================================================================
// TIPOS Y CONTRATOS DEL MODULO DE AUTENTICACION
// ----------------------------------------------------------------------------
// Este archivo concentra TODAS las interfaces y tipos que usan las rutas,
// el controlador y los middlewares del modulo auth. Al centralizarlos:
//   1) El codigo es mas legible y auto-documentado.
//   2) TypeScript verifica en compilacion que los datos coincidan.
//   3) Si cambia la estructura de un dato, solo se edita aqui.
// ============================================================================

// ----------------------------------------------------------------------------
// DATOS DEL USUARIO AUTENTICADO
// ----------------------------------------------------------------------------
// Es lo que devuelve el procedimiento SP_LOGIN de PostgreSQL (formato JSONB).
// No incluye la clave: el servidor jamas expone la contrasena.
// ----------------------------------------------------------------------------
export interface DatosUsuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string | null;
  dni: string | null;
  telefono: string | null;
  rol: string;
  empresa: string | null;
  area: string | null;
  empresa_id: number | null;
  area_id: number | null;
  puede_reservar: boolean;
  permisos: string[];
}

// ----------------------------------------------------------------------------
// PAYLOAD DEL TOKEN JWT
// ----------------------------------------------------------------------------
// Datos que se guardan DENTRO del token firmado. Son los que el middleware
// recupera en cada peticion para identificar al usuario sin tocar la BD.
// ----------------------------------------------------------------------------
export interface PayloadToken {
  sub: number;        // id del usuario
  rol: string;        // nombre del rol
  permisos: string[]; // lista de permisos del usuario
}

// ----------------------------------------------------------------------------
// CUERPO DE LA PETICION DE LOGIN
// ----------------------------------------------------------------------------
// Estructura del JSON que el cliente envia a POST /api/auth/login.
// ----------------------------------------------------------------------------
export interface PeticionLogin {
  correo_o_dni: string; // correo o DNI del usuario
  clave: string;        // contrasena en texto plano
}

// ----------------------------------------------------------------------------
// RESPUESTA EXITOSA DEL LOGIN
// ----------------------------------------------------------------------------
// Estructura del JSON que la API devuelve al iniciar sesion correctamente.
// ----------------------------------------------------------------------------
export interface RespuestaLogin {
  token: string;          // JWT firmado (vigente 12 horas)
  expira_en: string | null; // fecha de expiracion del token (ISO 8601)
  usuario: DatosUsuario;  // datos del usuario autenticado
}
