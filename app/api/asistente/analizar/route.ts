import { cookies } from "next/headers";
import { analizarSolicitudConIA } from "@/app/asistente/analysis";
import { isValidSessionValue, sessionCookieName } from "@/app/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidSessionValue(cookieStore.get(sessionCookieName)?.value)) {
    return Response.json({ error: "Sesión no válida." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const textoValue = formData.get("texto");
    const texto = typeof textoValue === "string" ? textoValue.trim() : "";
    const archivoValue = formData.get("archivo");
    const archivo =
      archivoValue instanceof File && archivoValue.size > 0 ? archivoValue : undefined;

    if (!texto && !archivo) {
      return Response.json(
        { error: "Pega un mensaje o selecciona un archivo para analizar." },
        { status: 400 },
      );
    }
    if (texto.length > 50_000) {
      return Response.json(
        { error: "El texto no puede superar 50.000 caracteres." },
        { status: 400 },
      );
    }
    const extension = archivo?.name.split(".").pop()?.toLowerCase();
    if (
      archivo &&
      (!allowedTypes.has(archivo.type) || !extension || !allowedExtensions.has(extension))
    ) {
      return Response.json(
        { error: "Solo se aceptan archivos PDF, JPG, PNG o WEBP." },
        { status: 400 },
      );
    }
    if (archivo && archivo.size > maxFileSize) {
      return Response.json(
        { error: "El archivo no puede superar 10 MB." },
        { status: 400 },
      );
    }

    return Response.json(await analizarSolicitudConIA({ texto, archivo }));
  } catch (error) {
    console.error("Assistant request failed", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar la solicitud.",
      },
      { status: 500 },
    );
  }
}
