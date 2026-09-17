// ============================================================================
// PAGINA: USUARIOS (LISTADO Y GESTION)
// ----------------------------------------------------------------------------
// Tabla de usuarios con busqueda (nombre/correo/DNI), filtros por rol y
// estado, y acciones: nuevo, editar, activar/inactivar.
// Requiere el permiso GESTIONAR_USUARIOS (ruta protegida + backend).
// ============================================================================

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Pencil,
  Plus,
  Search,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  KeyRound,
  FileImage,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import Loader from '../components/Loader';
import {
  cambiarEstadoUsuario,
  listarUsuarios,
  resetearClave,
} from '../services/usuarios.service';
import type { Catalogos, UsuarioGestion } from '../types';
import { obtenerCatalogos } from '../services/usuarios.service';
import { usePermisos } from '../hooks/usePermisos';

export default function Usuarios() {
  const navigate = useNavigate();
  const { tienePermiso } = usePermisos();
  const [searchParams] = useSearchParams();

  // Gestion completa (admin) vs. solo creacion/edicion de clientes (operadora).
  const puedeGestionar = tienePermiso('GESTIONAR_USUARIOS');
  const puedeCrear = puedeGestionar || tienePermiso('CREAR_USUARIOS');

  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operandoId, setOperandoId] = useState<number | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const rolDesdeUrl = searchParams.get('rol') ?? '';
  const [filtroRol, setFiltroRol] = useState(rolDesdeUrl);
  const [filtroEstado, setFiltroEstado] = useState('');

  // Si cambia el ?rol= de la URL (navegar entre Conductores/Operadores),
  // se actualiza el filtro de rol.
  useEffect(() => {
    setFiltroRol(rolDesdeUrl);
  }, [rolDesdeUrl]);

  async function cargarDatos() {
    setCargando(true);
    setError('');
    try {
      const [lista, catalogo] = await Promise.all([
        listarUsuarios({
          q: busqueda,
          rol: filtroRol,
          estado: filtroEstado,
        }),
        obtenerCatalogos(),
      ]);
      setUsuarios(lista);
      setCatalogos(catalogo);
    } catch {
      setError('No se pudo cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  }

  // Carga inicial.
  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar un filtro, recargar.
  useEffect(() => {
    const temporizador = setTimeout(() => cargarDatos(), 300);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroRol, filtroEstado]);

  async function manejarEstado(usuario: UsuarioGestion) {
    setOperandoId(usuario.id);
    setError('');
    const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await cambiarEstadoUsuario(usuario.id, nuevoEstado);
      await cargarDatos();
    } catch {
      setError('No se pudo cambiar el estado del usuario.');
    } finally {
      setOperandoId(null);
    }
  }

  function nombreCompleto(usuario: UsuarioGestion) {
    return `${usuario.nombres} ${usuario.apellidos}`.trim();
  }

  function tituloVista(): string {
    if (filtroRol === 'CONDUCTOR') return 'Conductores';
    if (filtroRol === 'OPERADOR') return 'Operadores';
    return 'Usuarios';
  }

  async function manejarResetClave(usuario: UsuarioGestion) {
    setOperandoId(usuario.id);
    setError('');
    try {
      await resetearClave(usuario.id);
      await cargarDatos();
    } catch {
      setError('No se pudo resetear la contraseña.');
    } finally {
      setOperandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            {tituloVista()}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Gestiona las cuentas del sistema: personal de Aventura Vip y
            clientes de Belmond.
          </p>
        </div>
        {puedeCrear && (
          <Button
            onClick={() => navigate('/usuarios/nuevo')}
            tono="dorado"
            iconoIzq={Plus}
          >
            Nuevo usuario
          </Button>
        )}
      </div>

      {error && <AlertaError mensaje={error} />}

      {/* Filtros */}
      <Card className="!p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_160px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o DNI..."
              aria-label="Buscar usuarios"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 dark:placeholder:text-hueso-500"
            />
          </div>

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            aria-label="Filtrar por rol"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
          >
            <option value="">Todos los roles</option>
            {catalogos?.roles.map((rol) => (
              <option key={rol.id} value={rol.nombre}>
                {rol.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando usuarios..." />
        </div>
      ) : usuarios.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No hay usuarios que coincidan con la busqueda.
          </p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-white/10 dark:text-hueso-500">
                  <th className="px-5 py-3 font-semibold">Usuario</th>
                  <th className="px-5 py-3 font-semibold">DNI</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="hidden px-5 py-3 font-semibold md:table-cell">
                    Empresa / Grupo
                  </th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 dark:text-hueso-100">
                        {nombreCompleto(usuario)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-hueso-500">
                        {usuario.correo ?? 'Sin correo'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-hueso-300">
                      {usuario.dni ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-dorado-500/10 px-2.5 py-1 text-xs font-medium text-dorado-600 dark:text-dorado-400">
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">
                      {usuario.empresa ?? 'Particular'}
                      {usuario.area ? ` / ${usuario.area}` : ''}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          usuario.estado === 'ACTIVO'
                            ? 'bg-esmeralda-500/10 text-esmeralda-500'
                            : 'bg-coral-500/10 text-coral-500'
                        }`}
                      >
                        {usuario.estado === 'ACTIVO' ? (
                          <UserRoundCheck className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <UserRoundX className="h-3 w-3" aria-hidden="true" />
                        )}
                        {usuario.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {puedeCrear && (
                          <Link
                            to={`/usuarios/${usuario.id}/editar`}
                            aria-label={`Editar a ${nombreCompleto(usuario)}`}
                            title="Editar"
                            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-dorado-600 dark:text-hueso-500 dark:hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                        {puedeGestionar && usuario.rol === 'CONDUCTOR' && (
                          <Link
                            to={`/usuarios/${usuario.id}/documentos`}
                            aria-label={`Documentos de ${nombreCompleto(usuario)}`}
                            title="Documentos"
                            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-dorado-600 dark:text-hueso-500 dark:hover:bg-white/5"
                          >
                            <FileImage className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                        {puedeGestionar && (
                          <button
                            type="button"
                            onClick={() => manejarEstado(usuario)}
                            disabled={operandoId === usuario.id}
                            aria-label={
                              usuario.estado === 'ACTIVO'
                                ? `Inactivar a ${nombreCompleto(usuario)}`
                                : `Activar a ${nombreCompleto(usuario)}`
                            }
                            title={
                              usuario.estado === 'ACTIVO'
                                ? 'Inactivar'
                                : 'Activar'
                            }
                            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-coral-500 disabled:opacity-50 dark:text-hueso-500 dark:hover:bg-white/5"
                          >
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {puedeGestionar && (
                          <button
                            type="button"
                            onClick={() => manejarResetClave(usuario)}
                            disabled={operandoId === usuario.id}
                            aria-label={`Resetear contraseña de ${nombreCompleto(usuario)}`}
                            title="Resetear contraseña a 'AventuraCusco'"
                            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-coral-500 disabled:opacity-50 dark:text-hueso-500 dark:hover:bg-white/5"
                          >
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
