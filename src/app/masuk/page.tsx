import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk ke Panel Admin",
  description: "Masuk ke portal transparansi proyek pemerintah",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Portal Transparansi Proyek
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Masuk sebagai Administrator Instansi Pemerintah
          </p>
        </header>

        <LoginForm />

        <footer className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Akun dibuat secara terpusat oleh Super Admin. Publik tidak memerlukan
          login.
        </footer>
      </div>
    </main>
  );
}
