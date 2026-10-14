import { redirect } from "next/navigation";
import { routes } from "@/lib/site";

export default async function OperatorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.lang) query.set("lang", params.lang);
  const suffix = query.toString();
  redirect(suffix ? `${routes.operator}?${suffix}` : routes.operator);
}
