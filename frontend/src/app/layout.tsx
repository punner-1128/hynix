import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "MongoDB Admin Console",
  description: "Central admin console for MongoDB collection servers"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
