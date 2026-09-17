// ============================================================================
// UTILIDAD: REDIMENSIONAR IMAGEN EN EL CLIENTE
// ----------------------------------------------------------------------------
// Reduce una imagen a un tamano maximo (por defecto 256px) y la convierte a
// JPEG en base64. Se usa para la foto de perfil: mantiene la BD y el
// localStorage livianos.
// ============================================================================

export interface ImagenRedimensionada {
  mime: string;
  base64: string;
}

/**
 * Redimensiona una imagen a `tamanoMax` px manteniendo la proporcion.
 * Devuelve { mime: 'image/jpeg', base64 } listo para subir a la API.
 */
export function redimensionarImagen(
  archivo: File,
  tamanoMax = 256
): Promise<ImagenRedimensionada> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.onload = () => {
        const { width, height } = img;
        const escala = Math.min(1, tamanoMax / Math.max(width, height));
        const w = Math.max(1, Math.round(width * escala));
        const h = Math.max(1, Math.round(height * escala));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no disponible'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({ mime: 'image/jpeg', base64 });
      };
      img.src = lector.result as string;
    };
    lector.readAsDataURL(archivo);
  });
}