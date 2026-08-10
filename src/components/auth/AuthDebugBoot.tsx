"use client";

import { useEffect } from "react";
import { isAuthDebugEnabled } from "@/lib/authDebug";
import { useAppDispatch } from "@/store/hooks";
import { setTestVersion } from "@/store/slices/appSlice";

/** Синхронизирует Redux с константой AUTH_DEBUG из кода. */
export default function AuthDebugBoot() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const enabled = isAuthDebugEnabled();
    dispatch(setTestVersion(enabled));
    if (enabled) {
      console.info(
        "[auth-debug] AUTH_DEBUG=true — перед logout покажется причина.",
      );
    }
  }, [dispatch]);

  return null;
}
