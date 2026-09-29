import "../styles/globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavBar from "../components/common/NavBar";
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
  themeColor: "#121212",
  colorScheme: "dark",
};

const footerLink =
  "rounded underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

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
        <footer className="mt-8 border-t border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-4 text-sm text-[rgb(164,164,164)]">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Anime data from{" "}
              <a
                href="https://anilist.co"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[#95ccff] ${footerLink}`}
              >
                AniList
              </a>{" "}
              · rankings from{" "}
              <a
                href="https://myanimelist.net"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[#95ccff] ${footerLink}`}
              >
                MyAnimeList
              </a>{" "}
              via{" "}
              <a
                href="https://jikan.moe"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[#95ccff] ${footerLink}`}
              >
                Jikan
              </a>
            </p>
            <nav aria-label="Footer">
              <ul className="flex gap-4">
                <li>
                  <Link href="/topanime" className={footerLink}>
                    Top anime
                  </Link>
                </li>
                <li>
                  <Link href="/search" className={footerLink}>
                    Search
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
