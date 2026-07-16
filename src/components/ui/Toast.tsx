"use client";

type ToastProps = {
  message: string | null;
};

export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
        {message}
      </div>
    </div>
  );
}
