"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { useT } from "@/hooks/useT";
import { openTelegram, openWhatsApp } from "@/lib/messengerController";
import { useAppSelector } from "@/store/hooks";
import ProfileNavRow from "@/features/profile/components/ProfileNavRow";
import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import { useChatbot } from "./hooks/useChatbot";
import "@/features/profile/components/profile.css";
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 4.5 3.5 11.8l5.2 1.7 1.7 5.2L21 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.7 13.5 8.6-6.2" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5a7.5 7.5 0 0 1 6.4 11.4L19.5 19.5l-3.8-1a7.5 7.5 0 1 1-3.7-14Z"
      />
      <path strokeLinecap="round" d="M9.5 10.5c.3 1.6 1.9 3.2 3.5 3.5l1.2-1.2c.2-.2.5-.2.7-.1l1.3.5c.3.1.4.4.3.7-.4 1.2-1.7 2-3 .9-2.2-1.8-3.8-4.3-3.9-6.8 0-1.2.8-2.1 1.8-2.1.3 0 .5.2.6.5l.5 1.3c.1.2 0 .5-.1.7l-.9 1.1Z" />
    </svg>
  );
}

function ChatGate({ onOpenBot }: { onOpenBot: () => void }) {
  const t = useT();
  const support = useAppSelector((state) => state.variables.support);

  return (
    <div className="chat-gate">
      <header className="chat-gate__hero">
        <BotAvatar size="lg" />
        <h1 className="chat-gate__title">{t("chatbot.title", "Помощник CarWash")}</h1>
        <p className="chat-gate__hint theme-description">
          {t("chatbot.gate_hint", "Выберите, как связаться с поддержкой")}
        </p>
      </header>

      <section className="profile-card" aria-label={t("chatbot.gate_title", "Связаться")}>
        <ProfileNavRow
          icon={<IconBot />}
          label={t("chatbot.open_bot", "Чат-бот")}
          hint={t("chatbot.open_bot_hint", "Ответы прямо в приложении")}
          onClick={onOpenBot}
        />
        <ProfileNavRow
          icon={<IconWhatsApp />}
          label={support.whatsapp.title}
          hint={support.whatsapp.hint}
          onClick={() => openWhatsApp(support.whatsapp.url)}
        />
        <ProfileNavRow
          icon={<IconTelegram />}
          label={support.telegram.title}
          hint={support.telegram.hint}
          onClick={() => openTelegram(support.telegram.url)}
        />
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
    <div className="chat-room">
      <div className="chat-room__header">
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
        <div className="chat-room__heading">
          <h1 className="chat-room__title">{t("chatbot.title", "Помощник CarWash")}</h1>
          <p className="chat-room__status">
            <span className="chat-room__status-dot" aria-hidden />
            {t("chatbot.online", "Онлайн")}
          </p>
        </div>
      </div>

      <div ref={messagesRef} className="chat-room__messages">
        {messages.map((message) =>
          message.role === "bot" ? (
            <div key={message.id} className="chat-bubble-row chat-bubble-row--bot">
              <BotAvatar />
              <div className="chat-bubble-wrap">
                <div className="chat-bubble chat-bubble--bot">
                  {message.id === "welcome"
                    ? t("chatbot.welcome", message.text)
                    : message.text}
                </div>
                <p className="chat-bubble__time">{message.time}</p>
              </div>
            </div>
          ) : (
            <div key={message.id} className="chat-bubble-row chat-bubble-row--user">
              <div className="chat-bubble-wrap chat-bubble-wrap--end">
                <div className="chat-bubble chat-bubble--user">{message.text}</div>
                <p className="chat-bubble__time chat-bubble__time--end">{message.time}</p>
              </div>
            </div>
          ),
        )}

        {isTyping ? <TypingIndicator /> : null}
      </div>

      <div className="chat-room__composer">
        <div className="chat-room__chips">
          {hotQuestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => sendMessage(item.question)}
              disabled={isTyping}
              className="chat-room__chip"
            >
              {item.question}
            </button>
          ))}
        </div>

        <form
          className="chat-room__form"
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
            className="chat-room__input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="chat-room__send"
            aria-label={t("chatbot.send", "Отправить")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
