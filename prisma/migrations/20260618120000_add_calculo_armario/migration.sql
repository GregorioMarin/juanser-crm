CREATE TABLE "CalculoArmario" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anchoCm" DECIMAL(10,2) NOT NULL,
    "altoCm" DECIMAL(10,2) NOT NULL,
    "fondoCm" DECIMAL(10,2) NOT NULL,
    "tipoPuertas" TEXT NOT NULL,
    "numeroPuertas" INTEGER NOT NULL,
    "numeroModulos" INTEGER NOT NULL,
    "numeroCajones" INTEGER NOT NULL,
    "numeroBaldas" INTEGER NOT NULL,
    "numeroBarras" INTEGER NOT NULL,
    "tipoTrasera" TEXT NOT NULL,
    "materialPrincipal" TEXT NOT NULL,
    "grosorPrincipalMm" INTEGER NOT NULL,
    "observaciones" TEXT,
    "metrosFrontales" DECIMAL(10,3) NOT NULL,
    "metrosTableroPrincipal" DECIMAL(10,3) NOT NULL,
    "tablerosPrincipales" INTEGER NOT NULL,
    "metrosTrasera" DECIMAL(10,3) NOT NULL,
    "tablerosTrasera" INTEGER NOT NULL,
    "metrosCanto" DECIMAL(10,2) NOT NULL,
    "bisagras" INTEGER NOT NULL,
    "guiasCajon" INTEGER NOT NULL,
    "metrosBarra" DECIMAL(10,2) NOT NULL,
    "complejidad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculoArmario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalculoArmario_fecha_idx"
ON "CalculoArmario"("fecha");

CREATE INDEX "CalculoArmario_createdAt_idx"
ON "CalculoArmario"("createdAt");

CREATE INDEX "CalculoArmario_tipoPuertas_idx"
ON "CalculoArmario"("tipoPuertas");

CREATE INDEX "CalculoArmario_complejidad_idx"
ON "CalculoArmario"("complejidad");
