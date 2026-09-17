// ============================================================================
// CONFIGURACION DE NAVEGACION (MODULOS DEL SISTEMA)
// ----------------------------------------------------------------------------
// Define la estructura del menu lateral. Cada modulo declara:
//   * id, titulo, icono (lucide-react).
//   * ruta (si navega) y permiso requerido (si esta restringido por PBAC).
//   * children: submodulos (menus anidados de 2 y 3 niveles).
//
// Los modulos que no existen aun NO se listan: se agregan parte por parte
// (reservas, flota, conductores, finanzas) conforme se desarrollan.
// ============================================================================

import {
  LayoutDashboard,
  Settings,
  UserCircle,
  Building2,
  FileImage,
  Users,
  UserPlus,
  List,
  CalendarClock,
  Plus,
  History,
  Route,
  Clock,
  type LucideIcon,
} from 'lucide-react';

export interface ItemNavegacion {
  id: string;
  titulo: string;
  icono: LucideIcon;
  ruta?: string;
  /** Permiso PBAC necesario (se oculta si falta). */
  permiso?: string;
  /** Cualquiera de estos permisos basta para ver el modulo. */
  permisos?: string[];
  /** Rol necesario para ver el modulo (se oculta si no coincide). */
  rol?: string;
  /** Si puede marcarse como favorito (estrella). */
  favoritable?: boolean;
  children?: ItemNavegacion[];
}

export const NAVEGACION: ItemNavegacion[] = [
  {
    id: 'inicio',
    titulo: 'Inicio',
    icono: LayoutDashboard,
    ruta: '/inicio',
    favoritable: true,
  },
  {
    id: 'mis-documentos',
    titulo: 'Mis documentos',
    icono: FileImage,
    ruta: '/mis-documentos',
    rol: 'CONDUCTOR',
    favoritable: true,
  },
  {
    id: 'reservas-conductor',
    titulo: 'Reservas',
    icono: CalendarClock,
    rol: 'CONDUCTOR',
    children: [
      {
        id: 'reservas-asignadas',
        titulo: 'Reservas asignadas',
        icono: List,
        ruta: '/mis-servicios',
      },
    ],
  },
  {
    id: 'servicios-conductor',
    titulo: 'Servicios',
    icono: Route,
    rol: 'CONDUCTOR',
    children: [
      {
        id: 'servicios-activos',
        titulo: 'Servicios en curso',
        icono: List,
        ruta: '/servicios',
      },
    ],
  },
  {
    id: 'usuarios',
    titulo: 'Usuarios',
    icono: Users,
    // Gestion completa (admin) o creacion/edicion de clientes (operadora).
    permisos: ['GESTIONAR_USUARIOS', 'CREAR_USUARIOS'],
    children: [
      {
        id: 'usuarios-nuevo',
        titulo: 'Agregar usuario',
        icono: UserPlus,
        ruta: '/usuarios/nuevo',
        permisos: ['GESTIONAR_USUARIOS', 'CREAR_USUARIOS'],
      },
      {
        id: 'usuarios-listar',
        titulo: 'Listar usuarios',
        icono: List,
        ruta: '/usuarios',
        permisos: ['GESTIONAR_USUARIOS', 'CREAR_USUARIOS'],
        favoritable: true,
      },
      {
        id: 'operadores-listar',
        titulo: 'Listar operadores',
        icono: List,
        ruta: '/usuarios?rol=OPERADOR',
        permiso: 'GESTIONAR_USUARIOS',
      },
      {
        id: 'conductores-listar',
        titulo: 'Listar conductores',
        icono: List,
        ruta: '/usuarios?rol=CONDUCTOR',
        permiso: 'GESTIONAR_USUARIOS',
      },
    ],
  },
  {
    id: 'reservas',
    titulo: 'Reservas',
    icono: CalendarClock,
    // La operadora crea/despacha; el coordinador (CREAR_RESERVAS) crea y ve.
    permisos: ['CREAR_RESERVAS', 'DESPACHAR_COLA'],
    children: [
      {
        id: 'reservas-listar',
        titulo: 'Listar reservas',
        icono: List,
        ruta: '/reservas',
        permisos: ['CREAR_RESERVAS', 'DESPACHAR_COLA'],
      },
      {
        id: 'reservas-nueva',
        titulo: 'Nueva reserva',
        icono: Plus,
        ruta: '/reservas/nuevo',
        permiso: 'CREAR_RESERVAS',
      },
      {
        id: 'servicios-historial',
        titulo: 'Historial de servicios',
        icono: History,
        ruta: '/servicios-historial',
        permiso: 'DESPACHAR_COLA',
      },
    ],
  },
  {
    id: 'organizacion',
    titulo: 'Organizacion',
    icono: Building2,
    ruta: '/organizacion',
    // Empresas, establecimientos y areas (solo admin).
    permiso: 'GESTIONAR_CATALOGOS',
    favoritable: true,
  },
  {
    id: 'puntos-recogida',
    titulo: 'Puntos de recogida',
    icono: Clock,
    ruta: '/puntos-recogida',
    // Solo admin: horarios y lugares para crear servicios.
    permiso: 'GESTIONAR_CATALOGOS',
    favoritable: true,
  },
  {
    id: 'configuracion',
    titulo: 'Configuracion',
    icono: Settings,
    favoritable: true,
    children: [
      {
        id: 'mi-perfil',
        titulo: 'Mi perfil',
        icono: UserCircle,
        ruta: '/perfil',
      },
    ],
  },
];
