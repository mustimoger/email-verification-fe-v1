import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import CrispChat from "./components/crisp-chat";
import Providers from "./providers";
import { themeInitScript } from "./lib/theme";

const nunitoSans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Email Verification Dashboard",
  description:
    "User dashboard for managing email verification credits, usage, and account settings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <CrispChat />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
