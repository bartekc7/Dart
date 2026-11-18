"use client";

import { api } from "@/lib/api";
import type { GameState } from "@/lib/game/types";

/**
 * Wysyła stan gry do podglądu na żywo. Bez czekania i bez komunikatów:
 * brak sieci nie może przeszkadzać w liczeniu punktów, a kolejna seria
 * i tak wyśle pełny stan. `rev` pilnuje kolejności po stronie serwera.
 */
export function publishLive(game: GameState) {
  if (!game.id) return;
  api(`/api/live/${encodeURIComponent(game.id)}`, {
    method: "PUT",
    body: {
      target: game.settings.target,
      players: game.players.map((p) => p.id),
      turns: game.turns,
      rev: Date.now(),
    },
  }).catch(() => {});
}

export function removeLive(id: string | undefined) {
  if (!id) return;
  api(`/api/live/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}
