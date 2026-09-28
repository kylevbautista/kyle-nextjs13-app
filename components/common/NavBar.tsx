import LoginBox from "./LogInBox";
import { AnimeBar, NavLink } from "./AnimeBar";
import NavSearch from "./NavSearch";

export default function NavBar() {
  return (
    <nav
      id="main-nav"
      aria-label="Main"
      className="sticky top-0 z-20 mb-2 flex h-16 items-center justify-between gap-1 bg-[rgb(38,38,38)] px-1 text-white sm:gap-4 sm:px-2"
    >
      <div className="flex min-w-0 items-center">
        <NavLink href="/" match="exact">
          Home
        </NavLink>
        <AnimeBar />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NavSearch />
        <LoginBox />
      </div>
    </nav>
  );
}
