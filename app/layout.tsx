import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cricscore — Live Cricket Scores & Commentary",
  description: "Follow live cricket scores, ball-by-ball commentary, fixtures and match results on Cricscore.",
  applicationName: "Cricscore",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cricscore" },
};
export const viewport: Viewport = { themeColor: "#071b16", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
