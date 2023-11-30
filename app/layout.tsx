import "../styles/globals.css";
import "nprogress/nprogress.css";
import NavBar from "../components/common/NavBar";
import Providers from "./providers";

export const metadata = {
  title: "Home",
  description: "kylevb.com homepage",
  openGraph: {
    title: "Kyle",
    description: "kylevb.com homepage",
    images: [
      {
        url: "/rimuru.png",
        width: 200,
        height: 141,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <style>
          {`
            body {
              overflow: overlay
            }
            // ::-webkit-scrollbar {
            //   width: 17px;
            // }
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
      <body className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[rgb(18,18,18)]">
        <Providers>
          <NavBar />
          {children}
        </Providers>
        <footer
          id="main-nav"
          className="mt-2 flex h-10 justify-between bg-[rgb(38,38,38)] text-white"
        >
          <div>I am foot</div>
        </footer>
      </body>
    </html>
  );
}
