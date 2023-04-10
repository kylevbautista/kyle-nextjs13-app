export const metadata = {
  title: "Top Anime",
  description: "kylevb.com top anime page",
  openGraph: {
    title: "Kyle",
    description: "kylevb.com top anime",
    images: [
      {
        url: "/rimuru.png",
        width: 200,
        height: 141,
      },
    ],
  },
};

export default function TopAnimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div id="top-anime">{children}</div>;
}
