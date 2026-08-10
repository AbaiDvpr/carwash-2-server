"use client";

import { forceLogout } from "@/lib/forceLogout";
import { isAuthDebugEnabled } from "@/lib/authDebug";
import { useAppSelector } from "@/store/hooks";

export default function AuthErrorBlock() {
  const testVersion = useAppSelector((s) => s.app.test_version);
  const authError = useAppSelector((s) => s.app.authError);
  const debug = testVersion || isAuthDebugEnabled();

  if (!debug || !authError) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auth-debug-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-xl dark:border-red-900/50 dark:bg-zinc-950">
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/50">
          <p className="text-[0.75rem] font-medium uppercase tracking-wider text-red-500">
            Debug · почему кинуло на авторизацию
          </p>
          <h2
            id="auth-debug-title"
            className="mt-1 text-base font-semibold text-red-950 dark:text-red-50"
          >
            {authError.reason}
          </h2>
        </div>

        <div className="max-h-[min(55dvh,420px)] space-y-2 overflow-y-auto px-4 py-3 text-[0.8125rem] text-zinc-700 dark:text-zinc-300">
          <dl className="space-y-1">
            {authError.source ? (
              <div>
                <span className="text-zinc-400">source: </span>
                {authError.source}
              </div>
            ) : null}
            {authError.path ? (
              <div>
                <span className="text-zinc-400">path: </span>
                {authError.path}
              </div>
            ) : null}
            {authError.status != null ? (
              <div>
                <span className="text-zinc-400">status: </span>
                {authError.status}
              </div>
            ) : null}
          </dl>

          {authError.detail ? (
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-zinc-100 p-3 text-[0.75rem] leading-snug text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {authError.detail}
            </pre>
          ) : null}
        </div>

        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() =>
              forceLogout({
                confirmed: true,
                reason: authError.reason,
                source: "AuthErrorBlock",
                path: authError.path,
                status: authError.status,
                detail: "Пользователь нажал ОК в debug-модалке",
              })
            }
            className="theme-button w-full rounded-xl px-4 py-3 text-sm font-semibold"
          >
            ОК
          </button>
          <p className="mt-2 text-center text-[0.75rem] text-zinc-400">
            После ОК — выход и переход на авторизацию
          </p>
        </div>
      </div>
    </div>
  );
}
