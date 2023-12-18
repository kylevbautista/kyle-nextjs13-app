export const metadata = {
  title: "My List",
  description: "My anime list",
  openGraph: {
    title: "My List",
    description: "My anime list",
    images: [
      {
        url: "/rimuru.png",
        width: 200,
        height: 141,
      },
    ],
  },
};

export default function MyListLayout({
  params,
  children,
}: {
  params: any;
  children: React.ReactNode;
}) {
  return (
    <div id="my-list" className="grid grid-cols-[auto_1fr] px-8">
      {children}
    </div>
  );
}
