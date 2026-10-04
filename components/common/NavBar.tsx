import Slime from "@/components/home/Slime";
import {
  NAV_BAR,
  NAV_BRAND_MARK,
  NAV_HAIRLINE,
  NAV_LINK_STRIP,
  NAV_STAR_FIELD,
  NAV_STARS,
} from "@/components/theme/tokens";
import LoginBox from "./LogInBox";
import { AnimeBar, NavLink } from "./AnimeBar";
import FocusNudge from "./FocusNudge";
import NavSearch from "./NavSearch";
import SkipLink from "./SkipLink";

/**
 * The site nav, the top edge of the night sky. The owner's layout: links left, search and the
 * session slot right. Its box (h-16 + mb-2, sticky top-0) is load-bearing and it is paint-only:
 * see the "Site chrome" section of components/theme/tokens.ts.
 */
export default function NavBar() {
  return (
    <nav id="main-nav" aria-label="Main" className={NAV_BAR}>
      {/* The first Tab stop on every page; absolute, so it takes no room in the bar. Before the link strip: it is its `peer`. */}
      <SkipLink />
      {/* Keeps keyboard focus out from under this sticky bar (renders nothing). */}
      <FocusNudge />
      {/* Before the links: they (relative, later in the DOM) paint over the stars. Static: 1024px+ only, in the empty middle band. */}
      <span aria-hidden="true" className={NAV_STAR_FIELD} style={{ boxShadow: NAV_STARS }} />
      {/* The link strip: if large fonts, zoom or a 280px screen overflow it, it scrolls sideways instead of sliding
          under the search. Its overflow clips focus outlines too: the links use FOCUS_RING_NAV's inset outline. */}
      <div className={NAV_LINK_STRIP}>
        <NavLink href="/" match="exact">
          Home
        </NavLink>
        {/* The mascot as the brand's mark: rendered here on the server, static (nothing in the nav animates). */}
        <AnimeBar brandMark={<Slime size={20} animated={false} idScope="nav-brand" className={NAV_BRAND_MARK} />} />
      </div>
      {/* gap-1 is part of the phone search's open-width arithmetic (NAV_SESSION_SLOT). */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NavSearch />
        <LoginBox />
      </div>
      {/* Last, so the hover pills never paint over it. */}
      <span aria-hidden="true" className={NAV_HAIRLINE} />
    </nav>
  );
}
