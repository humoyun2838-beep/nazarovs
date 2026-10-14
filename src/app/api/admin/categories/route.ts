import { NextResponse } from "next/server";
import {
  adminStatus,
  createCategoryFromForm,
  updateCategoryFromForm,
} from "@/lib/admin";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await createCategoryFromForm(form);
  return NextResponse.json(result, { status: adminStatus(result) });
}

export async function PUT(request: Request) {
  const form = await request.formData();
  const result = await updateCategoryFromForm(form);
  return NextResponse.json(result, { status: adminStatus(result) });
}
