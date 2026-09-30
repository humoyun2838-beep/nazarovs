import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="page-enter flex flex-1 flex-col items-center justify-end gap-7 pb-6 text-center sm:justify-center sm:pb-0">
          <div className="space-y-2 text-[#0b2a55]">
            <p className="text-xs font-semibold tracking-[0.24em] text-[#1a6fd4] uppercase">
              Humoyun Mirzo
            </p>
            <h1 className="font-heading text-[clamp(2.4rem,8vw,3.8rem)] leading-[0.95] font-semibold tracking-tight">
              Nazarov
            </h1>
          </div>

          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
            <div className="catalog-panel rounded-3xl p-5 text-left">
              <p className="text-xs font-semibold tracking-wide text-[#1a6fd4] uppercase">
                1-sayt
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-[#071a38]">
                Mijozlar uchun
              </h2>
              <p className="mt-2 text-sm text-[#3d5a84]">
                DMED o‘quv materiallarini ko‘rish
              </p>
              <Button asChild className="mt-4 h-11 w-full rounded-xl bg-[#0b4fa8] text-white hover:bg-[#093f86]">
                <Link href="/nazarov">Materiallarni ochish</Link>
              </Button>
            </div>

            <div className="catalog-panel rounded-3xl p-5 text-left">
              <p className="text-xs font-semibold tracking-wide text-[#4a6288] uppercase">
                2-sayt
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-[#071a38]">
                Admin uchun
              </h2>
              <p className="mt-2 text-sm text-[#3d5a84]">
                Bo‘lim va materiallarni bazaga kiritish
              </p>
              <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-xl border-[#c5d8f5]">
                <Link href="/admin/login">Admin kirishi</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
