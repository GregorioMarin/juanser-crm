import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
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
  if (segments.length !== 4 || !segments.every(isSafeSegment)) {
    return null;
  }

  const [scope, clienteId, tipo, fileName] = segments;
  if (scope !== "clientes") {
    return null;
  }

  if (!/^\d+$/.test(clienteId)) {
    return null;
  }

  if (tipo !== "cliente" && tipo !== "juanser") {
    return null;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
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
