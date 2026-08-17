import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Lootforge — Procedural Rogue-RPG";
const description =
  "Fight through procedural rooms, collect magical loot, forge upgrades, and descend as far as you can.";

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await requestOrigin();
  const socialImage = new URL("/og.png", origin).href;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: origin },
    openGraph: {
      type: "website",
      url: origin,
      title,
      description,
      images: [
        {
          url: socialImage,
          width: 1731,
          height: 909,
          alt: "Lootforge — Loot. Equip. Upgrade. Descend.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
