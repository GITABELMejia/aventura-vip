// ============================================================================
// PAGINA: MI PERFIL
// ----------------------------------------------------------------------------
// Muestra los datos de la sesion actual, junto con la foto de perfil.
// El usuario puede subir, reemplazar o eliminar su foto (se redimensiona a
// 256px en el cliente y se guarda en base64).
// ============================================================================

import { useRef, useState } from 'react';
import {
  Building2,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import {
  actualizarUsuarioSesion,
  leerUsuario,
} from '../services/auth.service';
import {
  quitarFotoPerfil,
  subirFotoPerfil,
} from '../services/usuarios.service';
import { redimensionarImagen } from '../utils/imagen';
import type { Usuario } from '../types';

export default function Perfil() {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario());
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const refArchivo = useRef<HTMLInputElement>(null);

  async function manejarSeleccion(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !usuario) return;

    setError('');
    setSubiendo(true);
    try {
      const { mime, base64 } = await redimensionarImagen(archivo);
      await subirFotoPerfil(usuario.id, { mime, contenido_b64: base64 });
      const actualizado = { ...usuario, foto_b64: base64, foto_mime: mime };
      setUsuario(actualizado);
      actualizarUsuarioSesion(actualizado);
    } catch {
      setError('No se pudo subir la foto de perfil.');
    } finally {
      setSubiendo(false);
    }
  }

  async function manejarEliminar() {
    if (!usuario) return;
    setError('');
    try {
      await quitarFotoPerfil(usuario.id);
      const actualizado = { ...usuario, foto_b64: null, foto_mime: null };
      setUsuario(actualizado);
      actualizarUsuarioSesion(actualizado);
    } catch {
      setError('No se pudo eliminar la foto de perfil.');
    }
  }

  const campos = [
    { icono: User, etiqueta: 'Nombres', valor: `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}` },
    { icono: Mail, etiqueta: 'Correo', valor: usuario?.correo ?? '—' },
    { icono: KeyRound, etiqueta: 'DNI', valor: usuario?.dni ?? '—' },
    { icono: Phone, etiqueta: 'Telefono', valor: usuario?.telefono ?? '—' },
    { icono: Building2, etiqueta: 'Empresa', valor: usuario?.empresa ?? 'Particular' },
    { icono: MapPin, etiqueta: 'Propiedad', valor: usuario?.establecimiento ?? 'Sin propiedad' },
    { icono: MapPin, etiqueta: 'Grupo', valor: usuario?.area ?? 'Sin grupo asignado' },
    { icono: ShieldCheck, etiqueta: 'Rol', valor: usuario?.rol ?? '—' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Datos de tu cuenta y permisos asignados.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          Foto de perfil
        </h2>
        <div className="flex flex-wrap items-center gap-5">
          {usuario?.foto_b64 ? (
            <img
              src={`data:${usuario.foto_mime ?? 'image/jpeg'};base64,${usuario.foto_b64}`}
              alt="Foto de perfil"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-dorado-500 to-dorado-700 text-2xl font-bold text-black"
              aria-hidden="true"
            >
              {usuario
                ? `${usuario.nombres?.[0] ?? ''}${usuario.apellidos?.[0] ?? ''}`.toUpperCase()
                : 'AV'}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              ref={refArchivo}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={manejarSeleccion}
              className="hidden"
            />
            <Button
              onClick={() => refArchivo.current?.click()}
              iconoIzq={Upload}
              cargando={subiendo}
              textoCargando="Subiendo..."
            >
              {usuario?.foto_b64 ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {usuario?.foto_b64 && (
              <Button variante="ghost" onClick={manejarEliminar}>
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                Eliminar foto
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          Datos personales
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {campos.map((campo) => {
            const Icono = campo.icono;
            return (
              <div key={campo.etiqueta} className="flex items-start gap-3">
                <div className="rounded-lg bg-dorado-500/10 p-2 text-dorado-600 dark:text-dorado-400">
                  <Icono className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-gray-400 dark:text-hueso-500">
                    {campo.etiqueta}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-800 dark:text-hueso-100">
                    {campo.valor}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          Permisos
        </h2>
        {usuario?.permisos?.length ? (
          <div className="flex flex-wrap gap-2">
            {usuario.permisos.map((permiso) => (
              <span
                key={permiso}
                className="flex items-center gap-1 rounded-full bg-dorado-500/10 px-3 py-1 text-xs font-medium text-dorado-600 dark:text-dorado-400"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {permiso}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-hueso-500">
            Sin permisos especiales.
          </p>
        )}
      </Card>
    </div>
  );
}