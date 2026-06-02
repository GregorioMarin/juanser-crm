-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "categoria" TEXT,
    "contacto" TEXT,
    "direccion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proveedor_nombre_idx" ON "Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Proveedor_categoria_idx" ON "Proveedor"("categoria");

-- CreateIndex
CREATE INDEX "Proveedor_contacto_idx" ON "Proveedor"("contacto");

-- CreateIndex
CREATE INDEX "Proveedor_telefono_idx" ON "Proveedor"("telefono");
