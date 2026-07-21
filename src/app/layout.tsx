import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout";
import ThemeProvider from "@/components/theme/ThemeProvider";
import StoreProvider from "@/store/StoreProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CarWash",
  description: "CarWash — React + Next.js",
};

/** До гидрации: тема + полная палитра из localStorage. */
const themeBootScript = `
(function () {
  try {
    var root = document.documentElement;
    var t = localStorage.getItem("theme");
    if (t !== "dark" && t !== "light") t = "light";
    root.setAttribute("data-theme", t);
    root.style.colorScheme = t;

    var defaults = {
      light: {
        background: "#ffffff",
        block: "#ffffff",
        hover: "#f4f4f5",
        button: "#2563eb",
        text: "#18181b",
        description: "#a1a1aa"
      },
      dark: {
        background: "#09090b",
        block: "#09090b",
        hover: "#18181b",
        button: "#3b82f6",
        text: "#f4f4f5",
        description: "#a1a1aa"
      }
    };
    var palette = Object.assign({}, defaults[t]);
    try {
      var raw = localStorage.getItem("theme_palette");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed[t]) {
          var p = parsed[t];
          ["background", "block", "hover", "button", "text", "description"].forEach(function (k) {
            if (p[k]) palette[k] = p[k];
          });
          if (!p.block && p.background) palette.block = p.background;
        }
      }
    } catch (e2) {}

    function adj(hex, amount) {
      var h = String(hex || "").replace("#", "");
      if (h.length !== 6) return hex;
      function ch(s) {
        var n = Math.max(0, Math.min(255, parseInt(s, 16) + amount));
        return n.toString(16).padStart(2, "0");
      }
      return "#" + ch(h.slice(0, 2)) + ch(h.slice(2, 4)) + ch(h.slice(4, 6));
    }

    root.style.setProperty("--background", palette.background);
    root.style.setProperty("--foreground", palette.text);
    root.style.setProperty("--app-block", palette.block);
    root.style.setProperty("--app-hover", palette.hover);
    root.style.setProperty("--app-button", palette.button);
    root.style.setProperty("--app-button-hover", adj(palette.button, -20));
    root.style.setProperty("--app-text", palette.text);
    root.style.setProperty("--app-description", palette.description);
    root.style.setProperty("--color-white", palette.block);
    root.style.setProperty("--color-blue-500", adj(palette.button, 25));
    root.style.setProperty("--color-blue-600", palette.button);
    root.style.setProperty("--color-blue-700", adj(palette.button, -20));
    if (t === "light") {
      root.style.setProperty("--color-zinc-50", palette.hover);
      root.style.setProperty("--color-zinc-100", adj(palette.hover, -8));
      root.style.setProperty("--color-zinc-400", palette.description);
      root.style.setProperty("--color-zinc-900", palette.text);
    } else {
      root.style.setProperty("--color-zinc-50", palette.text);
      root.style.setProperty("--color-zinc-400", palette.description);
      root.style.setProperty("--color-zinc-900", palette.hover);
      root.style.setProperty("--color-zinc-950", palette.block);
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="light" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <StoreProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
