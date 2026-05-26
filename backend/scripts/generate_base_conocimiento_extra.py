from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs"
OUT_FILE = OUT_DIR / "Base_Conocimiento_RAG_Omnicanal_Telegram_Meta.pdf"


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="DocSubtitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#334155"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#1d4ed8"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.3,
            leading=14,
            spaceAfter=5,
            textColor=colors.HexColor("#111827"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            spaceAfter=3,
            textColor=colors.HexColor("#475569"),
        )
    )
    return styles


def bullet_list(items, style):
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=0) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=9,
        bulletOffsetY=2,
        spaceBefore=2,
        spaceAfter=4,
    )


def add_section(story, styles, title, paragraphs=None, bullets=None):
    story.append(Paragraph(title, styles["SectionTitle"]))
    if paragraphs:
        for text in paragraphs:
            story.append(Paragraph(text, styles["Body"]))
    if bullets:
        story.append(bullet_list(bullets, styles["Body"]))
    story.append(Spacer(1, 6))


def build_table(rows, widths):
    table = Table(rows, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbeafe")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4

    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.rect(0, height - 1.2 * cm, width, 1.2 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(doc.leftMargin, height - 0.78 * cm, "Prestamos Chito | Base de Conocimiento Extra")
    canvas.setFont("Helvetica", 8.5)
    canvas.drawRightString(width - doc.rightMargin, height - 0.78 * cm, "Documento para RAG y demostracion")

    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(doc.leftMargin, 0.75 * cm, f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.drawRightString(width - doc.rightMargin, 0.75 * cm, f"Pagina {canvas.getPageNumber()}")

    canvas.restoreState()


def build_story(styles):
    story = []

    story.append(Spacer(1, 2.2 * cm))
    story.append(Paragraph("Base de Conocimiento RAG Extra", styles["DocTitle"]))
    story.append(Paragraph("Prestamos Chito - Guia omnicanal para Telegram, WhatsApp, Instagram y Facebook", styles["DocSubtitle"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Paragraph(
            "Este documento complementa la base principal y se puede subir ahora mismo al sistema. "
            "Su objetivo es reforzar la respuesta de la IA con reglas operativas, pasos de atención, "
            "flujo por canales y lineamientos para la demostracion academica.",
            styles["Body"],
        )
    )
    story.append(
        build_table(
            [
                [
                    Paragraph("<b>Tipo</b>", styles["Body"]),
                    Paragraph("Documento de apoyo para RAG", styles["Body"]),
                    Paragraph("<b>Alcance</b>", styles["Body"]),
                    Paragraph("Todas las oficinas", styles["Body"]),
                ],
                [
                    Paragraph("<b>Idioma</b>", styles["Body"]),
                    Paragraph("Español colombiano", styles["Body"]),
                    Paragraph("<b>Uso</b>", styles["Body"]),
                    Paragraph("Atencion, soporte y demostracion", styles["Body"]),
                ],
            ],
            [3.2 * cm, 6.3 * cm, 3.2 * cm, 5.0 * cm],
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("Regla base: la IA no debe inventar datos. Si no encuentra evidencia en el contexto, debe pedir aclaracion o decir que no cuenta con el dato.", styles["Body"]))
    story.append(PageBreak())

    add_section(
        story,
        styles,
        "1. Objetivo del documento",
        [
            "Este documento sirve como conocimiento de soporte para que la IA responda preguntas operativas con mayor claridad, especialmente en Telegram y en los canales Meta.",
            "La base complementa la informacion de clientes, prestamos, pagos, cobradores, oficinas, memoria episodica y documentos cargados por la empresa.",
        ],
        [
            "Responder con datos reales y actuales del sistema.",
            "Evitar mezclar informacion entre oficinas.",
            "Responder de forma profesional, breve y util.",
            "Escalar a humano cuando la solicitud salga del alcance automatico.",
        ],
    )

    add_section(
        story,
        styles,
        "2. Flujo de carga del conocimiento",
        [
            "Cuando el usuario sube un PDF, Word, texto o imagen desde el panel, el backend extrae el contenido y lo convierte en base de conocimiento recuperable.",
            "Si el archivo tiene texto seleccionable, la extraccion es directa; si es una imagen escaneada, entra OCR para recuperar el texto.",
            "Luego el contenido se divide en chunks y se genera embedding para busqueda semantica.",
        ],
        [
            "El documento padre queda en knowledge_documents.",
            "Los fragmentos quedan en knowledge_chunks.",
            "Las conversaciones, memorias y episodios quedan en ragitems.",
            "Cada chunk conserva referencia al archivo y al tenant.",
        ],
    )

    add_section(
        story,
        styles,
        "3. Funcionamiento del chunk",
        [
            "Un chunk es un fragmento controlado de texto. El sistema divide el documento en bloques para que la busqueda sea mas precisa y eficiente.",
            "Cada fragmento conserva contexto suficiente para responder preguntas sin cargar todo el documento a la vez.",
        ],
        [
            "Chunk pequeño: mejora precision, pero puede perder contexto.",
            "Chunk muy grande: conserva mas contexto, pero baja la precision.",
            "El sistema usa solape para no cortar ideas importantes entre un chunk y otro.",
            "Cada chunk puede resumirse y vectorizarse con embedding.",
        ],
    )

    add_section(
        story,
        styles,
        "4. Base vectorial y busqueda semantica",
        [
            "La informacion indexada se guarda con embeddings, que son representaciones numericas del significado del texto.",
            "Cuando el usuario pregunta algo, la pregunta tambien se convierte en vector y se compara con los vectores del documento usando busqueda semantica.",
        ],
        [
            "MongoDB Atlas puede recibir esa busqueda con $vectorSearch.",
            "Si Atlas no responde, el sistema usa busqueda lexical de apoyo.",
            "La coleccion knowledge_chunks es la principal para el material vectorial.",
            "knowledge_documents guarda el documento padre para control documental.",
        ],
    )

    add_section(
        story,
        styles,
        "5. Demostracion por Telegram",
        [
            "Telegram es el canal ideal para mostrar la IA en vivo porque el bot recibe el mensaje, busca contexto y responde automaticamente.",
            "El flujo es: usuario escribe -> webhook de Telegram recibe -> backend consulta RAG -> IA responde -> el bot devuelve la respuesta.",
        ],
        [
            "Mandar /start para abrir la sesion.",
            "Hacer una pregunta sobre el contenido cargado.",
            "Verificar que la respuesta salga basada en la base de conocimiento.",
            "Mostrar que la IA mantiene el contexto por chat.",
        ],
    )

    add_section(
        story,
        styles,
        "6. Reglas de respuesta del asistente",
        [
            "La IA responde solo con informacion respaldada por el contexto operativo, la memoria relevante o el documento cargado.",
            "Si la pregunta es sobre clientes, saldos, atrasos o prestamos, el sistema debe priorizar datos vivos y no repetir memorias viejas.",
        ],
        [
            "No inventar nombres, saldos, fechas ni estados.",
            "No mostrar datos de otros clientes cuando el usuario solo consulta uno.",
            "Si se trata de un prospecto, pedir solo lo indispensable: nombre, cedula, celular, ciudad y monto aproximado.",
            "Al cerrar un caso, agregar una pregunta corta de seguimiento solo si realmente hace falta.",
        ],
    )

    add_section(
        story,
        styles,
        "7. Canales soportados",
        [
            "La misma inteligencia opera para Telegram, Web, WhatsApp, Instagram y Facebook.",
            "Cada canal usa su propio webhook o integracion, pero todos terminan consultando el mismo cerebro RAG.",
        ],
        [
            "Web: bandeja interna y espacio IA.",
            "Telegram: bot conversacional para demostracion y operacion.",
            "WhatsApp: atencion al cliente y respuestas automaticas por la API de Meta.",
            "Instagram y Facebook: mensajes directos de cuentas profesionales y paginas conectadas.",
        ],
    )

    add_section(
        story,
        styles,
        "8. Telefonos y contactos de oficina",
        [
            "Para la oficina Norte Cali, el sistema puede responder con los telefonos internos registrados si el usuario pregunta por contacto o atencion.",
        ],
        [
            "3187092130",
            "3009013672",
            "El sistema debe distinguir entre telefono de oficina y Phone Number ID de Meta.",
        ],
    )

    add_section(
        story,
        styles,
        "9. Mensajes que la IA debe poder contestar",
        [
            "La base extra debe ayudar a responder preguntas como horarios, requisitos, estado de prestamo, telefono de la oficina, canales activos, documentos soportados y orientacion general.",
        ],
        [
            "¿Cuáles son los requisitos para un préstamo?",
            "¿Qué oficina me atiende?",
            "¿Cuál es el número de contacto de la oficina?",
            "¿Qué documentos puedo subir al sistema?",
            "¿Cómo funciona el chunk y el vector search?",
            "¿Me puedes resumir mi caso o mi deuda?",
        ],
    )

    add_section(
        story,
        styles,
        "10. Explicacion del prompt",
        [
            "El prompt del sistema le indica a la IA que debe actuar como asistente profesional de Prestamos Chito.",
            "Antes de responder, el backend le entrega un resumen operativo, conocimiento recuperado, contexto de clientes y memoria relevante, todo filtrado por tenant o por global cuando corresponde.",
            "El prompt obliga a devolver JSON valido con respuesta, resumen de memoria, preguntas de seguimiento y decision de cierre de conversacion.",
        ],
        [
            "Priorizar datos reales del sistema.",
            "Ignorar memoria si contradice un dato vivo.",
            "Responder en español de Colombia.",
            "Usar un tono claro, breve y profesional.",
        ],
    )

    add_section(
        story,
        styles,
        "11. Guion breve para la demostracion",
        [
            "1. Subo el documento a la aplicacion.",
            "2. El backend lo divide en chunks y genera embeddings.",
            "3. MongoDB guarda el documento padre y los fragmentos vectoriales.",
            "4. Hago una pregunta por Telegram.",
            "5. La IA recupera el fragmento mas relevante y responde correctamente.",
        ],
    )

    add_section(
        story,
        styles,
        "12. Buenas practicas",
        [
            "Usar documentos limpios, con buen texto y estructura clara.",
            "Evitar subir archivos duplicados o con informacion contradictoria.",
            "Mantener actualizado el contexto por oficina.",
            "Verificar que las credenciales de canales esten activas antes de demostrar el flujo en vivo.",
        ],
    )

    return story


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    story = build_story(styles)

    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        rightMargin=1.7 * cm,
        leftMargin=1.7 * cm,
        topMargin=1.7 * cm,
        bottomMargin=1.7 * cm,
    )

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"PDF generado: {OUT_FILE}")


if __name__ == "__main__":
    main()
