"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import { openTelegram, openWhatsApp } from "@/lib/messengerController";
import { useAppSelector } from "@/store/hooks";
import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import { useChatbot } from "./hooks/useChatbot";
import "./chatbot.css";

type ChatMode = "gate" | "chat";

function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="5" y="7" width="14" height="11" rx="3" />
      <path strokeLinecap="round" d="M12 3.5v3.5M9 12.5h.01M15 12.5h.01M9 17.5h6" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.5 4.3 2.9 11.4c-1.3.5-1.3 1.2-.2 1.5l4.7 1.5 1.8 5.5c.2.7.4.9 1 .9.6 0 .9-.3 1.2-.6l2.7-2.6 5.6 4.1c1 .6 1.8.3 2.1-.9L22.9 5.7c.3-1.3-.5-1.9-1.4-1.4Z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2A9.7 9.7 0 0 0 3.4 16.1L2 22l6-1.6A9.8 9.8 0 1 0 12 2.2Zm0 17.7c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.6.9.9-3.5-.2-.3a7.7 7.7 0 1 1 7.5 4.3Zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.1-.3.2-.5.1a6.4 6.4 0 0 1-3-2.6c-.2-.3 0-.4.1-.6l.5-.6c.1-.1.1-.3.1-.4l-.7-1.7c-.1-.3-.3-.3-.5-.3h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 2.3.9 2.3.6 2.7.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function ChatGate({ onOpenBot }: { onOpenBot: () => void }) {
  const t = useT();
  const support = useAppSelector((state) => state.variables.support);

  return (
    <div className="chat-gate">
      <header className="chat-gate__hero">
        <BotAvatar />
        <h1 className="chat-gate__title">{t("chatbot.title", "Помощник CarWash")}</h1>
        <p className="chat-gate__hint theme-description">
          {t("chatbot.gate_hint", "Выберите, как связаться с поддержкой")}
        </p>
      </header>

      <section className="chat-gate__card" aria-label={t("chatbot.gate_title", "Связаться")}>
        <button type="button" className="chat-gate__row theme-hover" onClick={onOpenBot}>
          <span className="chat-gate__icon chat-gate__icon--bot" aria-hidden>
            <IconBot />
          </span>
          <span className="chat-gate__main">
            <span className="chat-gate__label">{t("chatbot.open_bot", "Чат-бот")}</span>
            <span className="chat-gate__sub theme-description">
              {t("chatbot.open_bot_hint", "Ответы прямо в приложении")}
            </span>
          </span>
          <svg className="chat-gate__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="chat-gate__row theme-hover"
          onClick={() => openWhatsApp(support.whatsapp.url)}
        >
          <span className="chat-gate__icon chat-gate__icon--wa" aria-hidden>
            <IconWhatsApp />
          </span>
          <span className="chat-gate__main">
            <span className="chat-gate__label">{support.whatsapp.title}</span>
            <span className="chat-gate__sub theme-description">{support.whatsapp.hint}</span>
          </span>
          <svg className="chat-gate__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="chat-gate__row theme-hover"
          onClick={() => openTelegram(support.telegram.url)}
        >
          <span className="chat-gate__icon chat-gate__icon--tg" aria-hidden>
            <IconTelegram />
          </span>
          <span className="chat-gate__main">
            <span className="chat-gate__label">{support.telegram.title}</span>
            <span className="chat-gate__sub theme-description">{support.telegram.hint}</span>
          </span>
          <svg className="chat-gate__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </section>
    </div>
  );
}

function ChatRoom({ onBack }: { onBack: () => void }) {
  const t = useT();
  const {
    messages,
    hotQuestions,
    input,
    isTyping,
    messagesRef,
    setInput,
    sendMessage,
  } = useChatbot();

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="chat-room__back"
            onClick={onBack}
            aria-label={t("common.back", "Назад")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <BotAvatar />
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("chatbot.title", "Помощник CarWash")}
            </h1>
            <p className="flex items-center gap-1.5 text-[0.8125rem] text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("chatbot.online", "Онлайн")}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={messagesRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch]"
      >
        {messages.map((message) =>
          message.role === "bot" ? (
            <div key={message.id} className="flex items-end gap-2">
              <BotAvatar />
              <div className="max-w-[85%]">
                <div className="rounded-xl rounded-bl-md bg-zinc-100 px-3 py-2 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                  {message.id === "welcome"
                    ? t("chatbot.welcome", message.text)
                    : message.text}
                </div>
                <p className="mt-1 px-1 text-[0.75rem] text-zinc-400">{message.time}</p>
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="rounded-xl rounded-br-md bg-blue-600 px-3 py-2 text-xs leading-relaxed text-white">
                  {message.text}
                </div>
                <p className="mt-1 px-1 text-right text-[0.75rem] text-zinc-400">{message.time}</p>
              </div>
            </div>
          ),
        )}

        {isTyping && <TypingIndicator />}
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {hotQuestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => sendMessage(item.question)}
              disabled={isTyping}
              className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[0.8125rem] font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {item.question}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatbot.placeholder", "Напишите сообщение...")}
            disabled={isTyping}
            className="min-w-0 flex-1 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-900 outline-none ring-blue-500 transition focus:bg-white focus:ring-2 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("chatbot.send", "Отправить")}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3.478 2.405a.75.75 0 0 0-.712.082L2.4 2.55a.75.75 0 0 0-.282.983l3.478 7.005L2.118 17.543a.75.75 0 0 0 .36.98l1.116.447a.75.75 0 0 0 .98-.36l2.303-5.74 5.74-2.303a.75.75 0 0 0 .36-.98l-.447-1.116a.75.75 0 0 0-.98-.36l-5.74 2.303-7.005-3.478a.75.75 0 0 0-.983.282Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const t = useT();
  const [mode, setMode] = useState<ChatMode>("gate");

  return (
    <PageLayout
      title={t("chatbot.title", "Помощник CarWash")}
      description={t("chatbot.title", "Помощник CarWash")}
      className={mode === "chat" ? "page--chat" : "page--chat-gate"}
      bare
    >
      {mode === "gate" ? (
        <ChatGate onOpenBot={() => setMode("chat")} />
      ) : (
        <ChatRoom onBack={() => setMode("gate")} />
      )}
    </PageLayout>
  );
}
