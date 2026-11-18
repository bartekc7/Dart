import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dart – licznik punktów",
  description: "Prosty licznik rozgrywek w darta dla naszego zespołu.",
  appleWebApp: { capable: true, title: "Dart", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f1412",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Jedna kolumna o szerokości telefonu, wyśrodkowana na większych ekranach. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </body>
    </html>
  );
}
