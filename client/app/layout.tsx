import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
// Pretendard covers Korean properly; Geist (latin-only) was falling back to
// system fonts for every Korean string. Mono stays Geist for labels and data.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "File Agent Drive",
  description: "파일을 올리고, 정리하고, 필요할 때 바로 찾는 개인 드라이브.",
};

export const viewport: Viewport = {
  // Match the mobile browser bar to the top bar.
  themeColor: "#fbfaf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
