import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchChatbotBootstrap,
  sendChatbotMessage,
  type HotQuestion,
} from "@/lib/api/chatbot";
import { useLocale, useT } from "@/hooks/useT";
import type { ChatMessage } from "./useChatbot.types";
import { formatTime } from "./useChatbot.constants";

export type { ChatMessage } from "./useChatbot.types";

const FALLBACK_HOT: HotQuestion[] = [
  { id: 1, question: "Как оплатить мойку?" },
  { id: 2, question: "Где ближайшая мойка?" },
  { id: 3, question: "Как использовать промокод?" },
  { id: 4, question: "Связаться с оператором" },
];

export function useChatbot() {
  const t = useT();
  const locale = useLocale();
  const welcomeText = t(
    "chatbot.welcome",
    "Здравствуйте! Я помощник CarWash. Помогу с оплатой, мойками и промокодами.",
  );
  const errorFallback = t(
    "chatbot.error",
    "Не удалось получить ответ. Попробуйте ещё раз.",
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: welcomeText, time: "" },
  ]);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>(FALLBACK_HOT);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome"
          ? { ...message, text: welcomeText, time: message.time || formatTime() }
          : message,
      ),
    );
  }, [welcomeText]);

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
                  text: welcomeText,
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
  }, [welcomeText]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = (
    text: string,
    options?: { localReply?: string },
  ) => {
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

    if (options?.localReply) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: options.localReply!,
          time: formatTime(),
        },
      ]);
      return;
    }

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
          locale: locale === "kz" ? "kk" : locale,
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
        let replyText = errorFallback;
        if (err instanceof ApiError) {
          const body = err.body as { message?: string } | null;
          if (body?.message) replyText = body.message;
        } else if (err instanceof Error && err.message) {
          replyText = err.message;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            role: "bot",
            text: replyText,
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
