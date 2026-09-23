import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// HALO brand body font — Open Sans (300/400/600). Helvetica Neue Bold é
// usada nos títulos (font-display) via stack do Tailwind.
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HALO Prospector",
  description: "Sistema de prospecção B2B HALO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${openSans.variable} dark`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
