import Slime from "@/components/home/Slime";
import {
  INFO_ACTION_BOX,
  INFO_BODY,
  INFO_CHIPS,
  INFO_COVER,
  INFO_FOOTER,
  INFO_HAIRLINE,
  INFO_HEADER,
  INFO_LINK_BOX,
  INFO_SHELL,
  INFO_TITLE_BOX,
} from "./tokens";

const BAR = "rounded bg-[rgb(53,53,53)]";

/**
 * AnimeInfoCard's placeholder, built from the same tokens, so it has the
 * card's exact box (every region has a fixed height) and swapping it for a
 * card shifts nothing. The season grid's lazy-load sentinel and /search's
 * loading grid. Hook-free, no directive (server components render it).
 */
export default function AnimeInfoCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={`${INFO_SHELL} pointer-events-none border border-[rgb(53,53,53)] bg-[rgb(30,30,30)]`}
    >
      <div className={`${INFO_HEADER} animate-pulse`}>
        <div className={`${INFO_TITLE_BOX} flex-col gap-1.5`}>
          <span className={`h-3.5 w-3/4 ${BAR}`} />
          <span className={`h-3.5 w-1/2 ${BAR}`} />
        </div>
        <div className={INFO_CHIPS}>
          <span className="h-5 w-14 rounded-full bg-[rgb(53,53,53)]" />
          <span className="h-5 w-12 rounded-full bg-[rgb(53,53,53)]" />
          <span className="h-5 w-16 rounded-full bg-[rgb(53,53,53)]" />
        </div>
      </div>
      <div className={`${INFO_HAIRLINE} bg-[rgb(53,53,53)]`} />
      <div className={`${INFO_BODY} animate-pulse`}>
        <div className={INFO_COVER}>
          <span className="absolute inset-x-0 top-0 h-[34px] bg-[#050915]/60" />
          <Slime size={40} animated={false} className="absolute inset-0 m-auto opacity-25" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-2.5 py-2">
          {["w-3/4", "w-2/3", "w-1/2"].map((width) => (
            <div key={width} className="flex flex-col gap-1.5">
              <span className={`h-2 w-12 ${BAR}`} />
              <span className={`h-3 ${width} ${BAR}`} />
            </div>
          ))}
        </div>
      </div>
      <div className={`${INFO_FOOTER} animate-pulse`}>
        <span className={`${INFO_ACTION_BOX} h-11 rounded-full bg-[rgb(53,53,53)] md:h-9`} />
        <span className={`ml-auto ${INFO_LINK_BOX} rounded-full bg-[rgb(53,53,53)]`} />
        <span className={`${INFO_LINK_BOX} rounded-full bg-[rgb(53,53,53)]`} />
      </div>
    </div>
  );
}
