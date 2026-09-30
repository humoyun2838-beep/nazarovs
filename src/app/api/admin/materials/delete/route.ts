import { NextResponse } from "next/server";
import { adminStatus, clean, deleteMaterialById } from "@/lib/admin";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await deleteMaterialById(Number(clean(form.get("id"))));
  return NextResponse.json(result, { status: adminStatus(result) });
}
