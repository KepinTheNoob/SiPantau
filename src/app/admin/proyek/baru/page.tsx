import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { ProjectCreateForm } from "./project-create-form";

export const metadata: Metadata = {
  title: "Buat Proyek Baru - Panel Admin | SIPANTAU",
  description: "Form pendaftaran proyek transparansi instansi baru di SIPANTAU",
};

export default async function NewProjectPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/admin/proyek"
            className="text-xs font-semibold text-brand-blue hover:underline"
          >
            ← Kembali ke daftar proyek
          </Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Buat Proyek Baru
          </h1>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <ProjectCreateForm />
        </div>
      </main>
    </div>
  );
}
