import "../styles/globals.css";
import type { Metadata, Viewport } from "next";
import NavBar from "../components/common/NavBar";
import SiteFooter from "../components/common/SiteFooter";
import Providers from "./providers";

const SITE_DESCRIPTION =
  "Track every anime airing this season — live episode countdowns, your list, your progress.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kylevb.com"),
  title: {
    default: "kylevb — seasonal anime tracker",
    template: "%s · kylevb",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "kylevb",
    title: "kylevb — seasonal anime tracker",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/rimuru.png",
        width: 200,
        height: 141,
        alt: "Rimuru, the kylevb mascot",
      },
    ],
  },
  icons: { icon: "/rimuru.png" },
};

export const viewport: Viewport = {
  // The nav's top color (the night sky), so a phone's browser toolbar continues it.
  themeColor: "#0a1428",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[rgb(18,18,18)]">
        <Providers>
          <NavBar />
          {children}
        </Providers>
        {/* A direct child of <body>: the landing's StickyCta observes `body > footer`. */}
        <SiteFooter />
      </body>
    </html>
  );
}
