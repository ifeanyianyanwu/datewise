import type { Metadata } from "next";
import { Archivo, DM_Mono, Figtree } from "next/font/google";
import "./globals.css";

// Archivo is a variable font; `wdth` is opted in so display text can be set wide.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// DM Mono isn't variable, so each weight is listed explicitly.
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Datewise",
  description: "Turn a vibe and a location into a timed date plan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${figtree.variable} ${dmMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
