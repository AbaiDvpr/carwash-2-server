import { useState } from "react";

export function usePromoCode() {
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const applyPromo = () => {
    const trimmed = promoCode.trim();
    if (!trimmed) {
      setPromoMessage("Введите промокод");
      return;
    }
    setPromoMessage("Промокод принят — скидка будет применена при оплате");
  };

  const updatePromoCode = (value: string) => {
    setPromoCode(value.toUpperCase());
    setPromoMessage(null);
  };

  return {
    promoCode,
    promoMessage,
    applyPromo,
    updatePromoCode,
  };
}
