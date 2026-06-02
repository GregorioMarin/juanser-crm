import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

const margin = 48;

type PresupuestoPdf = NonNullable<Awaited<ReturnType<typeof getPresupuesto>>>;

async function getPresupuesto(id: number) {
  return prisma.presupuesto.findUnique({
    where: { id },
    include: {
      cliente: true,
      lineas: {
        orderBy: { id: "asc" },
      },
    },
  });
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value ?? 0));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPercent(value: unknown) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, height: number) {
  if (y + height <= doc.page.height - margin) {
    return y;
  }

  doc.addPage();
  return margin;
}

function drawDivider(doc: PDFKit.PDFDocument, y: number) {
  doc
    .save()
    .strokeColor("#d4d4d4")
    .lineWidth(1)
    .moveTo(margin, y)
    .lineTo(doc.page.width - margin, y)
    .stroke()
    .restore();
}

function drawHeader(doc: PDFKit.PDFDocument) {
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("Carpintería Juanser", margin, margin);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#404040")
    .text(
      "P.I. San Nicolás, Calle San Nicolás 9 Nave 21, 41500 Alcalá de Guadaíra, Sevilla",
      margin,
      82,
      { width: 340 },
    )
    .text("Teléfonos: 665 13 47 46 / 655 69 39 63", margin, 110);

  doc
    .roundedRect(doc.page.width - 210, margin, 162, 76, 6)
    .fillAndStroke("#f5f5f5", "#d4d4d4");

  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("PRESUPUESTO", doc.page.width - 194, margin + 16, {
      width: 130,
      align: "right",
    });
}

function drawClienteBlock(
  doc: PDFKit.PDFDocument,
  presupuesto: PresupuestoPdf,
  y: number,
) {
  const { cliente } = presupuesto;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111827")
    .text("Datos del cliente", margin, y);

  const startY = y + 20;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#404040")
    .text(cliente.nombre, margin, startY)
    .text(`Teléfono: ${cliente.telefono || "-"}`, margin, startY + 16)
    .text(`Email: ${cliente.email || "-"}`, margin, startY + 32)
    .text(`Dirección: ${cliente.direccion || "-"}`, margin, startY + 48)
    .text(`Localidad: ${cliente.localidad || "-"}`, margin, startY + 64);

  const metaX = doc.page.width - 230;
  doc
    .font("Helvetica-Bold")
    .fillColor("#111827")
    .text(`Número: ${presupuesto.numero}`, metaX, startY, {
      width: 182,
      align: "right",
    })
    .font("Helvetica")
    .fillColor("#404040")
    .text(`Fecha: ${formatDate(presupuesto.fecha)}`, metaX, startY + 18, {
      width: 182,
      align: "right",
    })
    .text(`Validez: ${presupuesto.validezDias} días`, metaX, startY + 36, {
      width: 182,
      align: "right",
    });

  return startY + 92;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.roundedRect(margin, y, doc.page.width - margin * 2, 24, 4).fill("#111827");
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Concepto", margin + 10, y + 8, { width: 210 })
    .text("Cant.", margin + 280, y + 8, { width: 50, align: "right" })
    .text("Precio", margin + 342, y + 8, { width: 70, align: "right" })
    .text("Total", margin + 430, y + 8, { width: 70, align: "right" });

  return y + 30;
}

