"use client";

type WhatsAppPresupuestoLinkProps = {
  nombreCliente: string;
  telefono?: string | null;
  numero: string;
  titulo: string;
  totalConIva: number;
};

const noPhoneMessage = "Este cliente no tiene teléfono para enviar por WhatsApp.";

function normalizeWhatsAppPhone(telefono?: string | null) {
  const digits = telefono?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return null;
  }

  const withoutInternationalPrefix = digits.startsWith("00")
    ? digits.slice(2)
    : digits;

  if (withoutInternationalPrefix.length === 9) {
    return `34${withoutInternationalPrefix}`;
  }

  return withoutInternationalPrefix;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function whatsappMessage({
  nombreCliente,
  numero,
  titulo,
  totalConIva,
}: WhatsAppPresupuestoLinkProps) {
  return `Hola ${nombreCliente}.

Te adjuntamos el presupuesto nº ${numero} correspondiente a ${titulo}.

Importe total: ${formatAmount(totalConIva)} € IVA incluido.

Quedamos a tu disposición para cualquier consulta.

Carpintería Juanser
665 13 47 46`;
}

export function WhatsAppPresupuestoLink(props: WhatsAppPresupuestoLinkProps) {
  const phone = normalizeWhatsAppPhone(props.telefono);
  const className =
    "inline-flex h-9 items-center justify-center rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50";

  if (!phone) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => window.alert(noPhoneMessage)}
          className={className}
        >
          Enviar por WhatsApp
        </button>
        <p className="max-w-40 text-right text-xs font-medium text-rose-700">
          Cliente sin teléfono
        </p>
      </div>
    );
  }

  const message = encodeURIComponent(whatsappMessage(props));
  const href = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      Enviar por WhatsApp
    </a>
  );
}
