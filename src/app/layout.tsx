import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import MainHeader from "@/components/MainHeader";
import MainFooter from "@/components/MainFooter";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Shahadati | شهاداتي - School Certificates Management",
  description: "A premium SaaS platform for Saudi schools to auto-match and manage student certificates with high precision OCR and PDF processing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${cairo.className}`}>
        <div className="app-wrapper">
          <MainHeader />
          <main>
            {children}
          </main>
          <MainFooter />
        </div>
      </body>
    </html>
  );
}
