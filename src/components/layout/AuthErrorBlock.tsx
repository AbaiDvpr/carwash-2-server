"use client";

import { forceLogout } from "@/lib/forceLogout";
import { useAppSelector } from "@/store/hooks";

export default function AuthErrorBlock() {
  const testVersion = useAppSelector((s) => s.app.test_version);
  const authError = useAppSelector((s) => s.app.authError);

  if (!testVersion || !authError) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-red-200 bg-red-50 px-4 py-3 text-left shadow-lg dark:border-red-900/60 dark:bg-red-950/95"
      role="alert"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-red-500">
            Test · auth error
          </p>
          <p className="mt-1 text-sm font-semibold text-red-900 dark:text-red-100">
            {authError.reason}
          </p>
          <dl className="mt-2 space-y-0.5 text-[11px] text-red-800/90 dark:text-red-200/90">
            {authError.source && (
              <div>
                <span className="text-red-500">source: </span>
                {authError.source}
              </div>
            )}
            {authError.path && (
              <div>
                <span className="text-red-500">path: </span>
                {authError.path}
              </div>
            )}
            {authError.status != null && (
              <div>
                <span className="text-red-500">status: </span>
                {authError.status}
              </div>
            )}
          </dl>
          {authError.detail && (
            <pre className="mt-2 max-h-28 overflow-auto rounded bg-red-100/80 p-2 text-[10px] leading-snug text-red-950 dark:bg-red-900/50 dark:text-red-50">
              {authError.detail}
            </pre>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            forceLogout({
              immediate: true,
              reason: "Пользователь нажал «Выйти» в auth error-блоке",
              source: "AuthErrorBlock",
            })
          }
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
