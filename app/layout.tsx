import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="pt-BR" className={`${inter.variable} dark`} suppressHydrationWarning>
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
