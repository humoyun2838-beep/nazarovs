"use client";
import { UiText } from "@/components/ui-locale";


import { useMemo, useState } from "react";
import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTelegramUsername, formatUzPhoneInput } from "@/lib/uz-phone";

export function ClientGate({
  nextPath,
  errorCode,
  initialTab,
}: {
  nextPath: string;
  errorCode?: string;
  initialTab?: string;
}) {
  const startTab = initialTab === "kirish" ? "kirish" : "royxat";
  const [tab, setTab] = useState<"royxat" | "kirish">(startTab);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [telegram, setTelegram] = useState("@");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const title = useMemo(
    () => (tab === "royxat" ? "Avval tanishing" : "Hisobingizga kiring"),
    [tab],
  );

  async function onRegister(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, phone, telegram }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      errors?: Record<string, string>;
    } | null;
    setBusy(false);
    if (!data?.ok) {
      setErrors(data?.errors || { form: "Ariza yuborilmadi." });
      return;
    }
    setDone(true);
  }

  return (
    <div className="relative z-10 space-y-5">
      <div className="grid grid-cols-2 gate-tabs">
        <button
          type="button"
          onClick={() => setTab("royxat")}
          className={tab === "royxat" ? "gate-tab gate-tab-on" : "gate-tab"}
        ><UiText>{" Ro‘yxat "}</UiText></button>
        <button
          type="button"
          onClick={() => setTab("kirish")}
          className={tab === "kirish" ? "gate-tab gate-tab-on" : "gate-tab"}
        ><UiText>{" Kirish "}</UiText></button>
      </div>

      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#071a38]">
          <UiText>{title}</UiText>
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[#4a6288]">
          <UiText>{tab === "royxat"
            ? "Ism va telefon qoldiring. Keyin admin login va parol beradi."
            : "Admin bergan login va parol bilan kiring."}</UiText>
        </p>
      </div>

      {tab === "royxat" ? (
        done ? (
          <div className="space-y-3 rounded-2xl bg-[#eef8ff] px-4 py-5 text-center">
            <p className="text-lg font-semibold text-[#071a38]"><UiText>{"Ariza qabul qilindi"}</UiText></p>
            <p className="text-sm leading-relaxed text-[#2d4a73]"><UiText>{" Ma’lumotingiz admin panelida. Login va parol berilgach shu yerdan "}</UiText><span className="font-semibold"><UiText>{" Kirish"}</UiText></span><UiText>{" orqali kirasiz. "}</UiText></p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setTab("kirish")}
            ><UiText>{" Kirish bo‘limiga o‘tish "}</UiText></Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void onRegister(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="reg-name"><UiText>{" Ism "}</UiText><span className="text-[#1a6fd4]">*</span>
              </Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ismingiz"
                className="h-11 rounded-xl bg-white"
              />
              {errors.name ? (
                <p className="text-xs text-[#b42318]">{errors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone"><UiText>{" Telefon "}</UiText><span className="text-[#1a6fd4]">*</span>
              </Label>
              <Input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                maxLength={13}
                value={phone}
                onChange={(e) => setPhone(formatUzPhoneInput(e.target.value))}
                placeholder="+998 90 123 45 67"
                className="h-11 rounded-xl bg-white"
              />
              {errors.phone ? (
                <p className="text-xs text-[#b42318]">{errors.phone}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-telegram"><UiText>{"Telegram username"}</UiText></Label>
              <Input
                id="reg-telegram"
                value={telegram}
                onChange={(e) => setTelegram(formatTelegramUsername(e.target.value))}
                placeholder="@username"
                className="h-11 rounded-xl bg-white"
                autoComplete="off"
              />
              {errors.telegram ? (
                <p className="text-xs text-[#b42318]"><UiText>{errors.telegram}</UiText></p>
              ) : null}
            </div>
            {errors.form ? (
              <p className="text-sm text-[#b42318]"><UiText>{errors.form}</UiText></p>
            ) : null}
            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-full bg-[#0a5ad4] text-white hover:bg-[#084bb3]"
            >
              <UiText>{busy ? "Yuborilmoqda…" : "Ariza yuborish"}</UiText>
            </Button>
          </form>
        )
      ) : (
        <LoginForm nextPath={nextPath} role="client" errorCode={errorCode} />
      )}
    </div>
  );
}
