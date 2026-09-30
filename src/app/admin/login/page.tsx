import Link from "next/link";
import { BrandLogo } from "@/components/site-header";
import { LoginForm } from "@/components/login-form";
import "@/db";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/admin")
      ? params.next
      : "/admin";

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-12">
      <div className="catalog-hero page-enter w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo size="lg" />
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#1a6fd4] uppercase">
              Admin panel
            </p>
            <p className="text-sm leading-relaxed text-[#4a6288]">
              Material qo‘shish uchun login va parol kiriting.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <LoginForm nextPath={nextPath} role="admin" errorCode={params.error} />
        </div>
        <p className="relative z-10 mt-4 text-center text-xs text-[#4a6288]">
          Mijozmisiz?{" "}
          <Link href="/nazarov" className="underline underline-offset-2">
            Materiallarga o‘tish
          </Link>
        </p>
      </div>
    </main>
  );
}
