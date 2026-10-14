import { getOperatorSession } from "@/lib/auth";
import { operatorAccess } from "@/lib/operators";

export async function requireOperator() {
  const session = await getOperatorSession();
  if (!session || session.role !== "operator") {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const access = operatorAccess(Number(session.sub));
  if (access === "blocked") {
    return { ok: false as const, status: 403 as const, error: "blocked" };
  }
  if (access !== "active") {
    return { ok: false as const, status: 403 as const, error: "expired" };
  }
  return { ok: true as const, session };
}
