import { useCallback, useState } from "react";
import {
  applyReferralCode,
  referralErrorMessage,
} from "@/lib/api/referral";
import type { AuthUser } from "@/lib/api/auth";

export function usePromoCode(options?: {
  hasReferrer?: boolean;
  onApplied?: (user: AuthUser) => void;
}) {
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoError, setPromoError] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyPromo = useCallback(async () => {
    if (options?.hasReferrer) {
      setPromoError(true);
      setPromoMessage("Вы уже зашли через промокод");
      return;
    }

    const trimmed = promoCode.trim().toUpperCase();
    if (!trimmed) {
      setPromoError(true);
      setPromoMessage("Введите промокод");
      return;
    }

    setBusy(true);
    setPromoMessage(null);
    setPromoError(false);

    try {
      const data = await applyReferralCode(trimmed);
      setPromoError(false);
      setPromoMessage(data.message);
      setPromoCode("");
      options?.onApplied?.(data.user);
    } catch (error) {
      setPromoError(true);
      setPromoMessage(
        referralErrorMessage(error, "Не удалось применить промокод"),
      );
    } finally {
      setBusy(false);
    }
  }, [options, promoCode]);

  const updatePromoCode = (value: string) => {
    setPromoCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
    setPromoMessage(null);
    setPromoError(false);
  };

  return {
    promoCode,
    promoMessage,
    promoError,
    busy,
    applyPromo,
    updatePromoCode,
  };
}
