import { NextResponse } from "next/server";
import { adminStatus, requireAdmin } from "@/lib/admin";
import { getMobileRelease, saveMobileRelease, verifyReleaseDownload } from "@/lib/mobile-release";
import { parseMobileRelease } from "@/lib/mobile-release-policy";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
let validating = false;
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  return NextResponse.json(getMobileRelease(), { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  const origin = request.headers.get("origin");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Origin mos emas." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 16000) return NextResponse.json({ error: "So‘rov juda katta." }, { status: 413 });
  if (validating) return NextResponse.json({ error: "Oldingi tekshiruv tugashini kuting." }, { status: 409 });
  validating = true;
  try {
    const body = await request.text();
    if (body.length > 16000) throw new Error("So‘rov juda katta.");
    const release = parseMobileRelease(JSON.parse(body));
    if (release.version_code < getMobileRelease().version_code) throw new Error("Oldingi APK versiyasiga tushirish mumkin emas.");
    await verifyReleaseDownload(release);
    saveMobileRelease(release);
    return NextResponse.json({ ok: true, release: getMobileRelease() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nashr saqlanmadi." }, { status: 400 });
  } finally { validating = false; }
}
