#!/usr/bin/env python3
# ============================================================================
# GENERADOR DE PDF DEL INFORME DE TESIS
# ----------------------------------------------------------------------------
# Convierte el informe de tesis HTML (docs/TESIS_INFORME.html) en un PDF.
#
# COMO USARLO:
#   python3 generar_pdf_tesis.py
#
# RESULTADO:
#   Crea el archivo docs/TESIS_INFORME.pdf
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
HTML_ENTRADA = os.path.join(CARPETA_ACTUAL, "TESIS_INFORME.html")
PDF_SALIDA = os.path.join(CARPETA_ACTUAL, "TESIS_INFORME.pdf")

# ----------------------------------------------------------------------------
# Estilos del documento.
# ----------------------------------------------------------------------------
COLOR_PRIMARIO = (61, 39, 28)      # Marron chocolate de la marca
COLOR_TEXTO = (34, 34, 34)          # Texto normal
FUENTE = "helvetica"                # Fuente estándar (sin archivos externos)


class PDF_Tesis(FPDF):
    """Extiende FPDF con encabezado y numeración de páginas."""

    def header(self):
        if self.page_no() > 1:
            self.set_font(FUENTE, "I", 8)
            self.set_text_color(*COLOR_PRIMARIO)
            self.cell(0, 8, "Sistema de Gestión de Movilidad - Aventura Vip de Cusco", 0, 1, "R")
            self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font(FUENTE, "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Página {self.page_no()}", 0, 0, "C")


def generar_pdf():
    """Genera el PDF del informe de tesis a partir del HTML."""
    if not os.path.exists(HTML_ENTRADA):
        print(f"[ERROR] No se encontró el archivo: {HTML_ENTRADA}")
        return

    pdf = PDF_Tesis()
    pdf.set_auto_page_break(auto=True, margin=20)

    # --- Portada (primera página) ---
    pdf.add_page()
    pdf.set_font(FUENTE, "", 12)
    pdf.ln(10)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 7, "UNIVERSIDAD ... - FACULTAD DE INGENIERÍA", 0, 1, "C")
    pdf.cell(0, 7, "ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS", 0, 1, "C")
    pdf.ln(12)
    pdf.set_font(FUENTE, "B", 16)
    pdf.set_text_color(*COLOR_PRIMARIO)
    pdf.multi_cell(0, 9, "DISEÑO E IMPLEMENTACIÓN DE UN SISTEMA DE GESTIÓN DE MOVILIDAD PARA LA EMPRESA AVENTURA VIP DE CUSCO", align="C")
    pdf.ln(14)
    pdf.set_font(FUENTE, "", 11)
    pdf.set_text_color(*COLOR_TEXTO)
    pdf.multi_cell(0, 7, "TESIS PARA OPTAR EL TÍTULO PROFESIONAL DE INGENIERO DE SISTEMAS", align="C")
    pdf.ln(14)
    pdf.cell(0, 7, "Autor: (NOMBRES Y APELLIDOS DEL TESISTA)", 0, 1, "C")
    pdf.cell(0, 7, "Asesor: (NOMBRES Y APELLIDOS DEL ASESOR)", 0, 1, "C")
    pdf.ln(20)
    pdf.set_font(FUENTE, "B", 13)
    pdf.cell(0, 8, "CUSCO - PERÚ", 0, 1, "C")
    pdf.cell(0, 8, "2026", 0, 1, "C")

    # --- Contenido ---
    with open(HTML_ENTRADA, "r", encoding="utf-8") as archivo:
        html = archivo.read()

    pdf.set_font(FUENTE, "", 11)
    pdf.set_text_color(*COLOR_TEXTO)
    pdf.write_html(html)

    pdf.output(PDF_SALIDA)
    print(f"[OK] PDF generado: {PDF_SALIDA}")


if __name__ == "__main__":
    generar_pdf()
