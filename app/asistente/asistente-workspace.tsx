"use client";

import { useState } from "react";
import { AsistenteChat } from "./asistente-chat";
import { AsistenteClient } from "./asistente-client";

type AssistantMode = "analysis" | "chat";

export function AsistenteWorkspace() {
  const [mode, setMode] = useState<AssistantMode>("analysis");

  return (
    <>
      <div className="mb-5 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={mode === "analysis"}
          onClick={() => setMode("analysis")}
          className={`rounded-xl px-5 py-3.5 text-left transition ${
            mode === "analysis"
              ? "bg-neutral-950 text-white shadow-sm"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <span className="block text-sm font-bold">Analizar solicitud</span>
          <span
            className={`mt-1 block text-xs ${
              mode === "analysis" ? "text-neutral-300" : "text-neutral-500"
            }`}
          >
            Extrae datos y crea acciones en el CRM
          </span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "chat"}
          onClick={() => setMode("chat")}
          className={`rounded-xl px-5 py-3.5 text-left transition ${
            mode === "chat"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          <span className="block text-sm font-bold">🤖 Iniciar chat con la IA</span>
          <span
            className={`mt-1 block text-xs ${
              mode === "chat" ? "text-emerald-100" : "text-emerald-700"
            }`}
          >
            Redacta, resume y prepara tu siguiente paso
          </span>
        </button>
      </div>

      {mode === "analysis" ? <AsistenteClient /> : <AsistenteChat />}
    </>
  );
}

