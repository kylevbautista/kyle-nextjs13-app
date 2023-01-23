import Link from "next/link";
// import { unstable_getServerSession } from "next-auth/next";
// import { authOptions } from "../../server/auth";
import LoginBox from "./LogInBox";
import { AnimeBar } from "./AnimeBar";

const getCurrentYear = (shifted: Boolean = false) => {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();
  if (currentMonth === 11 && !shifted) {
    return currentYear + 1;
  }
  return currentYear;
};

export default function NavBar() {
  // const session = await unstable_getServerSession(authOptions);

  return (
    <nav
      id="main-nav"
      className="flex justify-between bg-[rgb(38,38,38)] text-white mb-2 sticky top-0 z-[1]"
    >
      <div className="flex justify-items-center">
        <div
          className="
            block
            p-5
          "
        >
          <p>Kyle</p>
        </div>
        <Link
          href="/"
          className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
        >
          <p>Home</p>
        </Link>
        <AnimeBar />
      </div>
      <LoginBox />
    </nav>
  );
}
