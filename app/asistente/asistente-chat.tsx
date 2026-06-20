"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./chat-types";

const welcomeMessage =
  "Hola, soy el asistente interno de Juanser. Puedo ayudarte a redactar un WhatsApp, resumir una solicitud, preparar un seguimiento u organizar la información de un presupuesto. ¿En qué trabajamos?";

function messageId() {
  return crypto.randomUUID();
}

function initialMessages(): ChatMessage[] {
  return [{ id: messageId(), role: "assistant", content: welcomeMessage }];
}

export function AsistenteChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function newConversation() {
    setMessages(initialMessages());
    setDraft("");
    setError(null);
    textareaRef.current?.focus();
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    const userMessage: ChatMessage = { id: messageId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/asistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "No se pudo obtener una respuesta.");
      }
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", content: payload.message as string },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg text-white">
            🤖
          </span>
          <div>
            <h2 className="font-semibold text-neutral-950">Chat con la IA</h2>
            <p className="text-xs text-neutral-500">Asistente interno de Carpintería Juanser</p>
          </div>
        </div>
        <button
          type="button"
          onClick={newConversation}
          disabled={sending}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          + Nueva conversación
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-stone-50/70 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" ? (
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm text-white">
                  ✦
                </span>
              ) : null}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                  message.role === "user"
                    ? "rounded-br-md bg-neutral-950 text-white"
                    : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800 shadow-sm"
                }`}
              >
                {message.content}
              </div>
            </article>
          ))}
          {sending ? (
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">✦</span>
              <span className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                Pensando…
              </span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <form onSubmit={sendMessage} className="mx-auto max-w-3xl">
          {error ? (
            <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </p>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-neutral-300 bg-white p-2 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={10_000}
              rows={2}
              disabled={sending}
              placeholder="Escribe tu consulta para la IA…"
              className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-3 py-2 text-sm leading-6 text-neutral-950 outline-none placeholder:text-neutral-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-neutral-500">
            Enter para enviar · Mayús + Enter para nueva línea · El historial no se guarda
          </p>
        </form>
      </div>
    </section>
  );
}

