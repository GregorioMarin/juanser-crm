-- AlterTable
ALTER TABLE "Presupuesto"
ADD COLUMN "publicToken" TEXT,
ADD COLUMN "publicTokenCreatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_publicToken_key" ON "Presupuesto"("publicToken");
