import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const siteUrl = "https://nexora-product.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nexora | Product Intelligence",
  description: "Turn product ideas into executable software specifications.",
  openGraph: {
    type: "website",
    siteName: "Nexora",
    url: siteUrl,
    title: "Nexora | Product Intelligence",
    description: "Turn product ideas into executable software specifications.",
  },
  twitter: {
    card: "summary",
    title: "Nexora | Product Intelligence",
    description: "Turn product ideas into executable software specifications.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="shell"><header className="topbar"><Link href="/" className="brand" style={{display:"flex",alignItems:"center"}}><span className="brand-mark">NX</span>NEXORA</Link><nav className="landing-nav"><Link href="/docs">Docs</Link><Link href="/pricing">Pricing</Link><Link href="/dashboard">Workspace</Link><Link className="btn btn-primary" href="/login">Sign in</Link></nav></header>{children}</div></body></html>;
}
