import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="catalog-panel rounded-3xl px-6 py-8">
        <h1 className="font-heading text-3xl font-semibold">Sahifa topilmadi</h1>
        <p className="mt-2 text-sm text-[#5a5248]">
          Bu dars o‘chirilgan yoki manzil noto‘g‘ri.
        </p>
        <Link
          href="/nazarov"
          className="mt-6 inline-block text-sm text-[#2f6fed] underline underline-offset-2"
        >
          Materiallarga qaytish
        </Link>
        </div>
      </main>
    </>
  );
}
