"use client";

import { useCallback, useEffect, useState } from "react";
import { readUserSession } from "@/lib/userSession";

export function useUserSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const sync = useCallback(() => {
    const session = readUserSession();
    setEmail(session.email);
    setSource(session.source);
  }, []);

  useEffect(() => {
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  return { email, source, sync };
}
