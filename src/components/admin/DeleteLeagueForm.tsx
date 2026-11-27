"use client";

import { useActionState, useState } from "react";
import { deleteLeagueAction, type DeleteLeagueState } from "@/app/admin/actions";

/** Usunięcie nieaktywnej ligi: najpierw „Usuń…”, potem wpisanie nazwy ligi. */
export function DeleteLeagueForm({ leagueId, name, token }: { leagueId: string; name: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<DeleteLeagueState, FormData>(deleteLeagueAction, {});
  const matches = typed.trim() === name;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-10 rounded-full px-3 text-sm font-medium text-red ring-1 ring-red/50 active:scale-[0.98]"
      >
        Usuń…
      </button>
    );

  return (
    <form action={action} className="mt-2 flex w-full flex-col gap-2 rounded-xl bg-red/10 p-3 ring-1 ring-red/40">
      <input type="hidden" name="leagueId" value={leagueId} />
      <input type="hidden" name="token" value={token} />
      <p className="text-sm">
        Usunie ligę <b>{name}</b> razem z graczami, telefonami, grami i treningami. Tego nie da się cofnąć.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Wpisz nazwę ligi, żeby potwierdzić</span>
        <input
          name="name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          placeholder={name}
          className="min-h-12 rounded-xl bg-surface-2 px-3 text-base ring-1 ring-line focus:outline-2 focus:outline-cream"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
          className="min-h-12 flex-1 rounded-xl bg-surface-2 px-3 font-medium ring-1 ring-line"
        >
          Anuluj
        </button>
        <button
          disabled={!matches || pending}
          className="min-h-12 flex-1 rounded-xl bg-red px-3 font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
        >
          {pending ? "Usuwam…" : "Usuń ligę"}
        </button>
      </div>
    </form>
  );
}