function drawLineas(
  doc: PDFKit.PDFDocument,
  presupuesto: PresupuestoPdf,
  startY: number,
) {
  let y = drawTableHeader(doc, startY);

  presupuesto.lineas.forEach((linea, index) => {
    const description = linea.descripcion ? `\n${linea.descripcion}` : "";
    const rowText = `${linea.concepto}${description}`;
    const rowHeight = Math.max(
      34,
      doc.heightOfString(rowText, { width: 250 }) + 16,
    );

    y = ensureSpace(doc, y, rowHeight + 36);
    if (y === margin) {
      y = drawTableHeader(doc, y);
    }

    if (index % 2 === 0) {
      doc
        .rect(margin, y - 4, doc.page.width - margin * 2, rowHeight)
        .fill("#fafafa");
    }

    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(linea.concepto, margin + 10, y + 4, { width: 250 });

    if (linea.descripcion) {
      doc
        .font("Helvetica")
        .fillColor("#525252")
        .fontSize(8)
        .text(linea.descripcion, margin + 10, y + 18, { width: 250 });
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(Number(linea.cantidad).toLocaleString("es-ES"), margin + 280, y + 8, {
        width: 50,
        align: "right",
      })
      .text(formatCurrency(linea.precioUnitario), margin + 342, y + 8, {
        width: 70,
        align: "right",
      })
      .font("Helvetica-Bold")
      .text(formatCurrency(linea.total), margin + 430, y + 8, {
        width: 70,
        align: "right",
      });

    y += rowHeight;
  });

  return y + 10;
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  presupuesto: PresupuestoPdf,
  startY: number,
) {
  const y = ensureSpace(doc, startY, 94);
  const x = doc.page.width - 250;
  const labelWidth = 110;
  const valueWidth = 92;

  drawDivider(doc, y);
  doc.fontSize(10).fillColor("#111827");

  [
    ["Base imponible", formatCurrency(presupuesto.totalSinIva)],
    [`IVA ${formatPercent(presupuesto.ivaPorcentaje)}%`, formatCurrency(presupuesto.totalIva)],
    ["Total", formatCurrency(presupuesto.totalConIva)],
  ].forEach(([label, value], index) => {
    const rowY = y + 14 + index * 22;
    doc
      .font(index === 2 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(index === 2 ? 12 : 10)
      .text(label, x, rowY, { width: labelWidth })
      .text(value, x + labelWidth, rowY, {
        width: valueWidth,
        align: "right",
      });
  });

  return y + 92;
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  presupuesto: PresupuestoPdf,
  startY: number,
) {
  const y = ensureSpace(doc, startY, 110);

  if (presupuesto.observaciones) {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#111827")
      .text("Observaciones", margin, y)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#404040")
      .text(presupuesto.observaciones, margin, y + 18, {
        width: doc.page.width - margin * 2,
      });
  }

  const legalY = presupuesto.observaciones
    ? y + Math.max(58, doc.heightOfString(presupuesto.observaciones, {
        width: doc.page.width - margin * 2,
      }) + 34)
    : y;

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#525252")
    .text(
      "Presupuesto sujeto a aceptación y disponibilidad de materiales.",
      margin,
      legalY,
      { width: doc.page.width - margin * 2 },
    );
}

function renderPdf(presupuesto: PresupuestoPdf) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      bufferPages: true,
      margin,
      size: "A4",
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#111827")
      .text(presupuesto.titulo, margin, 146, {
        width: doc.page.width - margin * 2,
      });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#404040")
      .text(presupuesto.descripcion, margin, 170, {
        width: doc.page.width - margin * 2,
      });

    let y = drawClienteBlock(doc, presupuesto, 220);
    y = drawLineas(doc, presupuesto, y);
    y = drawTotals(doc, presupuesto, y);
    drawFooter(doc, presupuesto, y + 12);

    doc.end();
  });
}

type PresupuestoPdfRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: PresupuestoPdfRouteContext) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return new NextResponse("Presupuesto no encontrado", { status: 404 });
  }

  const presupuesto = await getPresupuesto(id);
  if (!presupuesto) {
    return new NextResponse("Presupuesto no encontrado", { status: 404 });
  }

  const pdf = await renderPdf(presupuesto);
  const filename = safeFilename(`presupuesto-${presupuesto.numero}`) || "presupuesto";
  const body = pdf.buffer.slice(
    pdf.byteOffset,
    pdf.byteOffset + pdf.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Content-Length": String(pdf.length),
      "Content-Type": "application/pdf",
    },
  });
}
