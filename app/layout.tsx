import Link from "next/link";
import { getCurrentSeasonPath } from "../components/anime/year/helpers";
import "./globals.css";
import Providers from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const getCurrentYear = (shifted: Boolean = false) => {
    const dateObject = new Date();
    const currentYear = dateObject.getUTCFullYear();
    const currentMonth = dateObject.getUTCMonth();
    if (currentMonth === 11 && !shifted) {
      return currentYear + 1;
    }
    return currentYear;
  };
  return (
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link
          rel="icon"
          type="image/webp"
          sizes="200x141"
          href="/rimuru.png"
        ></link>
      </head>
      <body className="grid grid-rows-[auto_1fr_auto] min-h-screen bg-[rgb(18,18,18)]">
        <nav
          id="main-nav"
          className="flex justify-between bg-[rgb(38,38,38)] text-white mb-2 sticky top-0 z-[1]"
        >
          <div className="flex justify-items-center">
            <div className="inline-block mx-4 my-2 cursor-default">Kyle</div>
            <Link href="/" className="mx-4 my-2 hover:bg-sky-700">
              Home
            </Link>
            <Link
              href={`/anime/${getCurrentYear(true)}/${getCurrentSeasonPath(
                null,
                true
              )}`}
              className="mx-4 my-2 hover:bg-sky-700"
            >
              カイル
            </Link>
          </div>
          <div className="flex justify-items-center">
            <Link href="/auth" className="mx-4 my-2 hover:bg-sky-700">
              Log
            </Link>
            <Link href="/auth" className="mx-4 my-2 hover:bg-sky-700">
              In
            </Link>
          </div>
        </nav>
        <Providers>{children}</Providers>
        <footer
          id="main-nav"
          className="flex justify-between bg-[rgb(38,38,38)] text-white mt-2 h-10"
        >
          <div>I am foot</div>
        </footer>
      </body>
    </html>
  );
}
