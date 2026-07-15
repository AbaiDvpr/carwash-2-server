import Link from "next/link";

export default function StationNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Мойка не найдена</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Такой автомойки нет в списке.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        На главную
      </Link>
    </div>
  );
}
