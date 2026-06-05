import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const clienteExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp4",
  "mov",
  "webm",
]);
const documentExtensions = new Set(["pdf", "xlsx", "docx"]);
const trabajoExtensions = clienteExtensions;
const gastoExtensions = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function uploadsRootDir() {
  return path.resolve(process.cwd(), "uploads");
}

function isSafeSegment(segment: string) {
  return (
    segment.length > 0 &&
    !segment.includes("..") &&
    !segment.includes("/") &&
    !segment.includes("\\") &&
    !segment.includes("\0")
  );
}

function resolveUploadPath(segments: string[]) {
  if (!segments.every(isSafeSegment)) {
    return null;
  }

  const [scope, recordId, thirdSegment, fourthSegment] = segments;
  if (scope === "clientes") {
    if (segments.length !== 4 || !/^\d+$/.test(recordId)) {
      return null;
    }

    if (thirdSegment !== "cliente" && thirdSegment !== "juanser") {
      return null;
    }
  } else if (scope === "proveedores") {
    if (segments.length !== 3 || !/^\d+$/.test(recordId)) {
      return null;
    }
  } else if (scope === "trabajos") {
    if (segments.length !== 3 || !/^\d+$/.test(recordId)) {
      return null;
    }
  } else if (scope === "gastos") {
    if (segments.length !== 3 || !isSafeSegment(recordId)) {
      return null;
    }
  } else {
    return null;
  }

  const fileName = scope === "clientes" ? fourthSegment : thirdSegment;
  const extension = fileName.split(".").pop()?.toLowerCase();
  const allowedExtensions =
    scope === "clientes"
      ? clienteExtensions
      : scope === "trabajos"
        ? trabajoExtensions
        : scope === "gastos"
          ? gastoExtensions
          : documentExtensions;
  if (!extension || !allowedExtensions.has(extension)) {
    return null;
  }

  const rootDir = uploadsRootDir();
  const filePath = path.resolve(rootDir, ...segments);
  const relativeToRoot = path.relative(rootDir, filePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return { filePath, extension };
}

type UploadRouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, context: UploadRouteContext) {
  const { path: segments } = await context.params;
  const resolved = resolveUploadPath(segments);

  if (!resolved) {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }

  const fileStat = await stat(resolved.filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }

  const body = await readFile(resolved.filePath);

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(fileStat.size),
      "Content-Type": contentTypes[resolved.extension],
    },
  });
}
