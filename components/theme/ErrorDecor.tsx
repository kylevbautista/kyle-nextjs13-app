import NightSky from "@/components/home/NightSky";
import Slime from "@/components/home/Slime";

/**
 * app/error.tsx's decor, in its own chunk: error.tsx ships on every page (NightSky + Slime are about
 * 4 KB gz), so they load only when an error renders. Both fade in; their boxes are already laid out
 * (CardPage's sky slot, ERROR_SLIME_BOX), so nothing shifts.
 */
export function ErrorSky() {
  return (
    <div className="absolute inset-0 animate-fade-in">
      <NightSky variant="page" forest={false} />
    </div>
  );
}

export function ErrorSlime() {
  return <Slime size={64} mood="worried" className="animate-fade-in" />;
}
