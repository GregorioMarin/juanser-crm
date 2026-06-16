import path from "path";

export function uploadsRootDir() {
  const configuredDir = process.env.UPLOADS_DIR?.trim();
  if (configuredDir) {
    return path.resolve(configuredDir);
  }

  if (process.env.NODE_ENV === "production") {
    return "/app/uploads";
  }

  return path.resolve(process.cwd(), "uploads");
}
