"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteInactiveLeague } from "@/lib/server/admin";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminKey,
  checkActionToken,
  checkKey,
  isAdminSession,
  sessionValue,
} from "@/lib/server/adminAuth";
import { getDb } from "@/lib/server/db";
import { UserError } from "@/lib/server/league";

/** Logowanie do panelu kluczem z ADMIN_KEY. Zły klucz: krótka pauza i komunikat. */
export async function adminLogin(formData: FormData) {
  const key = adminKey();
  if (!checkKey(formData.get("key"), key)) {
    await new Promise((r) => setTimeout(r, 800));
    redirect("/admin?zaloguj&blad=1");
  }
  (await cookies()).set(ADMIN_COOKIE, sessionValue(key!), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).set(ADMIN_COOKIE, "", { path: "/admin", maxAge: 0 });
  redirect("/");
}

export interface DeleteLeagueState {
  error?: string;
}

/**
 * Jedyna akcja zapisująca w panelu: usunięcie nieaktywnej ligi. Wymaga
 * ciasteczka admina, tokenu akcji dla tej ligi i wpisania jej nazwy.
 */
export async function deleteLeagueAction(_prev: DeleteLeagueState, formData: FormData): Promise<DeleteLeagueState> {
  const key = adminKey();
  const jar = await cookies();
  if (!isAdminSession(jar.get(ADMIN_COOKIE)?.value, key)) return { error: "Sesja wygasła. Zaloguj się ponownie." };
  const leagueId = formData.get("leagueId");
  if (typeof leagueId !== "string" || !checkActionToken(formData.get("token"), key, "delete-league", leagueId))
    return { error: "Nieprawidłowe żądanie. Odśwież stronę i spróbuj ponownie." };
  let name: string;
  try {
    const db = await getDb();
    ({ name } = await deleteInactiveLeague(db, leagueId, formData.get("name")));
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error(e);
    return { error: "Nie udało się usunąć ligi. Nic nie zostało zmienione." };
  }
  redirect(`/admin?usunieto=${encodeURIComponent(name)}`);
}
