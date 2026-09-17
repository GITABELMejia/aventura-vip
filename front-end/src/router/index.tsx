// ============================================================================
// ENRUTADOR PRINCIPAL (RUTAS PROTEGIDAS + LAYOUT)
// ----------------------------------------------------------------------------
// Define las rutas de la aplicacion React usando React Router.
//
// PROTECCION DE RUTAS:
//   * /login     -> publica (cualquiera puede entrar).
//   * /          -> protegida: requiere sesion. Verifica token + expiracion.
//   * Las rutas del dashboard viven dentro de <DashboardLayout> (sidebar).
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';

import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Perfil from '../pages/Perfil';
import Usuarios from '../pages/Usuarios';
import UsuarioForm from '../pages/UsuarioForm';
import Organizacion from '../pages/Organizacion';
import Documentos from '../pages/Documentos';
import Reservas from '../pages/Reservas';
import ReservaForm from '../pages/ReservaForm';
import MisServicios from '../pages/MisServicios';
import Servicios from '../pages/Servicios';
import ServiciosConductor from '../pages/ServiciosConductor';
import PuntosRecogida from '../pages/PuntosRecogida';
import DashboardLayout from '../layouts/DashboardLayout';
import { leerToken, tokenEstaExpirado, cerrarSesion } from '../services/auth.service';
import { usePermisos } from '../hooks/usePermisos';

// ----------------------------------------------------------------------------
// COMPONENTE: RutasProtegidas
// ----------------------------------------------------------------------------
// Envuelve las rutas que requieren autenticacion. Verifica que exista un
// token y que NO este expirado. Si no hay sesion (o caduco), redirige a
// /login (guardando la ruta original en location.state.from).
// ----------------------------------------------------------------------------
function RutasProtegidas({ children }: { children: ReactElement }) {
  const location = useLocation();
  const token = leerToken();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (tokenEstaExpirado(token)) {
    cerrarSesion();
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

// ----------------------------------------------------------------------------
// COMPONENTE: RutaPorPermiso
// ----------------------------------------------------------------------------
// Protege una ruta con permiso(s) PBAC ademas de la sesion. Si el usuario no
// tiene ninguno de los permisos, se redirige a Inicio.
// ----------------------------------------------------------------------------
function RutaPorPermiso({
  permiso,
  permisos,
  children,
}: {
  permiso?: string;
  permisos?: string[];
  children: ReactElement;
}) {
  const { tienePermiso } = usePermisos();

  const autorizado = permiso
    ? tienePermiso(permiso)
    : permisos?.some((p) => tienePermiso(p));

  if (!autorizado) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

// ----------------------------------------------------------------------------
// COMPONENTE: RutaPorRol
// ----------------------------------------------------------------------------
// Protege una ruta por rol (ej. Mis documentos -> solo CONDUCTOR).
// ----------------------------------------------------------------------------
function RutaPorRol({ rol, children }: { rol: string; children: ReactElement }) {
  const { rol: rolActual } = usePermisos();

  if (rolActual !== rol) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

// ----------------------------------------------------------------------------
// APLICACION DE RUTAS
// ----------------------------------------------------------------------------
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta publica: login */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard integral: layout con sidebar + contenido anidado */}
        <Route
          path="/"
          element={
            <RutasProtegidas>
              <DashboardLayout />
            </RutasProtegidas>
          }
        >
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="perfil" element={<Perfil />} />
          {/* Modulo de usuarios: gestion completa (admin) o clientes (operadora) */}
          <Route
            path="usuarios"
            element={
              <RutaPorPermiso
                permisos={['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']}
              >
                <Usuarios />
              </RutaPorPermiso>
            }
          />
          <Route
            path="usuarios/nuevo"
            element={
              <RutaPorPermiso
                permisos={['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']}
              >
                <UsuarioForm />
              </RutaPorPermiso>
            }
          />
          <Route
            path="usuarios/:id/editar"
            element={
              <RutaPorPermiso
                permisos={['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']}
              >
                <UsuarioForm />
              </RutaPorPermiso>
            }
          />
          {/* Modulo organizacion (empresas/establecimientos/areas): solo admin */}
          <Route
            path="organizacion"
            element={
              <RutaPorPermiso permiso="GESTIONAR_CATALOGOS">
                <Organizacion />
              </RutaPorPermiso>
            }
          />
          {/* Puntos de recogida (admin) */}
          <Route
            path="puntos-recogida"
            element={
              <RutaPorPermiso permiso="GESTIONAR_CATALOGOS">
                <PuntosRecogida />
              </RutaPorPermiso>
            }
          />
          {/* Documentos del conductor (propios): solo rol CONDUCTOR */}
          <Route
            path="mis-documentos"
            element={
              <RutaPorRol rol="CONDUCTOR">
                <Documentos />
              </RutaPorRol>
            }
          />
          {/* Documentos de un conductor (admin): solo GESTIONAR_USUARIOS */}
          <Route
            path="usuarios/:id/documentos"
            element={
              <RutaPorPermiso permiso="GESTIONAR_USUARIOS">
                <Documentos />
              </RutaPorPermiso>
            }
          />
          {/* Modulo de reservas: operadora (crea/despacha) o coordinador */}
          <Route
            path="reservas"
            element={
              <RutaPorPermiso permisos={['CREAR_RESERVAS', 'DESPACHAR_COLA']}>
                <Reservas />
              </RutaPorPermiso>
            }
          />
          <Route
            path="reservas/nuevo"
            element={
              <RutaPorPermiso permiso="CREAR_RESERVAS">
                <ReservaForm />
              </RutaPorPermiso>
            }
          />
          {/* Servicios del conductor (propios): solo rol CONDUCTOR */}
          <Route
            path="mis-servicios"
            element={
              <RutaPorRol rol="CONDUCTOR">
                <MisServicios />
              </RutaPorRol>
            }
          />
          {/* Historial de servicios: solo DESPACHAR_COLA (operadora/admin) */}
          <Route
            path="servicios-historial"
            element={
              <RutaPorPermiso permiso="DESPACHAR_COLA">
                <Servicios />
              </RutaPorPermiso>
            }
          />
          {/* Servicios del conductor: solo rol CONDUCTOR */}
          <Route
            path="servicios"
            element={
              <RutaPorRol rol="CONDUCTOR">
                <ServiciosConductor />
              </RutaPorRol>
            }
          />
          {/* Los modulos futuros (flota...) se agregan aqui. */}
        </Route>

        {/* Cualquier otra ruta -> redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
