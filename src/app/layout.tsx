import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Loop — what should I eat?",
  description: "Two dishes. One tap. Zero overthinking.",
  appleWebApp: {
    capable: true,
    title: "Loop",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#efeee9",
  width: "device-width",
  initialScale: 1,
  // Installed-app feel: no pinch-zoom bounce fighting the card UI.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full`}
    >
      <body className="flex min-h-dvh flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
