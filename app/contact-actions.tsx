function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function spanishWhatsAppPhone(value: string) {
  const digits = cleanPhone(value);
  const withoutInternationalPrefix = digits.startsWith("0034")
    ? digits.slice(2)
    : digits;

  return withoutInternationalPrefix.length === 9
    ? `34${withoutInternationalPrefix}`
    : withoutInternationalPrefix;
}

const linkClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-neutral-300 bg-white px-2.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100";

export function PhoneContactActions({
  telefono,
}: {
  telefono?: string | null;
}) {
  if (!telefono) {
    return "-";
  }

  const telHref = `tel:${cleanPhone(telefono)}`;
  const whatsappHref = `https://wa.me/${spanishWhatsAppPhone(telefono)}`;

  return (
    <details className="group w-fit">
      <summary className="cursor-pointer list-none font-medium text-emerald-800 transition hover:text-emerald-950 group-open:mb-2 [&::-webkit-details-marker]:hidden">
        {telefono}
      </summary>
      <div className="flex flex-wrap gap-2">
        <a className={linkClass} href={telHref}>
          Llamar
        </a>
        <a
          className={linkClass}
          href={whatsappHref}
          rel="noreferrer"
          target="_blank"
        >
          WhatsApp
        </a>
      </div>
    </details>
  );
}

export function EmailContactAction({ email }: { email?: string | null }) {
  if (!email) {
    return "-";
  }

  return (
    <a
      className="font-medium text-emerald-800 transition hover:text-emerald-950"
      href={`mailto:${email}`}
    >
      {email}
    </a>
  );
}

