// ============================================================================
// PAGINA: FORMULARIO DE USUARIO (CREAR / EDITAR) - UX PREMIUM
// ----------------------------------------------------------------------------
// Diseno centrado en la experiencia del usuario:
//   * Campos obligatorios con (*) dorado + nota explicativa al inicio.
//   * Una sola columna, agrupada por secciones logicas (datos personales,
//     contacto, organizacion y acceso, contrasena, permisos).
//   * Etiquetas en lenguaje natural + texto de ayuda + placeholders con
//     ejemplos de formato.
//   * Validacion en tiempo real con mensajes especificos y constructivos.
//   * Checklist de requisitos de contrasena en vivo.
//   * Accesibilidad: fuentes de 16px en movil, contraste AA, teclado.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Save, Trash2, Upload } from 'lucide-react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CampoFormulario from '../components/CampoFormulario';
import AlertaError from '../components/ui/AlertaError';
import { presetDeRol } from '../config/presets';
import {
  actualizarUsuario,
  crearUsuario,
  obtenerCatalogos,
  obtenerUsuario,
  quitarFotoPerfil,
  subirFotoPerfil,
} from '../services/usuarios.service';
import { redimensionarImagen } from '../utils/imagen';
import type {
  Catalogos,
  PeticionActualizarUsuario,
  PeticionCrearUsuario,
} from '../types';
import { usePermisos } from '../hooks/usePermisos';

// ----------------------------------------------------------------------------
// VALIDACION (mensajes especificos y constructivos)
// ----------------------------------------------------------------------------
interface Errores {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  correo?: string;
  telefono?: string;
  rol?: string;
  establecimiento?: string;
  area?: string;
  clave?: string;
}

const VALIDAR_CORREO = /^\S+@\S+\.\S+$/;
const VALIDAR_DNI = /^\d{8}$/;
const VALIDAR_TELEFONO = /^[\d\s+()-]{7,15}$/;

function validarCampo(
  campo: keyof Errores,
  valor: string,
  contexto: {
    esEdicion: boolean;
    cambiarClave: boolean;
    esPublico: boolean;
    requiereEstablecimiento: boolean;
  }
): string | undefined {
  switch (campo) {
    case 'nombres':
      if (!valor.trim()) return 'Ingresa el nombre completo.';
      if (valor.trim().length < 3)
        return 'El nombre debe tener al menos 3 caracteres.';
      return undefined;
    case 'apellidos':
      if (!valor.trim()) return 'Ingresa los apellidos.';
      if (valor.trim().length < 3)
        return 'Los apellidos deben tener al menos 3 caracteres.';
      return undefined;
    case 'dni':
      // Los trabajadores (Aventura/hoteles) SIEMPRE inician sesion con DNI.
      if (!contexto.esPublico) {
        if (!valor.trim()) return 'El DNI es obligatorio: es el usuario de acceso.';
        if (!VALIDAR_DNI.test(valor.trim()))
          return 'El DNI debe tener exactamente 8 digitos (ej: 45678901).';
      }
      return undefined;
    case 'correo':
      // La app publica (Particular) accede con su correo electronico.
      if (contexto.esPublico) {
        if (!valor.trim()) return 'El correo es obligatorio: es el usuario de acceso.';
        if (!VALIDAR_CORREO.test(valor.trim()))
          return 'Ingresa un correo valido (ej: juan.perez@belmond.com).';
      } else if (valor.trim() && !VALIDAR_CORREO.test(valor.trim())) {
        return 'Ingresa un correo valido (ej: juan.perez@belmond.com).';
      }
      return undefined;
    case 'telefono':
      if (!valor.trim()) return undefined;
      if (!VALIDAR_TELEFONO.test(valor.trim()))
        return 'El telefono debe tener entre 7 y 15 digitos.';
      return undefined;
    case 'rol':
      if (!valor) return 'Selecciona un rol para el usuario.';
      return undefined;
    case 'establecimiento':
      if (contexto.requiereEstablecimiento && !valor)
        return 'Selecciona la propiedad (hotel, tren, barco, etc.).';
      return undefined;
    case 'area':
      if (contexto.requiereEstablecimiento && !valor)
        return 'Selecciona el grupo de la propiedad.';
      return undefined;
    case 'clave':
      if (!contexto.esEdicion || contexto.cambiarClave) {
        if (!valor) return 'Ingresa una contrasena.';
        if (valor.length < 6)
          return 'La contrasena debe tener al menos 6 caracteres.';
        if (!/[A-Za-z]/.test(valor) || !/\d/.test(valor))
          return 'La contrasena debe combinar letras y numeros.';
      }
      return undefined;
    default:
      return undefined;
  }
}

