import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./useChatbot.types";
import { BOT_REPLIES, QUICK_REPLIES, formatTime } from "./useChatbot.constants";

export type { ChatMessage } from "./useChatbot.types";
export { QUICK_REPLIES } from "./useChatbot.constants";

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Здравствуйте! Я помощник CarWash. Помогу с оплатой, мойками и промокодами.",
      time: formatTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

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

    window.setTimeout(() => {
      const reply =
        BOT_REPLIES[trimmed] ??
        "Спасибо за вопрос! Пока я в тестовом режиме, но скоро смогу отвечать на всё. А пока выберите один из быстрых вопросов ниже или напишите в поддержку через Профиль.";

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: reply,
          time: formatTime(),
        },
      ]);
      setIsTyping(false);
    }, 900 + Math.random() * 600);
  };

  return {
    messages,
    input,
    isTyping,
    messagesRef,
    setInput,
    sendMessage,
  };
}
