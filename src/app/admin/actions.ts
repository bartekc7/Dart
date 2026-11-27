"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminKey, checkKey, sessionValue } from "@/lib/server/adminAuth";

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
