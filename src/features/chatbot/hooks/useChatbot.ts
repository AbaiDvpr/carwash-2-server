import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchChatbotBootstrap,
  sendChatbotMessage,
  type HotQuestion,
} from "@/lib/api/chatbot";
import type { ChatMessage } from "./useChatbot.types";
import { formatTime } from "./useChatbot.constants";

export type { ChatMessage } from "./useChatbot.types";

const FALLBACK_WELCOME =
  "Здравствуйте! Я помощник CarWash. Помогу с оплатой, мойками и промокодами.";

const FALLBACK_HOT: HotQuestion[] = [
  { id: 1, question: "Как оплатить мойку?" },
  { id: 2, question: "Где ближайшая мойка?" },
  { id: 3, question: "Как использовать промокод?" },
  { id: 4, question: "Связаться с оператором" },
];

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string } | null;
    if (body?.message) return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Не удалось получить ответ. Попробуйте ещё раз.";
}

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: FALLBACK_WELCOME, time: "" },
  ]);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>(FALLBACK_HOT);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome" && !message.time
          ? { ...message, time: formatTime() }
          : message,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchChatbotBootstrap();
        if (cancelled) return;
        setHotQuestions(
          data.hot_questions.length > 0 ? data.hot_questions : FALLBACK_HOT,
        );
        setMessages((prev) =>
          prev.map((message) =>
            message.id === "welcome"
              ? {
                  ...message,
                  text: data.welcome_message || FALLBACK_WELCOME,
                  time: message.time || formatTime(),
                }
              : message,
          ),
        );
      } catch {
        // fallback локальный
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      time: formatTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    void (async () => {
      try {
        const history = [...messages, userMessage]
          .filter((m) => m.id !== "welcome")
          .slice(-12)
          .map((m) => ({
            role: (m.role === "bot" ? "assistant" : "user") as
              | "assistant"
              | "user",
            content: m.text,
          }));

        // текущее сообщение уже уйдёт отдельно — не дублируем в history
        const historyWithoutLast = history.slice(0, -1);

        const { reply } = await sendChatbotMessage({
          message: trimmed,
          history: historyWithoutLast,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            text: reply,
            time: formatTime(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            role: "bot",
            text: errorText(err),
            time: formatTime(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  return {
    messages,
    hotQuestions,
    input,
    isTyping,
    messagesRef,
    setInput,
    sendMessage,
  };
}
