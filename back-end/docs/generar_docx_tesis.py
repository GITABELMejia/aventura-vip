#!/usr/bin/env python3
# ============================================================================
# GENERADOR DE WORD (.DOCX) DEL INFORME DE TESIS
# ----------------------------------------------------------------------------
# Convierte el informe de tesis HTML (docs/TESIS_INFORME.html) en un
# documento de Microsoft Word (docs/TESIS_INFORME.docx), preservando títulos,
# párrafos, listas, tablas y bloques de código.
#
# COMO USARLO:
#   python3 generar_docx_tesis.py
#
# RESULTADO:
#   Crea el archivo docs/TESIS_INFORME.docx
#
# REQUISITO:
#   pip3 install python-docx
# ============================================================================

import os
import re
from html.parser import HTMLParser

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

# ----------------------------------------------------------------------------
# Rutas de archivos.
# ----------------------------------------------------------------------------
CARPETA_ACTUAL = os.path.dirname(os.path.abspath(__file__))
HTML_ENTRADA = os.path.join(CARPETA_ACTUAL, "TESIS_INFORME.html")
DOCX_SALIDA = os.path.join(CARPETA_ACTUAL, "TESIS_INFORME.docx")

# Colores institucionales (RGB).
COLOR_PRIMARIO = RGBColor(0x3D, 0x27, 0x1C)
COLOR_GRIS = RGBColor(0x55, 0x55, 0x55)
COLOR_CODIGO = RGBColor(0x46, 0x50, 0x5A)

# Ancho de las tablas en el documento.
ANCHO_TABLA = Cm(16.5)


class HTML_a_DOCX(HTMLParser):
    """Convierte un HTML sencillo en un documento Word."""

    def __init__(self, doc: Document):
        super().__init__(convert_charrefs=True)
        self.doc = doc
        self.en_pre = False
        self.en_td = False
        self.en_th = False
        self.estilo_pre = ""

    # ------------------------------------------------------------------
    # Elementos de apertura
    # ------------------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        if tag == "div":
            # Fuerza un salto de página antes de cada sección grande.
            self.doc.add_page_break()
        elif tag == "h1":
            self.doc.add_heading("", level=1)
            self._aplicar_color_al_ultimo(COLOR_PRIMARIO)
        elif tag == "h2":
            self.doc.add_heading("", level=2)
            self._aplicar_color_al_ultimo(COLOR_PRIMARIO)
        elif tag == "h3":
            self.doc.add_heading("", level=3)
            self._aplicar_color_al_ultimo(COLOR_PRIMARIO)
        elif tag == "p":
            self.doc.add_paragraph()
        elif tag == "li":
            self.doc.add_paragraph(style="List Bullet")
        elif tag == "table":
            # Tabla nueva: se crea al cerrar la primera fila.
            self._tabla_actual = None
            self._num_filas_tabla = 0
        elif tag == "tr":
            # El número de columnas sale de la primera fila (cabecera).
            self._celdas_fila = []
            self._es_cabecera = self._num_filas_tabla == 0
        elif tag in ("td", "th"):
            self.en_td = True
            self.en_th = tag == "th"
            self._texto_celda = ""
        elif tag == "pre":
            self.en_pre = True
            self.estilo_pre = ""

    # ------------------------------------------------------------------
    # Texto
    # ------------------------------------------------------------------
    def handle_data(self, data):
        texto = data.strip("\n")
        if not texto.strip():
            return

        if self.en_td:
            # Acumulamos el contenido de la celda actual.
            self._texto_celda += texto
            return

        if self.en_pre:
            # Bloque de código: se agrega un párrafo con fuente Courier.
            p = self.doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(6)
            run = p.add_run(texto)
            run.font.name = "Courier New"
            run.font.size = Pt(8.5)
            run.font.color.rgb = COLOR_CODIGO
            return

        # Párrafo o título normal: se escribe el texto en el último párrafo.
        if self.doc.paragraphs:
            parrafo = self.doc.paragraphs[-1]
            run = parrafo.add_run(texto)
            run.font.size = Pt(11)

    # ------------------------------------------------------------------
    # Elementos de cierre
    # ------------------------------------------------------------------
    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self.en_td = False
            # Limpiamos caracteres de estilos HTML residuales.
            texto = re.sub(r"\s+", " ", self._texto_celda).strip()
            self._celdas_fila.append(texto)
        elif tag == "tr":
            if not hasattr(self, "_tabla_actual") or self._tabla_actual is None:
                # Creamos la tabla al cerrar la primera fila.
                self._tabla_actual = self.doc.add_table(
                    rows=0, cols=len(self._celdas_fila)
                )
                self._tabla_actual.style = "Table Grid"
                self._tabla_actual.autofit = True
            fila = self._tabla_actual.add_row()
            self._num_filas_tabla += 1
            for i, celda in enumerate(self._celdas_fila):
                parrafo = fila.cells[i].paragraphs[0]
                run = parrafo.add_run(celda)
                run.font.size = Pt(9)
                if self._es_cabecera:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    # Fondo azul para la cabecera.
                    from docx.oxml.ns import qn
                    from docx.oxml import OxmlElement
                    shd = OxmlElement("w:shd")
                    shd.set(qn("w:val"), "clear")
                    shd.set(qn("w:fill"), "3D271C")
                    fila.cells[i]._tc.get_or_add_tcPr().append(shd)
        elif tag == "table":
            self._tabla_actual = None
        elif tag == "pre":
            self.en_pre = False

    # ------------------------------------------------------------------
    # Ayudas internas
    # ------------------------------------------------------------------
    def _aplicar_color_al_ultimo(self, color):
        if self.doc.paragraphs:
            ultimo = self.doc.paragraphs[-1]
            for run in ultimo.runs:
                run.font.color.rgb = color


def generar_docx():
    """Genera el documento Word a partir del HTML."""
    if not os.path.exists(HTML_ENTRADA):
        print(f"[ERROR] No se encontró el archivo: {HTML_ENTRADA}")
        return

    doc = Document()

    # Margen razonable para impresión.
    for seccion in doc.sections:
        seccion.left_margin = Cm(2)
        seccion.right_margin = Cm(2)
        seccion.top_margin = Cm(2)
        seccion.bottom_margin = Cm(2)

    with open(HTML_ENTRADA, "r", encoding="utf-8") as archivo:
        html = archivo.read()

    # Eliminamos el bloque <head> y <style> (no aplican a Word).
    html = re.sub(r"<head>.*?</head>", "", html, flags=re.DOTALL)
    html = re.sub(r"<style.*?</style>", "", html, flags=re.DOTALL)
    # Los <b>/<i> dentro de títulos no aportan; los dejamos pasar.
    html = html.replace("<body", "<div").replace("</body>", "</div>")

    parser = HTML_a_DOCX(doc)
    parser.feed(html)

    doc.save(DOCX_SALIDA)
    print(f"[OK] Documento Word generado: {DOCX_SALIDA}")


if __name__ == "__main__":
    generar_docx()
