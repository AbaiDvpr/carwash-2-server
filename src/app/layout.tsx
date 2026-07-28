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
        background: "#f4f4f5",
        block: "#ffffff",
        hover: "#ececef",
        button: "#2563eb",
        buttonHover: "#1d4ed8",
        buttonText: "#ffffff",
        text: "#18181b",
        description: "#a1a1aa",
        border: "#e4e4e7",
        danger: "#dc2626",
        success: "#16a34a",
        warning: "#d97706",
        mapWash: "#38bdf8",
        mapCharging: "#facc15"
      },
      dark: {
        background: "#09090b",
        block: "#18181b",
        hover: "#27272a",
        button: "#3b82f6",
        buttonHover: "#2563eb",
        buttonText: "#ffffff",
        text: "#f4f4f5",
        description: "#a1a1aa",
        border: "#3f3f46",
        danger: "#f87171",
        success: "#4ade80",
        warning: "#fbbf24",
        mapWash: "#38bdf8",
        mapCharging: "#facc15"
      }
    };
    var palette = Object.assign({}, defaults[t]);
    try {
      var raw = localStorage.getItem("theme_palette");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed[t]) {
          var p = parsed[t];
          ["background", "block", "hover", "button", "buttonHover", "buttonText", "text", "description", "border", "danger", "success", "warning", "mapWash", "mapCharging"].forEach(function (k) {
            if (p[k]) palette[k] = p[k];
          });
          if (!p.block && p.background) palette.block = p.background;
          if (!p.buttonHover && p.button) palette.buttonHover = adj(p.button, -20);
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
    root.style.setProperty("--app-button-hover", palette.buttonHover || adj(palette.button, -20));
    root.style.setProperty("--app-button-text", palette.buttonText || "#ffffff");
    root.style.setProperty("--app-text", palette.text);
    root.style.setProperty("--app-description", palette.description);
    root.style.setProperty("--app-border", palette.border);
    root.style.setProperty("--app-danger", palette.danger);
    root.style.setProperty("--app-success", palette.success);
    root.style.setProperty("--app-warning", palette.warning);
    root.style.setProperty("--map-wash", palette.mapWash);
    root.style.setProperty("--map-charging", palette.mapCharging);
    root.style.setProperty("--color-white", palette.block);
    root.style.setProperty("--color-blue-500", adj(palette.button, 25));
    root.style.setProperty("--color-blue-600", palette.button);
    root.style.setProperty("--color-blue-700", palette.buttonHover || adj(palette.button, -20));
    root.style.setProperty("--color-red-500", palette.danger);
    root.style.setProperty("--color-red-600", palette.danger);
    root.style.setProperty("--color-emerald-500", palette.success);
    root.style.setProperty("--color-emerald-600", palette.success);
    root.style.setProperty("--color-amber-500", palette.warning);
    root.style.setProperty("--color-amber-600", palette.warning);
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

    var layoutDefaults = {
      pagePadX: "1rem",
      pagePadTop: "0.25rem",
      pagePadBottom: "2rem",
      rowPadX: "1rem",
      rowPadY: "0.75rem",
      rowGap: "0.75rem",
      stackGap: "1rem",
      sectionRadius: "1rem",
      sectionRadiusSm: "0.75rem",
      buttonRadius: "0.5rem",
      buttonPadX: "0.75rem",
      buttonPadY: "0.5rem",
      borderWidth: "1px",
      fontSize: "14px",
      lineHeight: "1.45"
    };
    var layout = Object.assign({}, layoutDefaults);
    try {
      var layoutRaw = localStorage.getItem("theme_layout");
      if (layoutRaw) {
        var layoutParsed = JSON.parse(layoutRaw);
        if (layoutParsed && typeof layoutParsed === "object") {
          Object.keys(layoutDefaults).forEach(function (k) {
            if (layoutParsed[k]) layout[k] = layoutParsed[k];
          });
        }
      }
    } catch (e3) {}
    root.style.setProperty("--app-page-pad-x", layout.pagePadX);
    root.style.setProperty("--app-page-pad-top", layout.pagePadTop);
    root.style.setProperty("--app-page-pad-bottom", layout.pagePadBottom);
    root.style.setProperty("--app-row-pad-x", layout.rowPadX);
    root.style.setProperty("--app-row-pad-y", layout.rowPadY);
    root.style.setProperty("--app-row-gap", layout.rowGap);
    root.style.setProperty("--app-stack-gap", layout.stackGap);
    root.style.setProperty("--app-section-radius", layout.sectionRadius);
    root.style.setProperty("--app-section-radius-sm", layout.sectionRadiusSm);
    root.style.setProperty("--app-button-radius", layout.buttonRadius);
    root.style.setProperty("--app-button-pad-x", layout.buttonPadX);
    root.style.setProperty("--app-button-pad-y", layout.buttonPadY);
    root.style.setProperty("--app-border-width", layout.borderWidth);
    root.style.setProperty("--app-font-size", layout.fontSize);
    root.style.setProperty("--app-line-height", layout.lineHeight);
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
