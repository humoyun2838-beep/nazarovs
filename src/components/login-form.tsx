"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  nextPath,
  role = "client",
  errorCode,
}: {
  nextPath: string;
  role?: "client" | "admin";
  errorCode?: string;
}) {
  const message =
    errorCode === "empty"
      ? "Login va parolni kiriting."
      : errorCode === "admin"
        ? "Bu sahifa faqat admin uchun."
        : errorCode === "invalid"
          ? "Login yoki parol noto‘g‘ri."
          : null;

  return (
    <form action="/api/login" method="post" className="grid gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-2">
        <Label htmlFor="username">Login</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          defaultValue={role === "admin" ? "Nazarov" : ""}
          placeholder={role === "admin" ? "Nazarov" : "login"}
          className="h-11 bg-white"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Parol</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={1}
          placeholder="Parolni kiriting"
          className="h-11 bg-white"
        />
      </div>
      {message ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-xl bg-[#0b4fa8] text-white hover:bg-[#093f86]">
        Kirish
      </Button>
    </form>
  );
}
