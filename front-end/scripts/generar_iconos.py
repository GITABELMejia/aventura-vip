# ============================================================================
# GENERADOR DE ICONOS PWA - AVENTURA VIP DE CUSCO
# ----------------------------------------------------------------------------
# Genera los iconos instalables de la PWA con los colores oficiales de la
# empresa: marron chocolate #3D271C (fondo) + dorado ambar #C17C26 (monograma).
#
# Salidas (front-end/public/):
#   icono-192x192.png  -> PWA / favicon
#   icono-512x512.png  -> PWA
#   icono-mascara.png  -> PWA (maskable, con zona segura)
#   icono-apple.png    -> iOS "Anadir a pantalla de inicio" (180x180)
#
# Uso: python3 scripts/generar_iconos.py
# Requisito: pip install Pillow
# ============================================================================

import os
from PIL import Image, ImageDraw, ImageFont

# Colores oficiales de la empresa
CHOCOLATE = (61, 39, 28, 255)    # #3D271C
AMARILLO_AMBAR = (193, 124, 38, 255)  # #C17C26

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public')


def buscar_fuente_serif(tamano):
    """Intenta cargar una fuente serif elegante; cae a la predeterminada."""
    candidatas = [
        '/System/Library/Fonts/Supplemental/Georgia Bold.ttf',
        '/System/Library/Fonts/Supplemental/Georgia.ttf',
        '/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf',
        '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    ]
    for ruta in candidatas:
        if os.path.exists(ruta):
            try:
                return ImageFont.truetype(ruta, tamano)
            except OSError:
                continue
    return ImageFont.load_default()


def dibujar_icono(tamano, margen_porcentaje=0.0):
    """Icono cuadrado: fondo chocolate + aro dorado + monograma AV."""
    imagen = Image.new('RGBA', (tamano, tamano), CHOCOLATE)
    dibujo = ImageDraw.Draw(imagen)

    # Aro dorado exterior (se reduce con el margen de seguridad)
    margen = int(tamano * margen_porcentaje)
    grosor = max(2, int(tamano * 0.025))
    dibujo.ellipse(
        [margen + grosor, margen + grosor, tamano - margen - grosor, tamano - margen - grosor],
        outline=AMARILLO_AMBAR,
        width=grosor,
    )

    # Monograma "AV" centrado en serif
    tamano_letra = int(tamano * 0.34)
    fuente = buscar_fuente_serif(tamano_letra)
    texto = 'AV'
    caja = dibujo.textbbox((0, 0), texto, font=fuente)
    ancho_texto = caja[2] - caja[0]
    alto_texto = caja[3] - caja[1]
    pos = (
        (tamano - ancho_texto) / 2 - caja[0],
        (tamano - alto_texto) / 2 - caja[1] + tamano * 0.02,
    )
    dibujo.text(pos, texto, font=fuente, fill=AMARILLO_AMBAR)

    return imagen


def main():
    os.makedirs(BASE_DIR, exist_ok=True)

    # Iconos estandar (monograma ocupa casi todo el lienzo)
    dibujar_icono(192).save(os.path.join(BASE_DIR, 'icono-192x192.png'))
    dibujar_icono(512).save(os.path.join(BASE_DIR, 'icono-512x512.png'))

    # Maskable: contenido dentro del 80% central (zona segura)
    dibujar_icono(512, margen_porcentaje=0.10).save(
        os.path.join(BASE_DIR, 'icono-mascara.png')
    )

    # iOS: cuadrado que iOS redondea automaticamente
    dibujar_icono(180).save(os.path.join(BASE_DIR, 'icono-apple.png'))

    print('Iconos generados en:', os.path.abspath(BASE_DIR))


if __name__ == '__main__':
    main()
