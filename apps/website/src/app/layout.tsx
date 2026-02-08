import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { FooterSection } from "@/components/FooterSection";

export const metadata: Metadata = {
  title: "Saatosa",
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
        <Header />
        {children}
        <FooterSection />
      </body>
    </html>
  );
}
