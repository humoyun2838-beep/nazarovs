import { NextResponse } from "next/server";
import {
  adminStatus,
  createMaterialFromForm,
  updateMaterialFromForm,
} from "@/lib/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await createMaterialFromForm(form);
  return NextResponse.json(result, { status: adminStatus(result) });
}

export async function PUT(request: Request) {
  const form = await request.formData();
  const result = await updateMaterialFromForm(form);
  return NextResponse.json(result, { status: adminStatus(result) });
}
