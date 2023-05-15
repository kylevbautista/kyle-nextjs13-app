import { HeaderProvider } from "../../../components/mylist/layout/HeaderProvider";
import { HeaderSelector } from "../../../components/mylist/layout/HeaderSelector";

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
    <div
      id="my-list"
      className="grid grid-cols-[auto_1fr] border border-blue-500 px-8"
    >
      {/* <div
        id="container"
        className="
        flex 
        flex-col 
        justify-center 
        items-center 
        sm:pt-4 sm:px-4
        text-white
        border
      "
      ></div> */}
      {/* <HeaderProvider>
        <HeaderSelector /> */}
      {children}
      {/* </HeaderProvider> */}
    </div>
  );
}
