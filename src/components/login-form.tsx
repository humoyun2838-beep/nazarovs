"use client";
import { UiText } from "@/components/ui-locale";


import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

export function LoginForm({
  nextPath,
  role = "client",
  errorCode,
  locale = "uz",
}: {
  nextPath: string;
  role?: "client" | "admin" | "operator";
  errorCode?: string;
  locale?: Locale;
}) {
  const isClient = role === "client";
  const isOperator = role === "operator";
  const blankLogin = isClient || isOperator;
  const copy = uiCopy(locale);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const message =
    errorCode === "empty"
      ? copy.errEmpty
      : errorCode === "admin"
        ? copy.errAdmin
        : errorCode === "invalid"
          ? copy.errInvalid
          : errorCode === "expired"
            ? copy.errExpired
            : errorCode === "blocked"
              ? copy.errBlocked
              : errorCode === "desk"
                ? copy.errDesk
                : errorCode === "client"
                  ? copy.errClient
                  : null;

  return (
    <form
      action="/api/login"
      method="post"
      className="relative grid gap-4"
      autoComplete="off"
      autoCorrect="off"
    >
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="role" value={role} />
      {blankLogin ? (
        <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
          <input type="text" name="fake-user" autoComplete="username" tabIndex={-1} />
          <input type="password" name="fake-pass" autoComplete="current-password" tabIndex={-1} />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor={blankLogin ? "client-login" : "username"}>
          <UiText>{isClient ? copy.loginClient : copy.login}</UiText>
        </Label>
        {isClient ? (
          <p className="-mt-1 text-xs text-[#4a6288]"><UiText>{copy.loginHint}</UiText></p>
        ) : null}
        <Input
          id={blankLogin ? "client-login" : "username"}
          name="username"
          autoComplete={blankLogin ? "off" : "username"}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          required
          {...(isClient
            ? { value: username, onChange: (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value) }
            : isOperator
              ? {}
              : { defaultValue: "Nazarov" })}
          placeholder={isClient ? copy.loginPh : isOperator ? copy.login : "Nazarov"}
          className="h-11 bg-white"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={blankLogin ? "client-password" : "password"}>
          <UiText>{isClient ? copy.passwordClient : copy.password}</UiText>
        </Label>
        {isClient ? (
          <p className="-mt-1 text-xs text-[#4a6288]"><UiText>{copy.passwordHint}</UiText></p>
        ) : null}
        <Input
          id={blankLogin ? "client-password" : "password"}
          name="password"
          type="password"
          autoComplete={blankLogin ? "new-password" : "current-password"}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          required
          minLength={1}
          {...(isClient
            ? { value: password, onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value) }
            : {})}
          placeholder={isClient ? copy.password : copy.password}
          className="h-11 bg-white"
        />
      </div>
      {message ? (
        <p className="text-sm text-[#b42318]" role="alert">
          <UiText>{message}</UiText>
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-xl bg-[#0b4fa8] text-white hover:bg-[#093f86]">
        <UiText>{copy.signIn}</UiText>
      </Button>
    </form>
  );
}
