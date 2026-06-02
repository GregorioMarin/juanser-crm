-- AlterTable
ALTER TABLE "Presupuesto"
ADD COLUMN "validezDias" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "observaciones" TEXT,
ADD COLUMN "ivaPorcentaje" DECIMAL(5, 2) NOT NULL DEFAULT 21,
ADD COLUMN "totalSinIva" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "totalIva" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "totalConIva" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Backfill totals for existing one-line-style budgets.
UPDATE "Presupuesto"
SET
  "totalSinIva" = "importe",
  "totalIva" = ROUND(("importe" * "ivaPorcentaje" / 100)::numeric, 2),
  "totalConIva" = ROUND(("importe" + ("importe" * "ivaPorcentaje" / 100))::numeric, 2);

-- CreateTable
CREATE TABLE "PresupuestoLinea" (
    "id" SERIAL NOT NULL,
    "presupuestoId" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DECIMAL(10, 2) NOT NULL,
    "precioUnitario" DECIMAL(12, 2) NOT NULL,
    "total" DECIMAL(12, 2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresupuestoLinea_pkey" PRIMARY KEY ("id")
);

-- Backfill one line per existing budget.
INSERT INTO "PresupuestoLinea" (
    "presupuestoId",
    "concepto",
    "descripcion",
    "cantidad",
    "precioUnitario",
    "total"
)
SELECT
    "id",
    "titulo",
    "descripcion",
    1,
    "importe",
    "importe"
FROM "Presupuesto";

-- CreateIndex
CREATE INDEX "PresupuestoLinea_presupuestoId_idx" ON "PresupuestoLinea"("presupuestoId");

-- AddForeignKey
ALTER TABLE "PresupuestoLinea"
ADD CONSTRAINT "PresupuestoLinea_presupuestoId_fkey"
FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
