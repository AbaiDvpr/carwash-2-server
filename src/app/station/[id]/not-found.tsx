import Link from "next/link";

export default function StationNotFound() {
  return (
    <div className="page-content text-center">
      <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Мойка не найдена</h1>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Такой автомойки нет в списке.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
      >
        На главную
      </Link>
    </div>
  );
}
