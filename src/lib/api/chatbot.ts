import { apiFetch } from "@/lib/api";

export type HotQuestion = {
  id: number;
  question: string;
};

export type ChatbotBootstrap = {
  welcome_message: string;
  hot_questions: HotQuestion[];
};

export type ChatHistoryItem = {
  role: "user" | "assistant" | "bot";
  content: string;
};

export function fetchChatbotBootstrap(): Promise<ChatbotBootstrap> {
  return apiFetch<ChatbotBootstrap>("/api/chatbot/bootstrap");
}

export function sendChatbotMessage(input: {
  message: string;
  history?: ChatHistoryItem[];
}): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>("/api/chatbot/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
