"use client";

import { useEffect, useState } from "react";
import {
  getCachedUserLocation,
  getLocationStatus,
  subscribeLocationStatus,
  subscribeUserLocation,
  type LocationStatus,
  type UserLocation,
} from "@/lib/locationController";

export type UseUserLocationState = {
  location: UserLocation | null;
  status: LocationStatus;
  /** Первое определение геолокации ещё идёт */
  loading: boolean;
};

/** Подписка на кэш геопозиции (обновляется polling’ом раз в 5 мин). */
export function useUserLocation(): UseUserLocationState {
  const [location, setLocation] = useState<UserLocation | null>(() =>
    getCachedUserLocation(),
  );
  const [status, setStatus] = useState<LocationStatus>(() => getLocationStatus());

  useEffect(() => {
    const unsubLocation = subscribeUserLocation(setLocation);
    const unsubStatus = subscribeLocationStatus(setStatus);
    return () => {
      unsubLocation();
      unsubStatus();
    };
  }, []);

  return {
    location,
    status,
    loading: status === "idle" || status === "loading",
  };
}
