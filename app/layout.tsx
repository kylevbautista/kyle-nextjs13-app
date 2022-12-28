import "./globals.css";
import NavBar from "../components/common/NavBar";
import Providers from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Providers>
          <NavBar />
          {children}
        </Providers>
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
