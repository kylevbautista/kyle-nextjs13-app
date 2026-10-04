import Slime from "@/components/home/Slime";
import {
  SIGN_IN_SLIME_BOX,
  SIGN_IN_SLIME_IDLE,
  SIGN_IN_SLIME_NAMED,
  SIGN_IN_SLIME_WORRIED,
} from "@/components/theme/tokens";

/**
 * Sign-in's emblem (the owner's 100px image slot). The slime reacts to the client island below with
 * no client JavaScript and no remount. All three are server HTML, and CSS (:has on CardPage's
 * group/card) shows one: worried next to a 《Warning》 (data-slime="worried"), the Named Slime (gold
 * rim + star, happy: "Naming complete.") once the session says you're signed in
 * (data-slime="named"), idle otherwise. Hidden slimes don't animate (display: none). Browsers
 * without :has() keep the idle one.
 */
export default function SignInSlime() {
  return (
    <div aria-hidden="true" className={SIGN_IN_SLIME_BOX}>
      <Slime size={100} className={SIGN_IN_SLIME_IDLE} />
      <Slime size={100} mood="worried" className={SIGN_IN_SLIME_WORRIED} />
      <Slime size={100} mood="happy" tier="named" className={SIGN_IN_SLIME_NAMED} />
    </div>
  );
}
