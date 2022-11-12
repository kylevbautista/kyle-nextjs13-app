import Link from "next/link";
import "../globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head></head>
      <body className="grid grid-rows-[auto_1fr_auto] min-h-screen bg-[rgb(18,18,18)]">
        <nav
          id="main-nav"
          className="flex justify-between bg-[rgb(38,38,38)] text-white mb-2"
        >
          <div className="flex justify-items-center">
            <div className="inline-block mx-4 my-2 hover:bg-sky-700">
              NEXTJS 13
            </div>
            <Link href="/" className="mx-4 my-2 hover:bg-sky-700">
              Home
            </Link>
            <Link href="/notes" className="mx-4 my-2 hover:bg-sky-700">
              Search
            </Link>
          </div>
          <div className="flex justify-items-center">
            <Link href="/" className="mx-4 my-2 hover:bg-sky-700">
              Log
            </Link>
            <Link href="/" className="mx-4 my-2 hover:bg-sky-700">
              In
            </Link>
          </div>
        </nav>
        {children}
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
