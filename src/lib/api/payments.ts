import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/lib/api/auth";

export type BalancePaymentResponse = {
  message: string;
  balance: string | number;
  transaction: {
    id: number;
    amount: string | number;
    description: string | null;
    method: string;
    status: string;
  };
  user: AuthUser;
  session?: {
    id: number;
    location_id: number;
    status: string;
    start_at: string | null;
  };
};

function notifyProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
}

/** Оплата мойки с баланса + запись в историю (cw_sessions). Цена берётся из БД по tariff_id. */
export async function payCarWash(input: {
  location_id: number;
  tariff_id: number;
  description?: string;
  car_id?: number;
}): Promise<BalancePaymentResponse> {
  const data = await apiFetch<BalancePaymentResponse>("/api/payments/car-wash", {
    method: "POST",
    body: JSON.stringify(input),
  });
  notifyProfileUpdated();
  return data;
}

/** Оплата ЭЗС с баланса + запись в историю (ev_sessions). */
export async function payEv(input: {
  location_id: number;
  tariff_id: number;
  description?: string;
  car_id?: number;
}): Promise<BalancePaymentResponse> {
  const data = await apiFetch<BalancePaymentResponse>("/api/payments/ev", {
    method: "POST",
    body: JSON.stringify(input),
  });
  notifyProfileUpdated();
  return data;
}

export async function payFromBalance(input: {
  amount: number;
  tariff_title?: string;
  description?: string;
  location_id?: number;
}): Promise<BalancePaymentResponse> {
  const data = await apiFetch<BalancePaymentResponse>("/api/payments/balance", {
    method: "POST",
    body: JSON.stringify(input),
  });
  notifyProfileUpdated();
  return data;
}

/** Пополнение баланса */
export type TopUpMethod = "kaspi" | "forte";

export async function topUpBalance(
  amount: number,
  method: TopUpMethod = "kaspi",
): Promise<BalancePaymentResponse> {
  const data = await apiFetch<BalancePaymentResponse>("/api/payments/top-up", {
    method: "POST",
    body: JSON.stringify({ amount, method }),
  });
  notifyProfileUpdated();
  return data;
}
