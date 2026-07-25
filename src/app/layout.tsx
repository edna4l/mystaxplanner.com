import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stax — Planner",
  description: "A personal planner, calendar, habit tracker, and bills tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Newsreader:opsz,wght@6..72,400..600&display=swap"
          rel="stylesheet"
        />
        {/* Repaints the background/ink from last time before anything
            else renders, using the cache applyTheme() writes (see
            src/lib/theme.ts) — otherwise every full page load briefly
            shows the light-mode background even for a Dark-mode user,
            until React mounts and applies the real theme. A blocking
            beforeInteractive script is the only way to beat first paint. */}
        <Script id="theme-precache" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var raw = localStorage.getItem("stax-theme-cache");
                if (!raw) return;
                var t = JSON.parse(raw);
                var r = document.documentElement;
                if (t.bg) r.style.setProperty("--bg", t.bg);
                if (t.ink) r.style.setProperty("--ink", t.ink);
                if (t.panel) r.style.setProperty("--panel", t.panel);
                if (t.line) r.style.setProperty("--line", t.line);
                r.setAttribute("data-appearance", t.dark ? "dark" : "light");
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
