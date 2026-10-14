"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestUsername } from "@/lib/uz-phone";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";
import { formatAccessStamp, isExpiredAt, toLocalInput } from "@/lib/access-time";

type Row = {
  id: number;
  name: string;
  phone: string;
  workplace: string;
  status: string;
  username: string;
  createdAt: string;
  decidedAt?: string;
  issuedPassword?: string;
  expiresAt?: string;
};

function makePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function stamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminClients({
  initial,
  locale = "uz",
}: {
  initial: Row[];
  locale?: Locale;
}) {
  const copy = uiCopy(locale);
  const [rows, setRows] = useState(initial);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [direct, setDirect] = useState({
    name: "",
    phone: "+998",
    telegram: "@",
    username: "",
    password: "",
    expiresAt: "",
  });
  const [drafts, setDrafts] = useState<
    Record<number, { username: string; password: string; expiresAt: string }>
  >({});
  const [expiryDrafts, setExpiryDrafts] = useState<Record<number, string>>({});
  const [freshPassword, setFreshPassword] = useState<Record<number, string>>({});

  const pending = useMemo(
    () => rows.filter((row) => row.status === "pending"),
    [rows],
  );
  const history = useMemo(() => {
    const approved = rows.filter((row) => row.status === "approved" && row.username);
    const chronological = [...approved].sort((a, b) => {
      const ta = new Date(a.decidedAt || a.createdAt).getTime();
      const tb = new Date(b.decidedAt || b.createdAt).getTime();
      return ta - tb;
    });
    return chronological.map((row, index) => ({ ...row, seq: index + 1 })).reverse();
  }, [rows]);
  const rejected = useMemo(
    () => rows.filter((row) => row.status === "rejected"),
    [rows],
  );

  useEffect(() => {
    setExpiryDrafts((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (next[row.id] === undefined) {
          next[row.id] = toLocalInput(row.expiresAt);
        }
      }
      return next;
    });
  }, [rows]);

  useEffect(() => {
    const next: Record<number, { username: string; password: string; expiresAt: string }> =
      {};
    for (const row of pending) {
      next[row.id] = drafts[row.id] || {
        username: suggestUsername(row.name, row.phone),
        password: "",
        expiresAt: "",
      };
    }
    setDrafts((prev) => ({ ...next, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.map((row) => row.id).join(",")]);

  async function refresh() {
    const res = await fetch("/api/admin/clients", { credentials: "same-origin" });
    const data = (await res.json().catch(() => null)) as { requests?: Row[] } | null;
    if (Array.isArray(data?.requests)) {
      setRows(data.requests);
      setExpiryDrafts((prev) => {
        const next = { ...prev };
        for (const row of data.requests || []) {
          if (next[row.id] === undefined) {
            next[row.id] = toLocalInput(row.expiresAt);
          }
        }
        return next;
      });
    }
  }

  async function createDirect() {
    setBusyId(-1);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...direct,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      username?: string;
      password?: string;
    } | null;
    setBusyId(0);
    if (!data?.ok) {
      setError(data?.error || "Yaratilmadi.");
      return;
    }
    setIssued({ username: data.username || "", password: data.password || "" });
    setDirect({
      name: "",
      phone: "+998",
      telegram: "@",
      username: "",
      password: "",
      expiresAt: "",
    });
    await refresh();
  }

  async function issue(id: number) {
    const draft = drafts[id] || { username: "", password: "", expiresAt: "" };
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "issue",
        id,
        username: draft.username,
        password: draft.password,
        expiresAt: draft.expiresAt,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      username?: string;
      password?: string;
    } | null;
    setBusyId(0);
    if (!data?.ok) {
      setError(data?.error || "Saqlanmadi.");
      return;
    }
    setIssued({ username: data.username || "", password: data.password || "" });
    await refresh();
  }

  async function saveExpiry(row: Row) {
    setBusyId(row.id);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "expiry",
        id: row.id,
        expiresAt: expiryDrafts[row.id] ?? toLocalInput(row.expiresAt),
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      expiresAt?: string;
    } | null;
    setBusyId(0);
    if (!data?.ok) {
      setError(data?.error || "Muddat saqlanmadi.");
      return;
    }
    setExpiryDrafts((prev) => ({
      ...prev,
      [row.id]: toLocalInput(data.expiresAt),
    }));
    await refresh();
  }

  async function resetPassword(row: Row) {
    setBusyId(row.id);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset-password", id: row.id }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      password?: string;
    } | null;
    setBusyId(0);
    if (!data?.ok || !data.password) {
      setError(data?.error || "Parol yangilanmadi.");
      return;
    }
    setFreshPassword((prev) => ({ ...prev, [row.id]: data.password || "" }));
  }

  async function reject(id: number) {
    setBusyId(id);
    await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reject", id }),
    });
    setBusyId(0);
    await refresh();
  }

  async function removeLogin(row: Row) {
    const label = row.username || row.name;
    const ok = window.confirm(
      `“${label}” loginini o‘chirasizmi? Mijoz endi kira olmaydi.`,
    );
    if (!ok) return;
    setBusyId(row.id);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id: row.id }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    setBusyId(0);
    if (!data?.ok) {
      setError(data?.error || "O‘chirilmadi.");
      return;
    }
    if (issued?.username && issued.username === row.username) setIssued(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      {issued ? (
        <div className="rounded-2xl border border-[#b7ebc6] bg-[#f0fdf4] px-4 py-4">
          <p className="text-sm font-semibold text-[#166534]"><UiText>{"Login berildi"}</UiText></p>
          <p className="mt-1 text-sm text-[#14532d]"><UiText>{" Login: "}</UiText><span className="font-mono font-semibold">{issued.username}</span>
            <UiText>{" · "}</UiText><UiText>{" Parol: "}</UiText><span className="font-mono font-semibold"><UiText>{issued.password}</UiText></span>
          </p>
          <p className="mt-1 text-xs text-[#3f6b4e]">
            <UiText>{copy.operatorHint}</UiText>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => {
              void navigator.clipboard.writeText(
                `Login: ${issued.username}\nParol: ${issued.password}`,
              );
            }}
          ><UiText>{" Nusxa olish "}</UiText></Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}

      <section className="catalog-panel space-y-3 rounded-2xl p-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#0b2a55]"><UiText>{" Arizasiz login yaratish "}</UiText></h2>
          <p className="mt-1 text-sm text-[#4a6288]"><UiText>{" Mijoz katalogdan yozadi. Shu login admin panelidagi Chat uchun. "}</UiText><UiText>{copy.operatorHint}</UiText>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label><UiText>{copy.nameLabel}</UiText></Label>
            <Input
              value={direct.name}
              onChange={(e) => setDirect((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={copy.clientNamePh}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label><UiText>{copy.phoneLabel}</UiText></Label>
            <Input
              value={direct.phone}
              onChange={(e) => setDirect((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+998"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label><UiText>{copy.login}</UiText></Label>
            <Input
              value={direct.username}
              onChange={(e) => setDirect((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="masalan, akbar"
              className="h-10 rounded-xl"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label><UiText>{copy.password}</UiText></Label>
            <div className="flex gap-2">
              <Input
                value={direct.password}
                onChange={(e) =>
                  setDirect((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={copy.password}
                className="h-10 rounded-xl"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-xl"
                onClick={() =>
                  setDirect((prev) => ({ ...prev, password: makePassword() }))
                }
              ><UiText>{" Yasash "}</UiText></Button>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Label><UiText>{copy.accessLabel}</UiText></Label>
          <Input
            type="datetime-local"
            value={direct.expiresAt}
            onChange={(e) =>
              setDirect((prev) => ({ ...prev, expiresAt: e.target.value }))
            }
            className="h-10 rounded-xl"
          />
          <p className="text-xs text-[#4a6288]"><UiText>{" Vaqt kelganda login o‘chadi. Bo‘sh qoldirsangiz, keyin Tarixdan qo‘yish mumkin. "}</UiText></p>
        </div>
        <Button
          type="button"
          disabled={busyId === -1}
          onClick={() => void createDirect()}
          className="rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
        >
          <UiText>{busyId === -1 ? "Yaratilmoqda…" : "Login va parol yaratish"}</UiText>
        </Button>
      </section>

      <section className="catalog-panel space-y-3 rounded-2xl p-4">
        <h2 className="font-heading text-xl font-semibold text-[#0b2a55]"><UiText>{" Kutilayotgan arizalar "}</UiText><span className="ml-2 text-sm font-medium text-[#1a6fd4]">
            {pending.length}
          </span>
        </h2>
        {pending.length === 0 ? (
          <p className="catalog-panel rounded-2xl px-4 py-8 text-center text-sm text-[#4a6288]"><UiText>{" Hozircha yangi ariza yo‘q. "}</UiText></p>
        ) : (
          <ul className="space-y-3">
            {pending.map((row) => {
              const draft = drafts[row.id] || {
                username: "",
                password: "",
                expiresAt: "",
              };
              return (
                <li
                  key={row.id}
                  className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-[#d7e4fb]/80"
                >
                  <div>
                    <p className="font-semibold text-[#071a38]">{row.name}</p>
                    <p className="text-sm text-[#2d4a73]">{row.phone}</p>
                    {row.workplace ? (
                      <p className="text-sm text-[#4a6288]"><UiText>{"Telegram: "}</UiText><UiText>{row.workplace}</UiText></p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#7a7166]"><UiText>{stamp(row.createdAt)}</UiText></p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label><UiText>{copy.login}</UiText></Label>
                      <Input
                        value={draft.username}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, username: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label><UiText>{copy.password}</UiText></Label>
                      <div className="flex gap-2">
                        <Input
                          value={draft.password}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, password: e.target.value },
                            }))
                          }
                          placeholder={copy.password}
                          className="h-10 rounded-xl"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0 rounded-xl"
                          onClick={() =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, password: makePassword() },
                            }))
                          }
                        ><UiText>{" Yasash "}</UiText></Button>
                      </div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label><UiText>{copy.accessLabel}</UiText></Label>
                      <Input
                        type="datetime-local"
                        value={draft.expiresAt}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, expiresAt: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void issue(row.id)}
                      className="rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
                    ><UiText>{" Login va parol berish "}</UiText></Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void reject(row.id)}
                    ><UiText>{" Rad etish "}</UiText></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="catalog-panel space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#0b2a55]"><UiText>{" Tarix "}</UiText></h2>
            <p className="mt-1 text-sm text-[#4a6288]"><UiText>{" Ketma-ket yasalgan loginlar. Hozir jami"}</UiText><UiText>{" "}</UiText>
              <span className="font-semibold text-[#0b4fa8]">{history.length}</span><UiText>{" ta. "}</UiText></p>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#4a6288]"><UiText>{" Hali login yasalmadi. "}</UiText></p>
        ) : (
          <ol className="divide-y divide-[#d7e4fb] overflow-hidden rounded-2xl bg-white ring-1 ring-[#d7e4fb]/80">
            {history.map((row) => {
              const expired = isExpiredAt(row.expiresAt || "");
              const localValue =
                expiryDrafts[row.id] ?? toLocalInput(row.expiresAt);
              return (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#071a38]">
                    <span className="mr-2 font-mono text-[#1a6fd4]">#{row.seq}</span>
                    {row.name}
                    {expired ? (
                      <span className="ml-2 rounded-full bg-[#fef2f2] px-2 py-0.5 text-[11px] font-semibold text-[#b42318]"><UiText>{" Faolsiz "}</UiText></span>
                    ) : row.expiresAt ? (
                      <span className="ml-2 rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-semibold text-[#166534]"><UiText>{" Faol "}</UiText></span>
                    ) : (
                      <span className="ml-2 rounded-full bg-[#eef4ff] px-2 py-0.5 text-[11px] font-semibold text-[#1a6fd4]"><UiText>{" Muddat yo‘q "}</UiText></span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-sm text-[#12315f]"><UiText>{" Login: "}</UiText>{row.username}
                  </p>
                  {freshPassword[row.id] ? (
                    <p className="mt-1 text-sm font-semibold text-[#166534]"><UiText>{" Yangi parol bir marta: "}</UiText><UiText>{freshPassword[row.id]}</UiText><UiText>{". Bazada saqlanmaydi. "}</UiText></p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#4a6288]">
                    {row.phone || "telefon yo‘q"}
                    <UiText>{row.workplace ? ` · ${row.workplace}` : ""}</UiText>
                    <UiText>{" · "}</UiText>
                    <UiText>{stamp(row.decidedAt || row.createdAt)}</UiText>
                    <UiText>{row.expiresAt
                      ? ` · tugash: ${formatAccessStamp(row.expiresAt)}`
                      : ""}</UiText>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={localValue}
                      onChange={(e) =>
                        setExpiryDrafts((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                      className="h-9 w-[13.5rem] rounded-xl"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void saveExpiry(row)}
                      className="rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
                    ><UiText>{" Muddatni saqlash "}</UiText></Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void resetPassword(row)}
                      className="rounded-full"
                    ><UiText>{" Parolni yangilash "}</UiText></Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyId === row.id}
                  onClick={() => void removeLogin(row)}
                  className="rounded-full border-[#f1c0bc] text-[#b42318] hover:bg-[#fef2f2]"
                >
                  <UiText>{busyId === row.id ? "O‘chirilmoqda…" : "O‘chirish"}</UiText>
                </Button>
              </li>
              );
            })}
          </ol>
        )}
      </section>

      {rejected.length > 0 ? (
        <section className="catalog-panel space-y-3 rounded-2xl p-4">
          <h2 className="font-heading text-xl font-semibold text-[#0b2a55]"><UiText>{" Rad etilgan "}</UiText></h2>
          <ul className="divide-y divide-[#d7e4fb] overflow-hidden rounded-2xl bg-white ring-1 ring-[#d7e4fb]/80">
            {rejected.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[#071a38]">{row.name}</p>
                  <p className="text-sm text-[#4a6288]">
                    {row.phone}
                    <UiText>{row.workplace ? ` · ${row.workplace}` : ""}</UiText>
                  </p>
                </div>
                <span className="rounded-full bg-[#fef2f2] px-2.5 py-1 text-xs font-semibold text-[#b42318]"><UiText>{" Rad etilgan "}</UiText></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
