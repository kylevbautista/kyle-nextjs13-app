import "../styles/globals.css";
import "nprogress/nprogress.css";
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
        <style>
          {`body {
              overflow: overlay
            }
            ::-webkit-scrollbar {
              width: 17px;
            }
            ::-webkit-scrollbar-track {
              background-color: transparent;
            }

            ::-webkit-scrollbar-thumb {
              border-radius: 20px;
              border: 6px solid transparent;
              background-clip: content-box;
            }

            ::-webkit-scrollbar-thumb:hover {
              background-color: #c0a0b9;
            }
          `}
        </style>
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
