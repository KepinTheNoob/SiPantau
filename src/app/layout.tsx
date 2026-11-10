import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPANTAU - Portal Transparansi Proyek Pemerintah",
  description:
    "Sistem Informasi Pemantauan Proyek Pemerintah RI secara terbuka, transparan, dan akuntabel bagi seluruh masyarakat.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className="antialiased bg-slate-50 text-slate-900 selection:bg-brand-blue selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