// ----------------------------------------------------------------------------
// COMPONENTE: TEXTO DE AYUDA
// ----------------------------------------------------------------------------
function Ayuda({ children }: { children: string }) {
  return (
    <p className="mt-1.5 text-xs text-gray-400 dark:text-hueso-500">
      {children}
    </p>
  );
}

// ----------------------------------------------------------------------------
// COMPONENTE: ENCABEZADO DE SECCION
// ----------------------------------------------------------------------------
function TituloSeccion({ numero, texto }: { numero: string; texto: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-hueso-100">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dorado-500/15 text-xs font-bold text-dorado-600 dark:text-dorado-400">
        {numero}
      </span>
      {texto}
    </h2>
  );
}

export default function UsuarioForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const esEdicion = Boolean(id);
  const { tienePermiso } = usePermisos();

  // Rol pre-seleccionado por la URL (ej. /usuarios/nuevo?rol=CONDUCTOR).
  const rolDesdeUrl = searchParams.get('rol');

  // La operadora (solo CREAR_USUARIOS) solo puede crear/editar clientes.
  const gestionCompleta = tienePermiso('GESTIONAR_USUARIOS');

  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Campos del formulario.
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rolId, setRolId] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [puedeReservar, setPuedeReservar] = useState(false);
  const [clave, setClave] = useState('');
  const [cambiarClave, setCambiarClave] = useState(false);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);

  // Foto de perfil (opcional, gestiona el admin).
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [fotoActual, setFotoActual] = useState<{ b64: string; mime: string } | null>(null);
  const [eliminarFoto, setEliminarFoto] = useState(false);
  const refFoto = useRef<HTMLInputElement>(null);

  // Estado de validacion: errores + campos ya visitados (para tiempo real).
  const [errores, setErrores] = useState<Errores>({});
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [claveEnfocada, setClaveEnfocada] = useState(false);

  const refPrimerCampo = useRef<HTMLInputElement>(null);

  // La empresa "Particular" corresponde a la app publica (acceso por correo);
  // el resto de empresas (Aventura Vip, Belmond) acceden con DNI.
  const esPublico = useMemo(() => {
    const empresa = catalogos?.empresas.find(
      (e) => String(e.id) === empresaId
    );
    return empresa?.nombre === 'Particular';
  }, [catalogos, empresaId]);

  // Establecimientos de la empresa elegida (nivel 2 de la cascada).
  const establecimientosDeEmpresa = useMemo(
    () =>
      catalogos?.establecimientos.filter(
        (e) => String(e.empresa_id) === empresaId
      ) ?? [],
    [catalogos, empresaId]
  );

  // Regla de obligatoriedad: si la empresa tiene establecimientos, se debe
  // elegir establecimiento y area (clientes de hoteles, tiendas, etc.).
  const requiereEstablecimiento = establecimientosDeEmpresa.length > 0;

  const contextoValidacion = {
    esEdicion,
    cambiarClave,
    esPublico,
    requiereEstablecimiento,
  };

  const rolSeleccionado = useMemo(
    () => catalogos?.roles.find((r) => String(r.id) === rolId),
    [catalogos, rolId]
  );

  const areasDeEmpresa = useMemo(
    () =>
      catalogos?.areas.filter(
        (a) => String(a.establecimiento_id) === establecimientoId
      ) ?? [],
    [catalogos, establecimientoId]
  );

  // Roles disponibles: la operadora solo puede elegir USUARIO (clientes).
  const rolesDisponibles = useMemo(
    () =>
      gestionCompleta
        ? (catalogos?.roles ?? [])
        : (catalogos?.roles.filter((r) => r.nombre === 'USUARIO') ?? []),
    [catalogos, gestionCompleta]
  );

  // Si la operadora abre el formulario, forzar rol USUARIO.
  useEffect(() => {
    if (!gestionCompleta && rolesDisponibles.length === 1 && !rolId) {
      setRolId(String(rolesDisponibles[0].id));
      setPermisosSeleccionados(presetDeRol('USUARIO'));
    }
  }, [gestionCompleta, rolesDisponibles, rolId]);

  // Checklist de requisitos de la contrasena (en vivo).
  const requisitosClave = useMemo(
    () => [
      { texto: 'Al menos 6 caracteres', cumple: clave.length >= 6 },
      { texto: 'Al menos una letra', cumple: /[A-Za-z]/.test(clave) },
      { texto: 'Al menos un numero', cumple: /\d/.test(clave) },
    ],
    [clave]
  );
  const fortalezaClave =
    requisitosClave.filter((r) => r.cumple).length / requisitosClave.length;

  // --------------------------------------------------------------------------
  // Carga de catalogos + datos en modo edicion.
  // --------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const catalogo = await obtenerCatalogos();
        setCatalogos(catalogo);

        if (esEdicion && id) {
          const usuario = await obtenerUsuario(Number(id));
          setNombres(usuario.nombres);
          setApellidos(usuario.apellidos);
          setDni(usuario.dni ?? '');
          setCorreo(usuario.correo ?? '');
          setTelefono(usuario.telefono ?? '');
          setRolId(String(usuario.rol_id));
          setEmpresaId(usuario.empresa_id ? String(usuario.empresa_id) : '');
          setEstablecimientoId(
            usuario.establecimiento_id ? String(usuario.establecimiento_id) : ''
          );
          setAreaId(usuario.area_id ? String(usuario.area_id) : '');
          setPuedeReservar(usuario.puede_reservar);
          setPermisosSeleccionados(usuario.permisos);
          if (usuario.foto_b64) {
            setFotoActual({
              b64: usuario.foto_b64,
              mime: usuario.foto_mime ?? 'image/jpeg',
            });
          }
        } else if (rolDesdeUrl) {
          // Pre-seleccionar el rol indicado en la URL al crear.
          const rol = catalogo.roles.find((r) => r.nombre === rolDesdeUrl);
          if (rol) {
            setRolId(String(rol.id));
            setPermisosSeleccionados(presetDeRol(rol.nombre));
          }
        }
      } catch {
        setError('No se pudieron cargar los datos del formulario.');
      } finally {
        setCargando(false);
      }
    })();
  }, [esEdicion, id, rolDesdeUrl]);

  // --------------------------------------------------------------------------
  // Validacion en tiempo real: al escribir (si el campo fue tocado) y al salir.
  // --------------------------------------------------------------------------
  function marcarTocado(campo: string) {
    setTocados((t) => ({ ...t, [campo]: true }));
  }

  function actualizarCampo(
    campo: keyof Errores,
    valor: string,
    setter: (v: string) => void
  ) {
    setter(valor);
    if (tocados[campo]) {
      setErrores((e) => ({
        ...e,
        [campo]: validarCampo(campo, valor, contextoValidacion),
      }));
    }
  }

  function validarTodo(): Errores {
    const nuevos: Errores = {};
    const valores: Record<string, string> = {
      nombres,
      apellidos,
      dni,
      correo,
      telefono,
      rol: rolId,
      establecimiento: establecimientoId,
      area: areaId,
      clave,
    };
    const campos: (keyof Errores)[] = [
      'nombres',
      'apellidos',
      'dni',
      'correo',
      'telefono',
      'rol',
      'establecimiento',
      'area',
      'clave',
    ];
    for (const campo of campos) {
      const errorCampo = validarCampo(campo, valores[campo] ?? '', contextoValidacion);
      if (errorCampo) nuevos[campo] = errorCampo;
    }
    return nuevos;
  }

  // --------------------------------------------------------------------------
  // Cambio de rol: aplica el preset de permisos recomendado.
  // --------------------------------------------------------------------------
  function manejarRol(nuevoRolId: string) {
    setRolId(nuevoRolId);
    const rol = catalogos?.roles.find((r) => String(r.id) === nuevoRolId);
    if (rol) {
      setPermisosSeleccionados(presetDeRol(rol.nombre));
    }
    if (tocados.rol) {
      setErrores((e) => ({
        ...e,
        rol: validarCampo('rol', nuevoRolId, contextoValidacion),
      }));
    }
  }

  function alternarPermiso(codigo: string) {
    setPermisosSeleccionados((actuales) =>
      actuales.includes(codigo)
        ? actuales.filter((c) => c !== codigo)
        : [...actuales, codigo]
    );
  }

  // --------------------------------------------------------------------------
  // ENVIO: valida todo, enfoca el primer campo con error y guarda.
  // --------------------------------------------------------------------------
  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();
    setError('');

    // Marcar todos los campos como tocados y validar.
    const todosTocados = {
      nombres: true,
      apellidos: true,
      dni: true,
      correo: true,
      telefono: true,
      rol: true,
      clave: true,
    };
    setTocados(todosTocados);

    const nuevosErrores = validarTodo();
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      const primerCampo = (Object.keys(nuevosErrores) as (keyof Errores)[])[0];
      // El DNI y el nombre son los primeros campos visibles: enfocar el que
      // corresponda (o el primero de la lista).
      if (primerCampo === 'dni' || primerCampo === 'nombres') {
        refPrimerCampo.current?.focus();
      }
      setError(
        'Revisa los campos marcados en rojo: completa o corrige la informacion para continuar.'
      );
      return;
    }

    setGuardando(true);
    try {
      const base = {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim() || undefined,
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        rol_id: Number(rolId),
        empresa_id: empresaId ? Number(empresaId) : null,
        area_id: areaId ? Number(areaId) : null,
        puede_reservar: puedeReservar,
        permisos: permisosSeleccionados,
      };

      let objetivoId = id ? Number(id) : 0;
      if (esEdicion && id) {
        const peticion: PeticionActualizarUsuario = {
          ...base,
          clave_nueva: cambiarClave ? clave : undefined,
        };
        await actualizarUsuario(Number(id), peticion);
        objetivoId = Number(id);
      } else {
        const peticion: PeticionCrearUsuario = {
          ...base,
          clave,
        };
        const creado = await crearUsuario(peticion);
        objetivoId = creado.id;
      }

      // Foto de perfil (opcional): reemplazar o eliminar.
      if (eliminarFoto && objetivoId) {
        await quitarFotoPerfil(objetivoId);
      } else if (fotoArchivo && objetivoId) {
        const { mime, base64 } = await redimensionarImagen(fotoArchivo);
        await subirFotoPerfil(objetivoId, { mime, contenido_b64: base64 });
      }

      navigate('/usuarios');
    } catch (err) {
      const mensaje =
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo guardar el usuario.';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16 text-sm text-gray-500 dark:text-hueso-500">
        Cargando formulario...
      </div>
    );
  }

  const requiereClave = !esEdicion || cambiarClave;
  const mostrarChecklist = requiereClave && (claveEnfocada || clave.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            {esEdicion ? 'Editar usuario' : 'Crear cuenta'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Completa los datos para {esEdicion ? 'actualizar la cuenta' : 'dar de alta una nueva cuenta'} en el sistema.
          </p>
        </div>
        <Button
          variante="ghost"
          onClick={() => navigate('/usuarios')}
          iconoIzq={ArrowLeft}
        >
          Volver
        </Button>
      </div>

      {/* Nota de campos obligatorios */}
      <p
        className="rounded-xl border border-dorado-500/20 bg-dorado-500/5 px-4 py-3 text-sm text-gray-600 dark:text-hueso-300"
        aria-label="Nota sobre campos obligatorios"
      >
        Los campos marcados con <span className="font-bold text-dorado-500">(*)</span>{' '}
        son obligatorios.
      </p>

      {error && <AlertaError mensaje={error} />}

      <form onSubmit={manejarEnvio} className="space-y-6" noValidate>
        {/* ===================== 1. DATOS PERSONALES ===================== */}
        <Card>
          <TituloSeccion numero="1" texto="Datos personales" />
          <div className="space-y-5">
            <div>
              <CampoFormulario
                ref={refPrimerCampo}
                id="dni"
                etiqueta="DNI"
                valor={dni}
                onChange={(v) => actualizarCampo('dni', v, setDni)}
                onBlur={() => marcarTocado('dni')}
                placeholder="Ej: 45678901 (8 digitos)"
                autocompletar="off"
                required={!esPublico}
                inputmode="numeric"
                estado={errores.dni ? 'error' : 'default'}
                mensajeError={errores.dni}
                className="text-base"
              />
              <Ayuda>
                {esPublico
                  ? 'Opcional para la app publica (accedera con su correo).'
                  : 'Obligatorio: es el usuario de acceso al sistema.'}
              </Ayuda>
            </div>
            <div>
              <CampoFormulario
                id="nombres"
                etiqueta="Nombre completo"
                valor={nombres}
                onChange={(v) => actualizarCampo('nombres', v, setNombres)}
                onBlur={() => marcarTocado('nombres')}
                placeholder="Ej: Juan Carlos"
                required
                estado={errores.nombres ? 'error' : 'default'}
                mensajeError={errores.nombres}
                className="text-base"
              />
              <Ayuda>Como figura en su documento de identidad.</Ayuda>
            </div>
            <div>
              <CampoFormulario
                id="apellidos"
                etiqueta="Apellidos"
                valor={apellidos}
                onChange={(v) => actualizarCampo('apellidos', v, setApellidos)}
                onBlur={() => marcarTocado('apellidos')}
                placeholder="Ej: Perez Gomez"
                required
                estado={errores.apellidos ? 'error' : 'default'}
                mensajeError={errores.apellidos}
                className="text-base"
              />
            </div>
          </div>
        </Card>

        {/* ================= 2. INFORMACION DE CONTACTO ================= */}
        <Card>
          <TituloSeccion numero="2" texto="Informacion de contacto" />
          <div className="space-y-5">
            <div>
              <CampoFormulario
                id="correo"
                etiqueta="Correo electronico"
                valor={correo}
                onChange={(v) => actualizarCampo('correo', v, setCorreo)}
                onBlur={() => marcarTocado('correo')}
                placeholder="Ej: juan.perez@belmond.com"
                tipo="email"
                autocompletar="off"
                required={esPublico}
                estado={errores.correo ? 'error' : 'default'}
                mensajeError={errores.correo}
                className="text-base"
              />
              <Ayuda>
                {esPublico
                  ? 'Obligatorio: es el usuario de acceso de la app publica.'
                  : 'Los trabajadores inician sesion con su DNI; el correo es informativo.'}
              </Ayuda>
            </div>
            <div>
              <CampoFormulario
                id="telefono"
                etiqueta="Telefono"
                valor={telefono}
                onChange={(v) => actualizarCampo('telefono', v, setTelefono)}
                onBlur={() => marcarTocado('telefono')}
                placeholder="Ej: 999 999 999"
                autocompletar="off"
                estado={errores.telefono ? 'error' : 'default'}
                mensajeError={errores.telefono}
                className="text-base"
              />
              <Ayuda>Incluye el indicativo si aplica (ej: +51 999 999 999).</Ayuda>
            </div>
          </div>
        </Card>

        {/* ============ 3. ORGANIZACION Y ACCESO ============ */}
        <Card>
          <TituloSeccion numero="3" texto="Organizacion y acceso" />
          <div className="space-y-5">
            <div>
              <label
                htmlFor="rol"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200"
              >
                Rol <span className="ml-1 text-dorado-500">*</span>
              </label>
              <select
                id="rol"
                value={rolId}
                onChange={(e) => manejarRol(e.target.value)}
                onBlur={() => marcarTocado('rol')}
                required
                disabled={!gestionCompleta}
                aria-invalid={Boolean(errores.rol)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-base text-gray-800 outline-none transition focus:border-dorado-400/60 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 ${
                  errores.rol
                    ? 'border-coral-500/70 ring-2 ring-coral-500/10'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <option value="">Selecciona un rol</option>
                {rolesDisponibles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
              {errores.rol ? (
                <p
                  id="rol-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-500"
                  role="alert"
                >
                  {errores.rol}
                </p>
              ) : (
                <Ayuda>
                  {rolSeleccionado?.descripcion ??
                    'Define que puede hacer y pre-marca sus permisos recomendados.'}
                </Ayuda>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="empresa"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200"
                >
                  Empresa
                </label>
                <select
                  id="empresa"
                  value={empresaId}
                  onChange={(e) => {
                    setEmpresaId(e.target.value);
                    setEstablecimientoId('');
                    setAreaId('');
                  }}
                  onBlur={() => marcarTocado('empresa')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
                >
                  <option value="">Sin empresa</option>
                  {catalogos?.empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="establecimiento"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200"
                >
                  Propiedad{' '}
                  {requiereEstablecimiento && (
                    <span className="ml-1 text-dorado-500">*</span>
                  )}
                </label>
                <select
                  id="establecimiento"
                  value={establecimientoId}
                  onChange={(e) => {
                    setEstablecimientoId(e.target.value);
                    setAreaId('');
                  }}
                  onBlur={() => marcarTocado('establecimiento')}
                  disabled={!empresaId || establecimientosDeEmpresa.length === 0}
                  aria-invalid={Boolean(errores.establecimiento)}
                  className={`w-full rounded-xl border bg-white px-3 py-3 text-base text-gray-800 outline-none transition focus:border-dorado-400/60 disabled:opacity-50 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 ${
                    errores.establecimiento
                      ? 'border-coral-500/70 ring-2 ring-coral-500/10'
                      : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <option value="">Sin propiedad</option>
                  {establecimientosDeEmpresa.map((establecimiento) => (
                    <option key={establecimiento.id} value={establecimiento.id}>
                      {establecimiento.nombre}
                    </option>
                  ))}
                </select>
                {errores.establecimiento ? (
                  <p
                    className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-500"
                    role="alert"
                  >
                    {errores.establecimiento}
                  </p>
                ) : (
                  <Ayuda>
                    {requiereEstablecimiento
                      ? 'Propiedad de la empresa (hotel, tren, barco...).'
                      : 'Esta empresa no tiene propiedades registradas.'}
                  </Ayuda>
                )}
              </div>

              <div>
                <label
                  htmlFor="area"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200"
                >
                  Grupo{' '}
                  {requiereEstablecimiento && (
                    <span className="ml-1 text-dorado-500">*</span>
                  )}
                </label>
                <select
                  id="area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  onBlur={() => marcarTocado('area')}
                  disabled={!establecimientoId || areasDeEmpresa.length === 0}
                  aria-invalid={Boolean(errores.area)}
                  className={`w-full rounded-xl border bg-white px-3 py-3 text-base text-gray-800 outline-none transition focus:border-dorado-400/60 disabled:opacity-50 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 ${
                    errores.area
                      ? 'border-coral-500/70 ring-2 ring-coral-500/10'
                      : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <option value="">Sin grupo</option>
                  {areasDeEmpresa.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </select>
                {errores.area ? (
                  <p
                    className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-500"
                    role="alert"
                  >
                    {errores.area}
                  </p>
                ) : (
                  <Ayuda>Cocina, A&B, SPA, Front Office, Housekeeping, etc.</Ayuda>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700 transition-colors hover:border-dorado-400/40 dark:border-white/10 dark:text-hueso-200">
              <input
                type="checkbox"
                checked={puedeReservar}
                onChange={(e) => setPuedeReservar(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#C17C26]"
              />
              <span>
                <span className="block font-medium">
                  Puede reservar viajes
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-hueso-500">
                  Si lo marcas, este cliente podra crear reservas desde su
                  cuenta. Para los coordinadores o jefes de area que solicitan
                  viajes para su equipo.
                </span>
              </span>
            </label>
          </div>
        </Card>

        {/* ================= 4. CONTRASENA ================= */}
        <Card>
          <TituloSeccion numero="4" texto="Contrasena" />
          <div className="space-y-4">
            {esEdicion && (
              <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-hueso-200">
                <input
                  type="checkbox"
                  checked={cambiarClave}
                  onChange={(e) => {
                    setCambiarClave(e.target.checked);
                    if (!e.target.checked) setClave('');
                  }}
                  className="h-4 w-4 accent-[#C17C26]"
                />
                Cambiar la contrasena
              </label>
            )}

            <CampoFormulario
              id="clave"
              etiqueta={
                esEdicion && !cambiarClave
                  ? 'Contrasena actual (se conserva)'
                  : 'Contrasena'
              }
              valor={clave}
              onChange={(v) => actualizarCampo('clave', v, setClave)}
              onBlur={() => marcarTocado('clave')}
              onFocus={() => setClaveEnfocada(true)}
              placeholder="Crea una contrasena segura"
              tipo="password"
              permiteRevelar
              required={!esEdicion}
              deshabilitado={esEdicion && !cambiarClave}
              estado={errores.clave ? 'error' : 'default'}
              mensajeError={errores.clave}
              className="text-base"
            />

            {/* Checklist de requisitos en vivo */}
            {mostrarChecklist && (
              <ul
                className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                aria-label="Requisitos de la contrasena"
              >
                {requisitosClave.map((requisito) => (
                  <li
                    key={requisito.texto}
                    className={`flex items-center gap-2 text-sm ${
                      requisito.cumple
                        ? 'text-esmeralda-500'
                        : 'text-gray-500 dark:text-hueso-500'
                    }`}
                  >
                    {requisito.cumple ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4" aria-hidden="true" />
                    )}
                    {requisito.texto}
                  </li>
                ))}
              </ul>
            )}

            {/* Indicador de fortaleza */}
            {requiereClave && clave.length > 0 && (
              <div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(fortalezaClave * 100)}
                  aria-label="Fortaleza de la contrasena"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      fortalezaClave <= 0.34
                        ? 'bg-coral-500'
                        : fortalezaClave <= 0.67
                          ? 'bg-dorado-500'
                          : 'bg-esmeralda-500'
                    }`}
                    style={{ width: `${fortalezaClave * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-hueso-500">
                  {fortalezaClave <= 0.34
                    ? 'Contrasena debil'
                    : fortalezaClave <= 0.67
                      ? 'Contrasena aceptable'
                      : 'Contrasena segura'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ================= 5. PERMISOS ================= */}
        <Card>
          <TituloSeccion numero="5" texto="Permisos de acceso" />
          <p className="mb-4 text-sm text-gray-500 dark:text-hueso-400">
            Marca los modulos a los que puede acceder esta cuenta. Elegir un
            rol pre-marca el conjunto recomendado; puedes ajustarlo libremente.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalogos?.permisos.map((permiso) => (
              <label
                key={permiso.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-dorado-400/40 dark:border-white/10"
              >
                <input
                  type="checkbox"
                  checked={permisosSeleccionados.includes(permiso.codigo)}
                  onChange={() => alternarPermiso(permiso.codigo)}
                  className="mt-0.5 h-4 w-4 accent-[#C17C26]"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-hueso-100">
                    {permiso.codigo}
                  </span>
                  {permiso.descripcion && (
                    <span className="block text-xs text-gray-500 dark:text-hueso-500">
                      {permiso.descripcion}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </Card>

        {/* ================= 6. FOTO DE PERFIL ================= */}
        <Card>
          <TituloSeccion numero="6" texto="Foto de perfil (opcional)" />
          <div className="flex flex-wrap items-center gap-5">
            {eliminarFoto ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-coral-500/10 text-xs font-semibold text-coral-500">
                Se eliminará
              </div>
            ) : fotoActual?.b64 ? (
              <img
                src={`data:${fotoActual.mime};base64,${fotoActual.b64}`}
                alt="Foto de perfil actual"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400 dark:bg-white/5">
                Sin foto
              </div>
            )}

            <div className="flex flex-col gap-2">
              <input
                ref={refFoto}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFotoArchivo(e.target.files?.[0] ?? null);
                  setEliminarFoto(false);
                }}
                className="hidden"
              />
              <Button
                variante="outline"
                onClick={() => refFoto.current?.click()}
                iconoIzq={Upload}
              >
                Seleccionar foto
              </Button>
              {fotoArchivo && (
                <p className="truncate text-xs text-dorado-600 dark:text-dorado-400">
                  Nueva: {fotoArchivo.name}
                </p>
              )}
              {fotoActual?.b64 && !eliminarFoto && (
                <Button
                  variante="ghost"
                  onClick={() => {
                    setEliminarFoto(true);
                    setFotoArchivo(null);
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  Quitar foto
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* ================= ACCION FINAL ================= */}
        <div className="space-y-4">
          <Button
            type="submit"
            tono="dorado"
            tamano="lg"
            cargando={guardando}
            textoCargando={esEdicion ? 'Guardando...' : 'Creando cuenta...'}
            iconoDer={Save}
            className="w-full text-base"
          >
            {esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-xs text-gray-400 dark:text-hueso-500">
            Al crear la cuenta aceptas los{' '}
            <a
              href="#terminos"
              onClick={(e) => e.preventDefault()}
              className="enlace-discreto"
            >
              terminos de servicio
            </a>{' '}
            y la{' '}
            <a
              href="#privacidad"
              onClick={(e) => e.preventDefault()}
              className="enlace-discreto"
            >
              politica de privacidad
            </a>
            .
          </p>
        </div>
      </form>
    </div>
  );
}
