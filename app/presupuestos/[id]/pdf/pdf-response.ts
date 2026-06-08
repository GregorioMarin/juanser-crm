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
const ivaIncludedText = "IVA incluido en el importe total del presupuesto.";

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
  return new Intl.NumberFormat("es-ES", {
    currency: "EUR",
    currencyDisplay: "symbol",
    style: "currency",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
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

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  yFromTop: number,
  font: PDFFont,
  size: number,
  color = colors.dark,
) {
  drawText(
    page,
    text,
    rightX - font.widthOfTextAtSize(text, size),
    yFromTop,
    font,
    size,
    color,
  );
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  yFromTop: number,
  font: PDFFont,
  size: number,
  color = colors.dark,
) {
  drawText(
    page,
    text,
    centerX - font.widthOfTextAtSize(text, size) / 2,
    yFromTop,
    font,
    size,
    color,
  );
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];

  function splitLongWord(word: string) {
    const chunks: string[] = [];
    let current = "";

    Array.from(word).forEach((character) => {
      const next = `${current}${character}`;
      if (!current || font.widthOfTextAtSize(next, size) <= width) {
        current = next;
        return;
      }

      chunks.push(current);
      current = character;
    });

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  text.split(/\r?\n/).forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let current = "";
    words.forEach((word) => {
      const wordParts =
        font.widthOfTextAtSize(word, size) > width
          ? splitLongWord(word)
          : [word];

      wordParts.forEach((wordPart) => {
        const next = current ? `${current} ${wordPart}` : wordPart;
        if (font.widthOfTextAtSize(next, size) <= width) {
          current = next;
          return;
        }

        if (current) {
          lines.push(current);
        }
        current = wordPart;
      });
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
  const logoSize = logo.scaleToFit(175, 78);
  const budgetBoxWidth = 248;
  const budgetBoxHeight = 136;
  const budgetBoxX = page.getWidth() - margin - budgetBoxWidth;
  const budgetBoxY = page.getHeight() - margin - budgetBoxHeight;
  const budgetInnerX = budgetBoxX + 14;
  const budgetInnerWidth = budgetBoxWidth - 28;
  const headerBottom = margin + 222;

  page.drawImage(logo, {
    x: margin,
    y: page.getHeight() - margin - logoSize.height,
    width: logoSize.width,
    height: logoSize.height,
  });

  const companyX = margin;
  let companyY = margin + logoSize.height + 12;
  const companyLines = [
    ["Carpintería Juanser", fonts.bold, 12, colors.dark],
    ["P.I. San Nicolás", fonts.regular, 9, colors.muted],
    ["Calle San Nicolás 9 Nave 21", fonts.regular, 9, colors.muted],
    ["41500 Alcalá de Guadaíra (Sevilla)", fonts.regular, 9, colors.muted],
    ["Teléfono: 665 13 47 46", fonts.regular, 9, colors.muted],
    ["Email: info@juanser.es", fonts.regular, 9, colors.muted],
    ["Web: https://juanser.es", fonts.regular, 9, colors.muted],
  ] as const;

  companyLines.forEach(([line, font, size, color], index) => {
    if (index === 4) {
      companyY += 6;
    }
    drawText(page, line, companyX, companyY, font, size, color);
    companyY += index === 0 ? 16 : 13;
  });

  page.drawRectangle({
    x: budgetBoxX,
    y: budgetBoxY,
    width: budgetBoxWidth,
    height: budgetBoxHeight,
    color: colors.pale,
    borderColor: colors.border,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: budgetBoxX,
    y: budgetBoxY + 62,
    width: budgetBoxWidth,
    height: 74,
    color: colors.dark,
  });

  drawText(
    page,
    "PRESUPUESTO Nº",
    budgetInnerX,
    margin + 11,
    fonts.bold,
    9,
    colors.white,
  );
  drawWrappedText(
    page,
    presupuesto.numero,
    budgetInnerX,
    margin + 27,
    budgetInnerWidth,
    fonts.bold,
    15,
    16,
    colors.white,
  );
  drawText(
    page,
    `Fecha: ${formatDate(presupuesto.fecha)}`,
    budgetInnerX,
    margin + 92,
    fonts.regular,
    10,
    colors.dark,
  );
  drawText(
    page,
    `Validez: ${presupuesto.validezDias} días`,
    budgetInnerX,
    margin + 114,
    fonts.regular,
    10,
    colors.dark,
  );

  page.drawLine({
    start: { x: margin, y: page.getHeight() - headerBottom },
    end: { x: page.getWidth() - margin, y: page.getHeight() - headerBottom },
    thickness: 1,
    color: colors.border,
  });

  ctx.y = headerBottom + 24;
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
  const headerHeight = 28;
  const paddingX = 14;
  const paddingY = 14;
  const columnGap = 22;
  const columnWidth = (contentWidth - paddingX * 2 - columnGap) / 2;
  const rows = [
    [
      ["Cliente", cliente.nombre],
      ["Teléfono", cliente.telefono || "-"],
    ],
    [
      ["Email", cliente.email || "-"],
      ["Dirección", cliente.direccion || "-"],
    ],
    [["Localidad", cliente.localidad || "-"], null],
  ] as const;
  const rowMeasurements = rows.map(([left, right]) => {
    const leftWidth = right ? columnWidth : contentWidth - paddingX * 2;
    const leftLines = wrapText(left[1], ctx.fonts.regular, 10, leftWidth);
    const rightLines = right
      ? wrapText(right[1], ctx.fonts.regular, 10, columnWidth)
      : [];
    const linesCount = Math.max(leftLines.length, rightLines.length, 1);

    return {
      leftLines,
      rightLines,
      height: 21 + linesCount * 12,
    };
  });
  const contentHeight = rowMeasurements.reduce(
    (sum, row) => sum + row.height,
    0,
  );
  const blockHeight = headerHeight + paddingY * 2 + contentHeight;

  ensureSpace(ctx, blockHeight + 20);

  ctx.page.drawRectangle({
    x: margin,
    y: ctx.page.getHeight() - ctx.y - blockHeight,
    width: contentWidth,
    height: blockHeight,
    color: colors.pale,
    borderColor: colors.border,
    borderWidth: 1,
  });
  ctx.page.drawRectangle({
    x: margin,
    y: ctx.page.getHeight() - ctx.y - 28,
    width: contentWidth,
    height: headerHeight,
    color: colors.dark,
  });
  drawText(
    ctx.page,
    "DATOS DEL CLIENTE",
    margin + paddingX,
    ctx.y + 9,
    ctx.fonts.bold,
    10,
    colors.white,
  );

  let rowY = ctx.y + headerHeight + paddingY;
  rows.forEach(([left, right], index) => {
    const measurement = rowMeasurements[index];
    const leftX = margin + paddingX;
    const rightX = leftX + columnWidth + columnGap;

    drawText(
      ctx.page,
      left[0],
      leftX,
      rowY,
      ctx.fonts.bold,
      8,
      colors.muted,
    );
    measurement.leftLines.forEach((line, lineIndex) => {
      drawText(
        ctx.page,
        line,
        leftX,
        rowY + 12 + lineIndex * 12,
        ctx.fonts.regular,
        10,
        colors.dark,
      );
    });

    if (right) {
      drawText(
        ctx.page,
        right[0],
        rightX,
        rowY,
        ctx.fonts.bold,
        8,
        colors.muted,
      );
      measurement.rightLines.forEach((line, lineIndex) => {
        drawText(
          ctx.page,
          line,
          rightX,
          rowY + 12 + lineIndex * 12,
          ctx.fonts.regular,
          10,
          colors.dark,
        );
      });
    }

    rowY += measurement.height;
  });

  ctx.y += blockHeight + 18;
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
  drawRightText(page, "Cantidad", margin + 310, ctx.y + 8, fonts.bold, 9, colors.white);
  drawRightText(
    page,
    "Precio unitario",
    margin + 408,
    ctx.y + 8,
    fonts.bold,
    9,
    colors.white,
  );
  drawRightText(page, "Importe", margin + contentWidth - 10, ctx.y + 8, fonts.bold, 9, colors.white);
  ctx.y += 30;
}

function drawLineas(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  drawTableHeader(ctx);

  presupuesto.lineas.forEach((linea, index) => {
    const conceptoLines = wrapText(linea.concepto, ctx.fonts.bold, 9, 250);
    const descripcionLines = linea.descripcion
      ? wrapText(linea.descripcion, ctx.fonts.regular, 8, 250)
      : [];
    const conceptoHeight = Math.max(1, conceptoLines.length) * 11;
    const descriptionHeight = linea.descripcion
      ? descripcionLines.length * 11
      : 0;
    const rowHeight = Math.max(34, 16 + conceptoHeight + descriptionHeight);

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

    conceptoLines.forEach((line, lineIndex) => {
      drawText(
        ctx.page,
        line,
        margin + 10,
        ctx.y + 4 + lineIndex * 11,
        ctx.fonts.bold,
        9,
      );
    });

    if (descripcionLines.length > 0) {
      descripcionLines.forEach((line, lineIndex) => drawText(
        ctx.page,
        line,
        margin + 10,
        ctx.y + 6 + conceptoHeight + lineIndex * 11,
        ctx.fonts.regular,
        8,
        colors.muted,
      ));
    }

    drawRightText(
      ctx.page,
      Number(linea.cantidad).toLocaleString("es-ES"),
      margin + 310,
      ctx.y + 8,
      ctx.fonts.regular,
      9,
    );
    drawRightText(
      ctx.page,
      formatCurrency(linea.precioUnitario),
      margin + 408,
      ctx.y + 8,
      ctx.fonts.regular,
      9,
    );
    drawRightText(
      ctx.page,
      formatCurrency(linea.total),
      margin + contentWidth - 10,
      ctx.y + 8,
      ctx.fonts.bold,
      9,
    );

    ctx.y += rowHeight;
  });

  ctx.y += 10;
}

function drawTotals(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  ensureSpace(ctx, 116);

  const boxWidth = 260;
  const x = ctx.page.getWidth() - margin - boxWidth;
  ctx.page.drawRectangle({
    x,
    y: ctx.page.getHeight() - ctx.y - 102,
    width: boxWidth,
    height: 102,
    color: colors.pale,
    borderColor: colors.border,
    borderWidth: 1,
  });
  [
    ["Base imponible", formatCurrency(presupuesto.totalSinIva), ctx.fonts.regular, 10],
    [
      `IVA ${formatPercent(presupuesto.ivaPorcentaje)}%`,
      formatCurrency(presupuesto.totalIva),
      ctx.fonts.regular,
      10,
    ],
    ["TOTAL PRESUPUESTO", formatCurrency(presupuesto.totalConIva), ctx.fonts.bold, 13],
  ].forEach(([label, value, font, size], index) => {
    const rowY = ctx.y + 16 + index * 27;
    if (index === 2) {
      ctx.page.drawRectangle({
        x,
        y: ctx.page.getHeight() - rowY - 20,
        width: boxWidth,
        height: 28,
        color: colors.dark,
      });
    }
    const textColor = index === 2 ? colors.white : colors.dark;
    drawText(
      ctx.page,
      label as string,
      x + 14,
      rowY,
      font as PDFFont,
      size as number,
      textColor,
    );
    drawRightText(
      ctx.page,
      value as string,
      x + boxWidth - 14,
      rowY,
      font as PDFFont,
      size as number,
      textColor,
    );
  });

  ctx.y += 120;
}

function drawFooter(ctx: PdfContext, presupuesto: PresupuestoPdf) {
  ensureSpace(ctx, 110);

  const observaciones = [presupuesto.observaciones, ivaIncludedText]
    .filter(Boolean)
    .join("\n\n");

  drawText(ctx.page, "Observaciones", margin, ctx.y, ctx.fonts.bold, 11);
  ctx.y += 18;
  drawWrappedTextFlow(
    ctx,
    observaciones,
    margin,
    contentWidth,
    ctx.fonts.regular,
    10,
    14,
    colors.muted,
  );
  ctx.y += 18;
}

function drawPageFooters(doc: PDFDocument, fonts: PdfFonts) {
  const pages = doc.getPages();
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    const footerY = 24;
    page.drawLine({
      start: { x: margin, y: 44 },
      end: { x: page.getWidth() - margin, y: 44 },
      thickness: 0.75,
      color: colors.border,
    });
    drawCenteredText(
      page,
      "Gracias por confiar en Carpintería Juanser.",
      page.getWidth() / 2,
      page.getHeight() - footerY,
      fonts.regular,
      9,
      colors.muted,
    );
    drawRightText(
      page,
      `Página ${index + 1} de ${totalPages}`,
      page.getWidth() - margin,
      page.getHeight() - footerY,
      fonts.regular,
      8,
      colors.muted,
    );
  });
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
  drawPageFooters(doc, fonts);

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
