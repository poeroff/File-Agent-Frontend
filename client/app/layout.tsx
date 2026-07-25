import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "File Agent Drive",
  description: "파일을 올리고, 정리하고, 필요할 때 바로 찾는 개인 드라이브.",
};

export const viewport: Viewport = {
  // Match the mobile browser bar to the top bar in each theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e11" },
  ],
};

// Applies the saved theme before first paint so there's no light→dark flash.
// Runs inline in <head>; falls back to the OS preference when nothing is saved.
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
