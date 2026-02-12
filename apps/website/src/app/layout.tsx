import type { Metadata } from "next";
import "./globals.css";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Header } from "@/components/Header";
import { WebsiteAnalytics } from "@/components/WebsiteAnalytics";
import { FooterSection } from "@/components/FooterSection";

export const metadata: Metadata = {
  title: "BoltRoute",
  description: "SaaS marketing site",
  icons: {
    icon: "/bolt.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WebsiteAnalytics />
        <Header />
        {children}
        <FooterSection />
        <ConsentBanner />
      </body>
    </html>
  );
}
