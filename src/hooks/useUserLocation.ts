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

/** Подписка на кэш геопозиции (обновляется только после явного запроса). */
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
    /** true только пока идёт запрос после явного действия пользователя */
    loading: status === "loading",
  };
}
