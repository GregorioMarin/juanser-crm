-- Split the old mixed client status into commercial and production states.
ALTER TABLE "Cliente"
ADD COLUMN "estadoProduccion" TEXT NOT NULL DEFAULT 'PENDIENTE_PAGO_50';

UPDATE "Cliente"
SET "estadoProduccion" = CASE "estado"
    WHEN 'En fabricación' THEN 'EN_FABRICACION'
    WHEN 'Instalado' THEN 'FINALIZADO'
    WHEN 'FINALIZADO' THEN 'FINALIZADO'
    ELSE "estadoProduccion"
END;

UPDATE "Cliente"
SET "estado" = CASE "estado"
    WHEN 'EN_ESTUDIO' THEN 'PENDIENTE_DAR_PRECIO'
    WHEN 'Nuevo lead' THEN 'PENDIENTE_DAR_PRECIO'
    WHEN 'Visitado' THEN 'PENDIENTE_DAR_PRECIO'
    WHEN 'Presupuesto enviado' THEN 'PENDIENTE_RESPUESTA'
    WHEN 'Pendiente respuesta' THEN 'PENDIENTE_RESPUESTA'
    WHEN 'Aceptado' THEN 'ACEPTADO'
    WHEN 'Perdido' THEN 'PERDIDO'
    WHEN 'En fabricación' THEN 'ACEPTADO'
    WHEN 'Instalado' THEN 'ACEPTADO'
    ELSE "estado"
END;

CREATE INDEX "Cliente_estado_idx" ON "Cliente"("estado");
CREATE INDEX "Cliente_estadoProduccion_idx" ON "Cliente"("estadoProduccion");
