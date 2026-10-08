import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { MOTION_STORAGE_KEY, REDUCED_MOTION_QUERY } from "@/lib/motion-mode";
import { profile } from "@/data/profile";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${profile.name} — Portfolio`,
  description: profile.tagline,
};

/**
 * Runs synchronously while the browser parses the HTML, so `data-motion` is on
 * `<html>` before the first paint. Without this, a user who asked for reduced
 * motion would see one frame of the full motion design before the store
 * hydrates. Kept in sync with `resolveInitialMotionMode()` in the store.
 */
const noFlashScript = `
(function () {
  try {
    var stored = localStorage.getItem('${MOTION_STORAGE_KEY}');
    var mode = (stored === 'wild' || stored === 'calm')
      ? stored
      : (window.matchMedia('${REDUCED_MOTION_QUERY}').matches ? 'calm' : 'wild');
    document.documentElement.dataset.motion = mode;
  } catch (e) {
    document.documentElement.dataset.motion = 'wild';
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline script below writes data-motion before React hydrates.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
