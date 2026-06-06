ALTER TABLE "Gasto"
ADD COLUMN "tipoGasto" TEXT NOT NULL DEFAULT 'Otros';

UPDATE "Gasto"
SET "tipoGasto" = 'Materiales'
WHERE "id" IN (
    SELECT DISTINCT "gastoId"
    FROM "GastoLinea"
)
OR "categoria" IN (
    'Tableros',
    'Herrajes',
    'Barnices / pinturas',
    'Ferretería',
    'Herramientas',
    'Cristales',
    'Maquinaria',
    'Material eléctrico',
    'Consumibles'
)
OR lower(coalesce("proveedor", '')) LIKE '%serrer%'
OR lower(coalesce("proveedor", '')) LIKE '%proalca%';

UPDATE "Gasto"
SET "tipoGasto" = 'Vehículos'
WHERE "tipoGasto" <> 'Materiales'
AND (
    lower(coalesce("proveedor", '')) LIKE '%repsol%'
    OR lower(coalesce("categoria", '')) LIKE '%transporte%'
    OR lower(coalesce("descripcion", '')) LIKE '%vehiculo%'
    OR lower(coalesce("descripcion", '')) LIKE '%vehículo%'
);

UPDATE "Gasto"
SET "tipoGasto" = 'Personal'
WHERE "tipoGasto" <> 'Materiales'
AND (
    lower(coalesce("proveedor", '')) LIKE '%seguridad social%'
    OR lower(coalesce("proveedor", '')) LIKE '%nomina%'
    OR lower(coalesce("proveedor", '')) LIKE '%nómina%'
);

UPDATE "Gasto"
SET "tipoGasto" = 'Suministros'
WHERE "tipoGasto" <> 'Materiales'
AND (
    lower(coalesce("proveedor", '')) LIKE '%endesa%'
    OR lower(coalesce("proveedor", '')) LIKE '%iberdrola%'
    OR lower(coalesce("proveedor", '')) LIKE '%agua%'
);

CREATE INDEX "Gasto_tipoGasto_idx" ON "Gasto"("tipoGasto");
