"use client";
import { UiText } from "@/components/ui-locale";


import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OperatorPublic } from "@/lib/operators";

export function OperatorAdmin({ initial }: { initial: OperatorPublic[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(form: FormData) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/operators", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        fullName: String(form.get("fullName") || ""),
        username: String(form.get("username") || ""),
        password: String(form.get("password") || ""),
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Saqlanmadi.");
      return;
    }
    (document.getElementById("operator-create") as HTMLFormElement | null)?.reset();
    router.refresh();
  }

  async function setStatus(id: number, action: "block" | "activate") {
    setError("");
    const res = await fetch("/api/admin/operators", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    if (!res.ok) {
      setError("Holat o‘zgarmadi.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        id="operator-create"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create(new FormData(event.currentTarget));
        }}
      >
        <label className="grid gap-1 text-sm"><UiText>{" Ism "}</UiText><input
            name="fullName"
            required
            minLength={2}
            maxLength={80}
            className="h-11 rounded-xl border border-[#d5dee8] bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm"><UiText>{" Login "}</UiText><input
            name="username"
            required
            minLength={3}
            maxLength={32}
            autoComplete="off"
            className="h-11 rounded-xl border border-[#d5dee8] bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2"><UiText>{" Parol "}</UiText><input
            name="password"
            type="password"
            required
            maxLength={72}
            autoComplete="new-password"
            className="h-11 rounded-xl border border-[#d5dee8] bg-white px-3"
          />
        </label>
        {error ? <p className="text-sm text-[#b42318] sm:col-span-2"><UiText>{error}</UiText></p> : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-[#0b4fa8] px-4 text-sm font-semibold text-white disabled:opacity-50"
          ><UiText>{" Operator yaratish "}</UiText></button>
        </div>
      </form>

      <ul className="divide-y divide-[#e6edf4] overflow-hidden rounded-2xl border border-[#e6edf4] bg-white">
        {initial.length === 0 ? (
          <li className="px-4 py-6 text-sm text-[#5b6b7c]"><UiText>{"Hali operator yo‘q."}</UiText></li>
        ) : (
          initial.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#122033]"><UiText>{row.fullName}</UiText></p>
                <p className="text-xs text-[#5b6b7c]">
                  {row.username} · <UiText>{row.status === "blocked" ? "bloklangan" : "faol"}</UiText>
                </p>
              </div>
              {row.status === "blocked" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(row.id, "activate")}
                  className="rounded-lg border border-[#0b4fa8] px-3 py-1.5 text-sm font-medium text-[#0b4fa8]"
                ><UiText>{" Faollashtirish "}</UiText></button>
              ) : (
                <button
                  type="button"
                  onClick={() => void setStatus(row.id, "block")}
                  className="rounded-lg border border-[#d92d20] px-3 py-1.5 text-sm font-medium text-[#d92d20]"
                ><UiText>{" Bloklash "}</UiText></button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
