"use client";

import { PageLayout } from "@/components/layout";
import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import { QUICK_REPLIES, useChatbot } from "./hooks/useChatbot";

export default function ChatbotPage() {
  const { messages, input, isTyping, messagesRef, setInput, sendMessage } = useChatbot();

  return (
    <PageLayout title="Chatbot" description="Чат-бот CarWash" className="page--chat">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col">
        <div className="shrink-0 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <BotAvatar />
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Помощник CarWash
              </h1>
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Онлайн
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
                    {message.text}
                  </div>
                  <p className="mt-1 px-1 text-[10px] text-zinc-400">{message.time}</p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="rounded-xl rounded-br-md bg-blue-600 px-3 py-2 text-xs leading-relaxed text-white">
                    {message.text}
                  </div>
                  <p className="mt-1 px-1 text-right text-[10px] text-zinc-400">{message.time}</p>
                </div>
              </div>
            ),
          )}

          {isTyping && <TypingIndicator />}
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => sendMessage(reply)}
                disabled={isTyping}
                className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {reply}
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
              placeholder="Напишите сообщение..."
              disabled={isTyping}
              className="min-w-0 flex-1 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-900 outline-none ring-blue-500 transition focus:bg-white focus:ring-2 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Отправить"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3.478 2.405a.75.75 0 0 0-.712.082L2.4 2.55a.75.75 0 0 0-.282.983l3.478 7.005L2.118 17.543a.75.75 0 0 0 .36.98l1.116.447a.75.75 0 0 0 .98-.36l2.303-5.74 5.74-2.303a.75.75 0 0 0 .36-.98l-.447-1.116a.75.75 0 0 0-.98-.36l-5.74 2.303-7.005-3.478a.75.75 0 0 0-.983.282Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
}
