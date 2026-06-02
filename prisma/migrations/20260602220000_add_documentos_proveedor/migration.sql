-- CreateTable
CREATE TABLE "DocumentoProveedor" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "descripcion" TEXT,
    "tamanoBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadProveedor" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActividadProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoProveedor_proveedorId_idx" ON "DocumentoProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "DocumentoProveedor_tipo_idx" ON "DocumentoProveedor"("tipo");

-- CreateIndex
CREATE INDEX "DocumentoProveedor_nombre_idx" ON "DocumentoProveedor"("nombre");

-- CreateIndex
CREATE INDEX "ActividadProveedor_proveedorId_idx" ON "ActividadProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "ActividadProveedor_fecha_idx" ON "ActividadProveedor"("fecha");

-- AddForeignKey
ALTER TABLE "DocumentoProveedor"
ADD CONSTRAINT "DocumentoProveedor_proveedorId_fkey"
FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadProveedor"
ADD CONSTRAINT "ActividadProveedor_proveedorId_fkey"
FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
