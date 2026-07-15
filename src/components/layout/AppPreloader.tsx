export default function AppPreloader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95"
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">CW</span>
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Загрузка...</p>
      </div>
    </div>
  );
}
