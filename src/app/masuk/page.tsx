import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { SipantauLogo } from "@/components/sipantau-logo";

export const metadata: Metadata = {
  title: "Masuk ke Panel Pengelola | SIPANTAU",
  description: "Masuk ke portal transparansi proyek pemerintah SIPANTAU",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6 text-center flex flex-col items-center">
          <Link
            href="/"
            className="mb-4 inline-block hover:opacity-90 transition"
          >
            <SipantauLogo size="lg" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Panel Pengelola Instansi
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Masuk sebagai Administrator Instansi Pemerintah
          </p>
        </header>

        <LoginForm />

        <footer className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 flex flex-col gap-2">
          <span>
            Akun dibuat secara terpusat oleh Super Admin. Publik tidak
            memerlukan login.
          </span>
          <Link
            href="/"
            className="text-brand-blue font-semibold hover:underline"
          >
            ← Kembali ke Beranda Publik
          </Link>
        </footer>
      </div>
    </main>
  );
}
