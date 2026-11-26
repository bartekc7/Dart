"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TrainingRecord } from "@/lib/training";

/** Moje treningi z bazy. null = wczytywanie, error = brak połączenia. */
export function useMyTrainings() {
  const [list, setList] = useState<TrainingRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const r = await api<{ trainings: TrainingRecord[] }>("/api/trainings");
      setList(r.trainings);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pierwsze wczytanie listy
    reload();
  }, [reload]);
  return { list, error, reload };
}
