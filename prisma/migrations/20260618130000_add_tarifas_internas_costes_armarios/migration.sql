CREATE TABLE "TarifaInterna" (
    "id" SERIAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarifaInterna_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TarifaInterna_categoria_idx"
ON "TarifaInterna"("categoria");

CREATE INDEX "TarifaInterna_nombre_idx"
ON "TarifaInterna"("nombre");

CREATE INDEX "TarifaInterna_activo_idx"
ON "TarifaInterna"("activo");

CREATE INDEX "TarifaInterna_categoria_nombre_idx"
ON "TarifaInterna"("categoria", "nombre");

INSERT INTO "TarifaInterna" ("categoria", "nombre", "unidad", "precio", "activo")
VALUES
  ('Material', 'MDF 19 mm', 'tablero', 68, true),
  ('Material', 'Trasera MDF 10 mm', 'tablero', 24, true),
  ('Herraje', 'Bisagra Blum', 'unidad', 2.90, true),
  ('Herraje', 'Guía cajón', 'juego', 28, true),
  ('Herraje', 'Barra colgar', 'metro', 11, true),
  ('Herraje', 'Soporte barra', 'unidad', 1.20, true),
  ('Material', 'Canto 0.8 mm', 'metro', 0.45, true),
  ('Material', 'Canto 2 mm', 'metro', 0.80, true),
  ('Mano de obra', 'Hora taller', 'hora', 22, true),
  ('Mano de obra', 'Hora montaje', 'hora', 24, true),
  ('Montaje', 'Desplazamiento', 'servicio', 60, true),
  ('Beneficio', 'Margen comercial', 'porcentaje', 35, true),
  ('Beneficio', 'Precio armario m²', 'm2', 0, true);

ALTER TABLE "CalculoArmario"
ADD COLUMN "costeMateriales" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeManoObra" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeTransporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "precioCostes" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "precioJuanser" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "precioFinal" DECIMAL(12,2) NOT NULL DEFAULT 0;
