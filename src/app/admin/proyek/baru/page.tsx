import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { ProjectCreateForm } from "./project-create-form";
import { SipantauLogo } from "@/components/sipantau-logo";

export const metadata: Metadata = {
  title: "Buat Proyek Baru - Panel Admin | SIPANTAU",
  description: "Form pendaftaran proyek transparansi instansi baru di SIPANTAU",
};

export default async function NewProjectPage() {
  const { agency } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="hover:opacity-90 transition">
              <SipantauLogo size="sm" />
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link
                href="/admin"
                className="hover:text-brand-blue hover:underline"
              >
                Dasbor
              </Link>
              <span>/</span>
              <Link
                href="/admin/proyek"
                className="hover:text-brand-blue hover:underline"
              >
                Proyek
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Buat Baru</span>
            </div>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Buat Proyek Baru
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Instansi:{" "}
            <span className="font-semibold text-slate-700">{agency?.name}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <ProjectCreateForm />
        </div>
      </main>
    </div>
  );
}
