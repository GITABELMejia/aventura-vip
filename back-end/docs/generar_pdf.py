#!/usr/bin/env python3
# ============================================================================
# GENERADOR DE PDF DE LA GUÍA DE LA API REST
# ----------------------------------------------------------------------------
# Convierte la guía HTML (docs/GUIA_API_REST.html) en un PDF profesional.
#
# COMO USARLO:
#   python3 generar_pdf.py
#
# RESULTADO:
#   Crea el archivo docs/GUIA_API_REST.pdf
#
# REQUISITO:
#   pip3 install fpdf2
# ============================================================================

import os
from fpdf import FPDF

# ----------------------------------------------------------------------------
# Rutas de archivos (relativas a la carpeta de este script).
# ----------------------------------------------------------------------------
CARPETA_ACTUAL = os.path.dirname(os.path.abspath(__file__))
HTML_ENTRADA = os.path.join(CARPETA_ACTUAL, "GUIA_API_REST.html")
PDF_SALIDA = os.path.join(CARPETA_ACTUAL, "GUIA_API_REST.pdf")

# ----------------------------------------------------------------------------
# Personalización del PDF (estilos).
# ----------------------------------------------------------------------------
COLOR_PRIMARIO = (61, 39, 28)   # Marron chocolate de la marca (encabezados)
COLOR_FONDO_TABLA = (26, 77, 143)  # Fondo de cabeceras de tabla
COLOR_TEXTO = (34, 34, 34)       # Color del texto normal
COLOR_CODIGO = (70, 80, 90)      # Color del texto de código
FUENTE = "helvetica"             # Fuente estándar de PDF (no requiere archivos)


class PDF_Guia(FPDF):
    """Clase que extiende FPDF con numeración de páginas y encabezado."""

    def header(self):
        # Encabezado pequeño en todas las páginas (excepto la portada).
        if self.page_no() > 1:
            self.set_font(FUENTE, "I", 8)
            self.set_text_color(*COLOR_PRIMARIO)
            self.cell(0, 8, "Guía de la API REST - Aventura Vip de Cusco", 0, 1, "R")
            self.ln(2)

    def footer(self):
        # Pie de página con el número de página.
        self.set_y(-15)
        self.set_font(FUENTE, "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Página {self.page_no()}", 0, 0, "C")


def generar_pdf():
    """Genera el PDF a partir del archivo HTML."""
    # 1) Verificar que exista el HTML de origen.
    if not os.path.exists(HTML_ENTRADA):
        print(f"[ERROR] No se encontró el archivo: {HTML_ENTRADA}")
        return

    # 2) Crear el documento PDF en orientación vertical (A4).
    pdf = PDF_Guia()
    pdf.set_auto_page_break(auto=True, margin=20)

    # 3) Agregar la portada (primera página).
    pdf.add_page()
    pdf.set_font(FUENTE, "", 12)
    pdf.ln(50)
    pdf.set_font(FUENTE, "B", 28)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(0, 14, "Guía de la API REST", 0, 1, "C")
    pdf.set_font(FUENTE, "", 15)
    pdf.set_text_color(90, 90, 90)
    pdf.ln(6)
    pdf.cell(0, 10, "Sistema de Movilidad", 0, 1, "C")
    pdf.set_font(FUENTE, "B", 19)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.cell(0, 12, "Aventura Vip de Cusco", 0, 1, "C")
    pdf.ln(25)
    pdf.set_font(FUENTE, "", 12)
    pdf.set_text_color(*COLOR_TEXTO)
    pdf.cell(0, 8, "Backend: Node.js + Express + TypeScript", 0, 1, "C")
    pdf.cell(0, 8, "Base de datos: PostgreSQL 15", 0, 1, "C")
    pdf.ln(20)
    pdf.set_font(FUENTE, "", 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, "Versión de la API: 1.0.0", 0, 1, "C")
    pdf.cell(0, 6, "Módulo implementado: Autenticación (Login)", 0, 1, "C")
    pdf.cell(0, 6, "Documento generado automáticamente", 0, 1, "C")

    # 4) Leer el contenido del HTML y pasarlo al renderizador de fpdf2.
    with open(HTML_ENTRADA, "r", encoding="utf-8") as archivo:
        html = archivo.read()

    pdf.set_font(FUENTE, "", 11)
    pdf.set_text_color(*COLOR_TEXTO)

    # write_html() interpreta etiquetas básicas: h1, h2, p, b, i, pre, code,
    # table, tr, td, th, ul, li, ol y estilos inline de color/fuente.
    pdf.write_html(html)

    # 5) Guardar el PDF final.
    pdf.output(PDF_SALIDA)
    print(f"[OK] PDF generado: {PDF_SALIDA}")


if __name__ == "__main__":
    generar_pdf()
