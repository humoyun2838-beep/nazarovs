import { redirect } from "next/navigation";
import { routes } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function LegacyOperatorChatPage() {
  redirect(routes.operator);
}
