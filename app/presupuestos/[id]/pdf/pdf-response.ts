import {
  PDFDocument,
  PDFImage,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const pageSize: [number, number] = [595.28, 841.89];
const margin = 48;
const contentWidth = pageSize[0] - margin * 2;
const colors = {
  border: rgb(0.82, 0.82, 0.82),
  dark: rgb(0.07, 0.09, 0.15),
  muted: rgb(0.27, 0.27, 0.27),
  pale: rgb(0.96, 0.96, 0.96),
  row: rgb(0.98, 0.98, 0.98),
  white: rgb(1, 1, 1),
};

type PresupuestoPdf = NonNullable<Awaited<ReturnType<typeof getPresupuestoById>>>;
type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};
type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  fonts: PdfFonts;
  y: number;
};

async function loadLogo(doc: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "logo-juanser.jpeg");
  const logoBytes = await readFile(logoPath);
  return doc.embedJpg(logoBytes);
}

async function getPresupuestoById(id: number) {
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

async function getPresupuestoByPublicToken(token: string) {
  return prisma.presupuesto.findUnique({
    where: { publicToken: token },
    include: {
      cliente: true,
      lineas: {
        orderBy: { id: "asc" },
      },
    },
  });
}

function formatCurrency(value: unknown) {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0))} EUR`;
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

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  yFromTop: number,
  font: PDFFont,
  size: number,
  color = colors.dark,
) {
  page.drawText(text, {
    x,
    y: page.getHeight() - yFromTop - size,
    size,
    font,
    color,
  });
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];

  text.split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        current = next;
        return;
      }

      if (current) {
        lines.push(current);
      }
      current = word;
    });

    if (current) {
      lines.push(current);
    }
  });

  return lines;
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  yFromTop: number,
  width: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = colors.dark,
) {
  const lines = wrapText(text, font, size, width);
  lines.forEach((line, index) => {
    if (line) {
      drawText(page, line, x, yFromTop + index * lineHeight, font, size, color);
    }
  });

  return lines.length * lineHeight;
}

function drawWrappedTextFlow(
  ctx: PdfContext,
  text: string,
  x: number,
  width: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = colors.dark,
) {
  const lines = wrapText(text, font, size, width);

  lines.forEach((line) => {
    ensureSpace(ctx, lineHeight);
    if (line) {
      drawText(ctx.page, line, x, ctx.y, font, size, color);
    }
    ctx.y += lineHeight;
  });
}

function addPage(ctx: PdfContext) {
  ctx.page = ctx.doc.addPage(pageSize);
  ctx.y = margin;
}

function ensureSpace(ctx: PdfContext, height: number) {
  if (ctx.y + height > ctx.page.getHeight() - margin) {
    addPage(ctx);
    return true;
  }

  return false;
}

function drawHeader(
  ctx: PdfContext,
  presupuesto: PresupuestoPdf,
  logo: PDFImage,
) {
  const { page, fonts } = ctx;
  const logoSize = logo.scaleToFit(132, 58);

  page.drawImage(logo, {
    x: margin,
    y: page.getHeight() - margin - logoSize.height,
    width: logoSize.width,
    height: logoSize.height,
  });
  drawText(page, "Carpintería Juanser", margin, 112, fonts.bold, 13);
  drawWrappedText(
    page,
    "P.I. San Nicolás, Calle San Nicolás 9 Nave 21, 41500 Alcalá de Guadaíra, Sevilla",
    margin,
    132,
    340,
    fonts.regular,
    10,
    13,
    colors.muted,
  );
  drawText(
    page,
    "Teléfonos: 665 13 47 46 / 655 69 39 63",
    margin,
    162,
    fonts.regular,
    10,
    colors.muted,
  );

  page.drawRectangle({
    x: page.getWidth() - 210,
    y: page.getHeight() - margin - 76,
    width: 162,
    height: 76,
    color: colors.pale,
    borderColor: colors.border,
    borderWidth: 1,
  });
  drawText(page, "PRESUPUESTO", page.getWidth() - 190, margin + 16, fonts.bold, 10);
  drawText(
    page,
    presupuesto.numero,
    page.getWidth() - 190,
    margin + 36,
    fonts.bold,
    13,
  );

  ctx.y = 196;
}

function drawIntro(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  drawWrappedText(
    ctx.page,
    presupuesto.titulo,
    margin,
    ctx.y,
    contentWidth,
    ctx.fonts.bold,
    16,
    20,
  );
  ctx.y += 26;
  ctx.y += drawWrappedText(
    ctx.page,
    presupuesto.descripcion,
    margin,
    ctx.y,
    contentWidth,
    ctx.fonts.regular,
    10,
    14,
    colors.muted,
  );
  ctx.y += 24;
}

function drawClienteBlock(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  const { cliente } = presupuesto;
  const metaX = ctx.page.getWidth() - 230;
  ensureSpace(ctx, 116);

  drawText(ctx.page, "Datos del cliente", margin, ctx.y, ctx.fonts.bold, 12);
  ctx.y += 20;

  [
    cliente.nombre,
    `Teléfono: ${cliente.telefono || "-"}`,
    `Email: ${cliente.email || "-"}`,
    `Dirección: ${cliente.direccion || "-"}`,
    `Localidad: ${cliente.localidad || "-"}`,
  ].forEach((line, index) => {
    drawText(
      ctx.page,
      line,
      margin,
      ctx.y + index * 16,
      index === 0 ? ctx.fonts.bold : ctx.fonts.regular,
      10,
      index === 0 ? colors.dark : colors.muted,
    );
  });

  [
    `Número: ${presupuesto.numero}`,
    `Fecha: ${formatDate(presupuesto.fecha)}`,
    `Validez: ${presupuesto.validezDias} días`,
  ].forEach((line, index) => {
    drawText(
      ctx.page,
      line,
      metaX,
      ctx.y + index * 18,
      index === 0 ? ctx.fonts.bold : ctx.fonts.regular,
      10,
      index === 0 ? colors.dark : colors.muted,
    );
  });

  ctx.y += 96;
}

function drawTableHeader(ctx: PdfContext) {
  const { page, fonts } = ctx;
  ensureSpace(ctx, 30);

  page.drawRectangle({
    x: margin,
    y: page.getHeight() - ctx.y - 24,
    width: contentWidth,
    height: 24,
    color: colors.dark,
  });
  drawText(page, "Concepto", margin + 10, ctx.y + 8, fonts.bold, 9, colors.white);
  drawText(page, "Cant.", margin + 280, ctx.y + 8, fonts.bold, 9, colors.white);
  drawText(page, "Precio", margin + 342, ctx.y + 8, fonts.bold, 9, colors.white);
  drawText(page, "Total", margin + 430, ctx.y + 8, fonts.bold, 9, colors.white);
  ctx.y += 30;
}

function drawLineas(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  drawTableHeader(ctx);

  presupuesto.lineas.forEach((linea, index) => {
    const descriptionHeight = linea.descripcion
      ? wrapText(linea.descripcion, ctx.fonts.regular, 8, 250).length * 11
      : 0;
    const rowHeight = Math.max(34, 24 + descriptionHeight);

    if (ensureSpace(ctx, rowHeight + 30)) {
      drawTableHeader(ctx);
    }

    if (index % 2 === 0) {
      ctx.page.drawRectangle({
        x: margin,
        y: ctx.page.getHeight() - ctx.y - rowHeight + 4,
        width: contentWidth,
        height: rowHeight,
        color: colors.row,
      });
    }

    drawWrappedText(
      ctx.page,
      linea.concepto,
      margin + 10,
      ctx.y + 4,
      250,
      ctx.fonts.bold,
      9,
      11,
    );

    if (linea.descripcion) {
      drawWrappedText(
        ctx.page,
        linea.descripcion,
        margin + 10,
        ctx.y + 18,
        250,
        ctx.fonts.regular,
        8,
        11,
        colors.muted,
      );
    }

    drawText(
      ctx.page,
      Number(linea.cantidad).toLocaleString("es-ES"),
      margin + 280,
      ctx.y + 8,
      ctx.fonts.regular,
      9,
    );
    drawText(
      ctx.page,
      formatCurrency(linea.precioUnitario),
      margin + 334,
      ctx.y + 8,
      ctx.fonts.regular,
      9,
    );
    drawText(
      ctx.page,
      formatCurrency(linea.total),
      margin + 426,
      ctx.y + 8,
      ctx.fonts.bold,
      9,
    );

    ctx.y += rowHeight;
  });

  ctx.y += 10;
}

function drawTotals(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  ensureSpace(ctx, 98);

  ctx.page.drawLine({
    start: { x: margin, y: ctx.page.getHeight() - ctx.y },
    end: { x: ctx.page.getWidth() - margin, y: ctx.page.getHeight() - ctx.y },
    thickness: 1,
    color: colors.border,
  });

  const x = ctx.page.getWidth() - 250;
  [
    ["Base imponible", formatCurrency(presupuesto.totalSinIva), ctx.fonts.regular, 10],
    [
      `IVA ${formatPercent(presupuesto.ivaPorcentaje)}%`,
      formatCurrency(presupuesto.totalIva),
      ctx.fonts.regular,
      10,
    ],
    ["Total", formatCurrency(presupuesto.totalConIva), ctx.fonts.bold, 12],
  ].forEach(([label, value, font, size], index) => {
    const rowY = ctx.y + 14 + index * 22;
    drawText(ctx.page, label as string, x, rowY, font as PDFFont, size as number);
    drawText(
      ctx.page,
      value as string,
      x + 106,
      rowY,
      font as PDFFont,
      size as number,
    );
  });

  ctx.y += 92;
}

function drawFooter(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  ensureSpace(ctx, 110);

  if (presupuesto.observaciones) {
    drawText(ctx.page, "Observaciones", margin, ctx.y, ctx.fonts.bold, 11);
    ctx.y += 18;
    drawWrappedTextFlow(
      ctx,
      presupuesto.observaciones,
      margin,
      contentWidth,
      ctx.fonts.regular,
      10,
      14,
      colors.muted,
    );
    ctx.y += 18;
  }

  ensureSpace(ctx, 26);
  drawWrappedText(
    ctx.page,
    "Presupuesto sujeto a aceptación y disponibilidad de materiales.",
    margin,
    ctx.y,
    contentWidth,
    ctx.fonts.regular,
    9,
    12,
    colors.muted,
  );
}

async function renderPdf(presupuesto: PresupuestoPdf) {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const logo = await loadLogo(doc);

  const ctx: PdfContext = {
    doc,
    page: doc.addPage(pageSize),
    fonts,
    y: margin,
  };

  drawHeader(ctx, presupuesto, logo);
  drawClienteBlock(ctx, presupuesto);
  drawIntro(ctx, presupuesto);
  drawLineas(ctx, presupuesto);
  drawTotals(ctx, presupuesto);
  drawFooter(ctx, presupuesto);

  return doc.save();
}

export async function presupuestoPdfResponse(
  rawId: string,
  disposition: "attachment" | "inline",
) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return new NextResponse("Presupuesto no encontrado", { status: 404 });
  }

  const presupuesto = await getPresupuestoById(id);
  return presupuestoPdfResponseFromRecord(presupuesto, disposition);
}

function validPublicToken(token: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    token,
  );
}

export async function presupuestoPdfResponseByToken(
  token: string,
  disposition: "attachment" | "inline",
) {
  if (!validPublicToken(token)) {
    return new NextResponse("Presupuesto no encontrado", { status: 404 });
  }

  const presupuesto = await getPresupuestoByPublicToken(token);
  return presupuestoPdfResponseFromRecord(presupuesto, disposition);
}

async function presupuestoPdfResponseFromRecord(
  presupuesto: PresupuestoPdf | null,
  disposition: "attachment" | "inline",
) {
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
      "Content-Disposition": `${disposition}; filename="${filename}.pdf"`,
      "Content-Length": String(pdf.length),
      "Content-Type": "application/pdf",
    },
  });
}
