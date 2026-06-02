"use client";

import { useState } from "react";
import { ensurePresupuestoPublicToken } from "./actions";

type WhatsAppPresupuestoLinkProps = {
  presupuestoId: number;
  publicToken?: string | null;
  nombreCliente: string;
  telefono?: string | null;
  numero: string;
  titulo: string;
  totalConIva: number;
};

const noPhoneMessage = "Este cliente no tiene teléfono para enviar por WhatsApp.";
const actionClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-emerald-200 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60";

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
  publicUrl,
}: WhatsAppPresupuestoLinkProps & { publicUrl: string }) {
  return `Hola ${nombreCliente}.

Te enviamos el presupuesto nº ${numero} correspondiente a ${titulo}.

Puedes verlo aquí:
${publicUrl}

Importe total: ${formatAmount(totalConIva)} € IVA incluido.

Quedamos a tu disposición para cualquier consulta.

Carpintería Juanser
665 13 47 46`;
}

export function WhatsAppPresupuestoLink(props: WhatsAppPresupuestoLinkProps) {
  const [token, setToken] = useState(props.publicToken ?? null);
  const [isPending, setIsPending] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  async function publicUrl() {
    const publicToken =
      token ?? (await ensurePresupuestoPublicToken(props.presupuestoId));
    setToken(publicToken);
    return `${window.location.origin}/presupuestos/publico/${publicToken}`;
  }

  async function copyPublicLink() {
    setIsPending(true);
    setCopyState("idle");
    try {
      const url = await publicUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyState("copied");
      } else {
        window.prompt("Copia el enlace público:", url);
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se ha podido generar el enlace público.",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function sendWhatsApp() {
    const phone = normalizeWhatsAppPhone(props.telefono);
    if (!phone) {
      window.alert(noPhoneMessage);
      return;
    }

    setIsPending(true);
    try {
      const url = await publicUrl();
      const message = encodeURIComponent(
        whatsappMessage({ ...props, publicUrl: url }),
      );
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noreferrer");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "No se ha podido generar el enlace público.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={copyPublicLink}
        disabled={isPending}
        className={actionClass}
      >
        {copyState === "copied" ? "Enlace copiado" : "Copiar enlace público"}
      </button>
      <button
        type="button"
        onClick={sendWhatsApp}
        disabled={isPending}
        className={actionClass}
      >
        Enviar enlace por WhatsApp
      </button>
      {!props.telefono ? (
        <p className="max-w-40 text-right text-xs font-medium text-rose-700">
          Cliente sin teléfono
        </p>
      ) : null}
    </div>
  );
}
