from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
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
OUT_FILE = OUT_DIR / "Base_Conocimiento_RAG_Prestamos_Chito.pdf"


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
            name="SubTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=7,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.4,
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
        [
            ListItem(Paragraph(item, style), leftIndent=0)
            for item in items
        ],
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
    canvas.drawString(doc.leftMargin, height - 0.78 * cm, "Prestamos Chito | Base de Conocimiento RAG")
    canvas.setFont("Helvetica", 8.5)
    canvas.drawRightString(width - doc.rightMargin, height - 0.78 * cm, "Documento operativo interno")

    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(doc.leftMargin, 0.75 * cm, f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.drawRightString(width - doc.rightMargin, 0.75 * cm, f"Pagina {canvas.getPageNumber()}")

    canvas.restoreState()


def build_story(styles):
    story = []

    story.append(Spacer(1, 2.2 * cm))
    story.append(Paragraph("Base de Conocimiento RAG", styles["DocTitle"]))
    story.append(Paragraph("Prestamos Chito - Operacion completa para IA", styles["DocSubtitle"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "Documento maestro para subir desde la aplicacion como conocimiento de largo plazo. "
            "La IA debe usar este contenido para responder sobre clientes, prestamos, pagos, cobradores, "
            "call center, memoria episodica, documentos PDF/Word/imagen y canales Meta.",
            styles["Body"],
        )
    )

    cover_rows = [
        [
            Paragraph("<b>Version</b>", styles["Body"]),
            Paragraph("1.0", styles["Body"]),
            Paragraph("<b>Alcance</b>", styles["Body"]),
            Paragraph("Todas las oficinas y roles autorizados", styles["Body"]),
        ],
        [
            Paragraph("<b>Idioma</b>", styles["Body"]),
            Paragraph("Español / es-CO", styles["Body"]),
            Paragraph("<b>Formato monetario</b>", styles["Body"]),
            Paragraph("Colombian pesos con separador de miles", styles["Body"]),
        ],
    ]
    story.append(Spacer(1, 0.2 * cm))
    story.append(build_table(cover_rows, [3.0 * cm, 4.0 * cm, 3.5 * cm, 5.0 * cm]))
    story.append(Spacer(1, 0.45 * cm))
    story.append(
        Paragraph(
            "Regla principal: la IA no debe inventar informacion. Si un dato no aparece en la base, "
            "debe decirlo con claridad y pedir el dato faltante o indicar que hace falta consultar una fuente valida.",
            styles["Body"],
        )
    )
    story.append(PageBreak())

    add_section(
        story,
        styles,
        "1. Objetivo del documento",
        [
            "Este documento define la base operativa del sistema para que la IA responda de forma consistente, profesional y segura.",
            "La informacion aqui escrita debe servir como referencia para consultas de clientes, gestion de cartera, soporte interno, canales de mensajeria y administracion por oficina.",
        ],
        [
            "Usar siempre el contexto del tenant u oficina activa.",
            "No mezclar datos entre oficinas.",
            "Responder en espanol, claro y directo.",
            "Si hay ambiguedad, preguntar antes de asumir.",
        ],
    )

    add_section(
        story,
        styles,
        "2. Reglas maestras de la IA",
        [
            "La IA debe actuar como asistente profesional de prestamo, cobranza, atencion y soporte interno.",
            "Debemos priorizar exactitud sobre creatividad. La respuesta correcta vale mas que una respuesta larga.",
        ],
        [
            "No inventar clientes, cifras, fechas, sedes ni estados.",
            "Si la consulta viene desde WhatsApp, Instagram o Facebook, responder por el mismo canal cuando la integracion este activa.",
            "Si la respuesta requiere una decision de negocio o una excepcion, escalar a un humano autorizado.",
            "Los montos se leen y escriben como moneda colombiana: por ejemplo $58.500.000 se expresa como 58 millones 500 mil pesos.",
            "Para voz, hablar numeros de forma natural y no separar mal los ceros.",
            "Mantener tono cordial, util y breve, sin sonar robotico.",
        ],
    )

    add_section(
        story,
        styles,
        "3. Estructura general de la plataforma",
        [
            "La plataforma trabaja por oficinas o tenants. Cada oficina tiene sus propios usuarios, clientes, cobradores, prestamos, campañas y documentos.",
            "La IA debe respetar esa separacion para no mezclar informacion sensible entre empresas o sucursales.",
        ],
        [
            "<b>Superadmin:</b> administra oficinas, integraciones globales, configuraciones y visibilidad general.",
            "<b>Admin de oficina:</b> gestiona clientes, cobradores, prestamos, cartera, reportes y canales de esa oficina.",
            "<b>Cobrador:</b> consulta cartera, conversaciones y seguimiento de sus clientes asignados.",
            "<b>Cliente:</b> persona con prestamo o interes de prestamo que puede escribir por canales habilitados.",
        ],
    )

    add_section(
        story,
        styles,
        "4. Colecciones y datos que debe conocer la IA",
        [
            "Las colecciones guardan la informacion operativa del sistema. Algunas son relacionales y otras son vectoriales o de conocimiento.",
        ],
    )

    collection_rows = [
        [
            Paragraph("<b>Coleccion</b>", styles["Body"]),
            Paragraph("<b>Funcion</b>", styles["Body"]),
            Paragraph("<b>Campos importantes</b>", styles["Body"]),
        ],
        [
            Paragraph("tenants", styles["Body"]),
            Paragraph("Guarda cada oficina o empresa. Permite separar datos, permisos y canales.", styles["Body"]),
            Paragraph("nombre, codigo, estado, plan, ciudad, contacto", styles["Body"]),
        ],
        [
            Paragraph("sedes", styles["Body"]),
            Paragraph("Guarda sucursales o puntos de atencion de una oficina.", styles["Body"]),
            Paragraph("tenantId, nombre, direccion, horario, telefono, ciudad", styles["Body"]),
        ],
        [
            Paragraph("admins", styles["Body"]),
            Paragraph("Guarda usuarios administradores y superadmin.", styles["Body"]),
            Paragraph("nombre, email, password hash, role, tenantId", styles["Body"]),
        ],
        [
            Paragraph("clientes", styles["Body"]),
            Paragraph("Guarda personas con prestamos o potenciales clientes.", styles["Body"]),
            Paragraph("nombre, cedula, telefono, direccion, cobradorId, tenantId, estado, embedding", styles["Body"]),
        ],
        [
            Paragraph("cobradores", styles["Body"]),
            Paragraph("Guarda responsables de cobro y seguimiento.", styles["Body"]),
            Paragraph("nombre, correo, telefono, tenantId, estado", styles["Body"]),
        ],
        [
            Paragraph("prestamos", styles["Body"]),
            Paragraph("Guarda los creditos otorgados a cada cliente.", styles["Body"]),
            Paragraph("clienteId, cobradorId, capital, interes, total, saldo, pagado, plazoDias, fechaInicio, fechaVencimiento, estado", styles["Body"]),
        ],
        [
            Paragraph("pagos", styles["Body"]),
            Paragraph("Guarda abonos y pagos asociados a un prestamo.", styles["Body"]),
            Paragraph("prestamoId, clienteId, cobradorId, monto, fecha, medio, observacion, estado", styles["Body"]),
        ],
        [
            Paragraph("metaintegrations", styles["Body"]),
            Paragraph("Guarda la configuracion de WhatsApp, Instagram y Facebook por oficina.", styles["Body"]),
            Paragraph("tenantId, canal, activo, accessToken, verifyToken, appSecret, pageId, phoneNumberId, businessAccountId, mode", styles["Body"]),
        ],
        [
            Paragraph("metacampaigns", styles["Body"]),
            Paragraph("Guarda campañas de difusion y su estado.", styles["Body"]),
            Paragraph("tenantId, nombre, canal, audiencia, mensaje, estado, destinos, fallos", styles["Body"]),
        ],
        [
            Paragraph("ragitems", styles["Body"]),
            Paragraph("Guarda conversaciones, memoria episodica, conocimiento operativo y contenido recuperable por IA.", styles["Body"]),
            Paragraph("tenantId, kind, channel, conversationId, title, content, summary, embedding, importance", styles["Body"]),
        ],
        [
            Paragraph("knowledge_documents", styles["Body"]),
            Paragraph("Guarda el documento completo que sube la oficina.", styles["Body"]),
            Paragraph("tenantId, nombre, tipoArchivo, source, pageCount, summary, isActive", styles["Body"]),
        ],
        [
            Paragraph("knowledge_chunks", styles["Body"]),
            Paragraph("Guarda los fragmentos del documento para busqueda semantica.", styles["Body"]),
            Paragraph("documentId, tenantId, chunkIndex, content, summary, embedding, isActive", styles["Body"]),
        ],
    ]
    story.append(build_table(collection_rows, [3.2 * cm, 7.0 * cm, 5.2 * cm]))
    story.append(Spacer(1, 0.4 * cm))

    add_section(
        story,
        styles,
        "5. Flujo de conocimiento y RAG",
        [
            "Cuando se sube un PDF, Word, texto o imagen desde la aplicacion, el backend extrae el contenido, lo limpia y lo convierte en conocimiento utilizable.",
            "Si el archivo es escaneado, la IA aplica OCR para recuperar texto. Luego el contenido se divide en fragmentos y se transforma en embeddings para busqueda semantica.",
        ],
        [
            "El documento completo queda registrado en knowledge_documents.",
            "Los fragmentos semanticos quedan en knowledge_chunks.",
            "Los embeddings permiten buscar por significado y no solo por coincidencia exacta.",
            "Los items de memoria y conversaciones quedan en ragitems.",
            "Si la busqueda vectorial no encuentra un resultado fuerte, el sistema puede usar una busqueda de apoyo o pedir mas contexto.",
        ],
    )

    add_section(
        story,
        styles,
        "6. Memoria episodica y conversacional",
        [
            "La memoria episodica guarda lo que esta pasando en una conversacion concreta: la intencion del usuario, la respuesta dada, la oficina activa y el estado de la sesion.",
            "La memoria duradera guarda hechos utiles que conviene recordar en futuras interacciones, por ejemplo el cliente que mas debe, una preferencia de contacto o una respuesta aprobada por la oficina.",
        ],
        [
            "Cada episodio debe asociarse a tenantId, channel y conversationId.",
            "Si un dato es relevante y repetido, se puede guardar como memoria util.",
            "No guardar informacion de una oficina dentro de otra.",
            "No mezclar sesiones ni contactos entre canales diferentes salvo que la logica lo permita.",
        ],
    )

    add_section(
        story,
        styles,
        "7. Canales Meta y difusion",
        [
            "La plataforma soporta WhatsApp, Instagram y Facebook como canales de entrada y salida, siempre que la integracion este activa por oficina.",
            "La IA debe responder desde el mismo canal cuando sea posible y respetar el modo de respuesta configurado: auto, asistido o con derivacion humana.",
        ],
        [
            "WhatsApp: usa identificadores de telefono, cuenta de negocio, token de acceso, token de verificacion y secreto de aplicacion.",
            "Instagram: usa identificador de cuenta o pagina vinculada, token de acceso y secreto de aplicacion.",
            "Facebook: usa pagina vinculada, token de acceso y secreto de aplicacion.",
            "Cada oficina puede tener sus propias credenciales y su propio estado activo o inactivo.",
            "Las campañas de difusion deben respetar autorizacion, audiencia, estado de envio y trazabilidad.",
        ],
    )

    add_section(
        story,
        styles,
        "8. Operacion de clientes, prestamos, cobradores y pagos",
        [
            "La IA debe entender la relacion cliente -> prestamo -> pagos -> cobrador.",
            "Cuando el usuario pregunta por deuda, saldo, vencimiento o quien cobra, la respuesta debe basarse en esos registros y no en suposiciones.",
        ],
        [
            "Un cliente puede tener uno o varios prestamos, segun la politica de la oficina.",
            "Cada prestamo debe estar asignado a un cobrador cuando la oficina lo requiera.",
            "El saldo pendiente es el total menos lo pagado.",
            "Los estados comunes son activo, pagado, vencido, pendiente o en seguimiento, segun la implementacion de la oficina.",
            "Si falta el cobrador de un prestamo, la IA debe indicar que no hay asignacion o usar la regla de negocio definida por la oficina.",
            "Al listar deuda, la IA debe priorizar el cliente con mayor saldo pendiente dentro del tenant actual.",
        ],
    )

    add_section(
        story,
        styles,
        "9. Comportamiento esperado en el call center IA",
        [
            "El call center IA debe poder sostener muchas conversaciones a la vez, identificar el hilo correcto y mantener el contexto por usuario.",
            "La interfaz debe mostrar el detalle del cliente, el historial, el concepto, el estado de la sesion y acciones rapidas de atencion.",
        ],
        [
            "Si el usuario pregunta algo repetitivo, la IA debe responder con el contexto ya conocido.",
            "Si el usuario cambia de tema, la IA debe reconocer el nuevo objetivo sin perder el hilo principal.",
            "Si la conversacion requiere cierre o transferencia, la IA debe resumir lo que paso de forma util para el humano.",
            "La voz y el texto deben entregar la misma informacion, sin contradicciones.",
        ],
    )

    add_section(
        story,
        styles,
        "10. Reglas de formato de respuesta",
        [
            "La IA debe responder de forma clara, corta y profesional. Cuando la pregunta es simple, la respuesta tambien debe ser simple.",
        ],
        [
            "Usar viñetas cuando haya varios puntos.",
            "Usar montos con separador de miles: $25.000.000.",
            "Al hablar por voz, decir el valor completo: 25 millones de pesos, no 25 mil.",
            "Si faltan datos, decir exactamente que falta: nombre, cedula, telefono, oficina o numero de prestamo.",
            "Nunca afirmar una accion que no haya sido ejecutada.",
        ],
    )

    add_section(
        story,
        styles,
        "11. Que documentos subir para que la IA trabaje mejor",
        [
            "La calidad del RAG depende de la calidad de los documentos que se suben. Lo ideal es subir material real de operacion.",
        ],
        [
            "Manual de afiliacion y requisitos.",
            "Politica de prestamos, tasas, plazos y recargos.",
            "Preguntas frecuentes de clientes.",
            "Guiones de atencion y cobro.",
            "Horarios, direcciones y sedes.",
            "Reglas internas de cobranza y seguimiento.",
            "Politicas de canales Meta, tiempos de respuesta y tono permitido.",
            "Instrucciones de escalamiento a humano.",
            "Ejemplos de mensajes de WhatsApp, Instagram y Facebook.",
        ],
    )

    add_section(
        story,
        styles,
        "12. Que no se debe subir",
        [
            "No se recomienda subir contrasenas, tokens secretos, claves de acceso ni informacion privada que no deba ser consultada por la IA.",
            "Tampoco se debe subir material que mezcle datos de distintas oficinas sin una buena clasificacion por tenant.",
        ],
        [
            "Credenciales sensibles.",
            "Datos personales no autorizados.",
            "Documentos mezclados de varias oficinas sin contexto.",
            "Contenido que contradiga la politica oficial de la empresa.",
        ],
    )

    add_section(
        story,
        styles,
        "13. Ejemplos de preguntas que la IA debe poder resolver",
        [
            "Estas consultas deben responderse usando la informacion del tenant activo, los prestamos, la cartera, la memoria y la base documental.",
        ],
        [
            "Que cliente me debe mas.",
            "Cual es el saldo de este cliente.",
            "Que cobrador tiene asignado este prestamo.",
            "Cuales son los requisitos para afiliarse.",
            "Cual es la sede mas cercana o con mejor horario.",
            "Que documentos necesito para un credito.",
            "Cual es el mensaje de bienvenida del canal WhatsApp.",
            "Que documento explica la politica de cobro.",
            "Cual es el estado de la campana de difusion.",
        ],
    )

    add_section(
        story,
        styles,
        "14. Checklist operativo por oficina",
        [
            "Antes de considerar lista una oficina, la IA y el sistema deben tener informados estos datos operativos.",
        ],
        [
            "Nombre comercial de la oficina.",
            "Codigo del tenant o identificador interno.",
            "Ciudad y direccion principal.",
            "Horarios de atencion.",
            "Telefono o canal principal de contacto.",
            "Cobrador principal o responsables de cartera.",
            "Tasa de interes y reglas del prestamo.",
            "Plazo maximo y politica de vencimiento.",
            "Canales activos: WhatsApp, Instagram, Facebook o web.",
            "Mensaje de bienvenida y mensaje fallback.",
        ],
    )

    add_section(
        story,
        styles,
        "15. Cierre",
        [
            "Este documento esta pensado para ser subido como base de conocimiento y servir como cerebro operativo de la IA.",
            "Si la oficina agrega documentos nuevos, manuales o politicas, deben indexarse tambien para mantener el sistema actualizado.",
        ],
        [
            "La IA debe ser precisa.",
            "La IA debe respetar la oficina activa.",
            "La IA debe leer montos correctamente.",
            "La IA debe usar el RAG y la memoria antes de inventar una respuesta.",
        ],
    )

    add_section(
        story,
        styles,
        "16. Flujo de mensajes por canal",
        [
            "Cuando un cliente escribe por WhatsApp, Instagram, Facebook o Telegram, el mensaje debe entrar al cerebro IA de la oficina activa y quedar visible en la bandeja de conversacion de oficina y superadmin.",
            "La IA responde automaticamente cuando la integracion esta activa y el modo de respuesta lo permite.",
            "El cobrador no debe recibir cada mensaje de cliente por defecto. Solo debe entrar cuando el caso se le asigna, se escala manualmente o la oficina define una regla de atencion especifica.",
            "Al terminar una respuesta util, la IA debe cerrar con una pregunta breve del tipo: '¿Hay algo mas en lo que te pueda ayudar?'. Si no hay mas mensajes, el hilo se marca como cerrado para liberar atencion.",
        ],
        [
            "WhatsApp: respuesta automatica y seguimiento de cartera.",
            "Instagram: mismo flujo que WhatsApp si la cuenta esta conectada.",
            "Facebook Messenger: mismo flujo que WhatsApp si la pagina esta conectada.",
            "Telegram: visible en la oficina conectada y en superadmin para supervisar el hilo.",
            "Oficina y superadmin: monitoreo en tiempo real del hilo y del estado cerrado/abierto.",
        ],
    )

    add_section(
        story,
        styles,
        "17. Guion recomendado de respuesta",
        [
            "La IA debe contestar con tono profesional, claro, cordial y corto. Si el cliente pide informacion general, la respuesta debe ser directa. Si hace falta un dato, se debe pedir solo ese dato.",
            "Si el tema ya quedo resuelto, la IA debe invitar al cierre y no seguir alargando la conversacion.",
        ],
        [
            "Saludar de forma breve y natural.",
            "Responder solo lo que el cliente pregunto.",
            "No inventar datos ni prometer cosas no autorizadas.",
            "Usar montos en pesos colombianos y leerlos de forma natural en voz.",
            "Si el cliente pide algo fuera del alcance, escalar a humano o pedir el dato faltante.",
            "Si la respuesta queda completa, terminar con una frase corta de cierre: '¿Hay algo mas en lo que te pueda ayudar?'.",
        ],
    )

    story.append(Spacer(1, 0.4 * cm))
    story.append(
        Paragraph(
            "Fin del documento.",
            ParagraphStyle(
                "EndNote",
                parent=styles["Body"],
                alignment=TA_CENTER,
                textColor=colors.HexColor("#64748b"),
                fontName="Helvetica-Bold",
            ),
        )
    )

    return story


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.7 * cm,
        bottomMargin=1.4 * cm,
        title="Base de Conocimiento RAG - Prestamos Chito",
        author="Codex",
        subject="Documento maestro para RAG y operaciones",
    )

    story = build_story(styles)
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"PDF generado en: {OUT_FILE}")


if __name__ == "__main__":
    main()
