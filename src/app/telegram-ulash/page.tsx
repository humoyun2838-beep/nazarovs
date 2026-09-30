import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function TelegramUlashPage() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin/chat");
  redirect("/nazarov");
}
