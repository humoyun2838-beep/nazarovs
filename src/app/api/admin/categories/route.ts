import { NextResponse } from "next/server";
import { adminStatus, createCategoryFromForm } from "@/lib/admin";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await createCategoryFromForm(form);
  return NextResponse.json(result, { status: adminStatus(result) });
}
