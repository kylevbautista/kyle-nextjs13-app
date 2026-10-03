"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { SageTag } from "@/components/home/SageLine";
import {
  MENU_CURRENT_DOT,
  MENU_EXTERNAL_GLYPH,
  MENU_HEADER,
  MENU_ITEM,
  MENU_NOTICE,
  MENU_PANEL,
  MENU_SIGN_OUT_ROW,
  NAV_AVATAR_BUTTON,
  NAV_AVATAR_PHOTO,
  NAV_LOG_IN,
  NAV_SESSION_PLACEHOLDER,
  NAV_SESSION_RING,
} from "@/components/theme/tokens";
import { airingSchedulePath, isCurrentPath, myListPath, signInPath } from "@/lib/routes";

const FALLBACK_AVATAR = "/rimuru.png";
const DANCING_PEPE = "/assets/pepe-the-frog-dancing.gif";

export default function LoginBox() {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (status === "loading") {
    // The same box as Log in and the avatar, so nothing moves when the session resolves. Static:
    // without JavaScript the session never resolves (CLAUDE.md §10), and a pulse would run forever.
    return (
      <div aria-hidden="true" className={NAV_SESSION_PLACEHOLDER}>
        <span className={NAV_SESSION_RING} />
      </div>
    );
  }

  if (!session) {
    // Coming back to the sign-in page itself after signing in would be a dead end.
    const callbackUrl = pathname.startsWith("/auth") ? undefined : pathname;
    return (
      <Link
        href={signInPath(callbackUrl)}
        onClick={(event) => {
          // Include the query string (e.g. /search?q=…), which usePathname() omits.
          if (!callbackUrl || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          router.push(signInPath(window.location.pathname + window.location.search));
        }}
        className={NAV_LOG_IN}
      >
        Log in
      </Link>
    );
  }

  return <AccountMenu session={session} pathname={pathname} />;
}

function AccountMenu({ session, pathname }: { session: Session; pathname: string }) {
  // The menu is open only on the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Close on every navigation, including back/forward to the page it was opened on.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpenOn(null);
  }
  const open = openOn === pathname;
  const [pointerOver, setPointerOver] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const focusFirstItemOnOpen = useRef(false);
  const buttonId = useId();
  const menuId = useId();

  const name = session.user?.name?.trim() || null;
  const userImage = !imageFailed && session.user?.image ? session.user.image : null;
  // The 2.4 MB GIF is only requested while the avatar is hovered or keyboard-focused.
  const showPepe = pointerOver || keyboardFocus;
  const listHref = session.objectId ? myListPath(session.objectId) : null;
  const scheduleHref = session.objectId ? airingSchedulePath(session.objectId) : null;
  const onList = listHref !== null && isCurrentPath(pathname, listHref, "exact");
  const onSchedule = scheduleHref !== null && isCurrentPath(pathname, scheduleHref, "exact");

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const closeMenu = (returnFocus = false) => {
    setOpenOn(null);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: Event) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenOn(null);
    };
    // pointerdown: clicks/taps elsewhere; focusin: tabbing out of the menu.
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("focusin", closeIfOutside);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("focusin", closeIfOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open && focusFirstItemOnOpen.current) {
      focusFirstItemOnOpen.current = false;
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [open]);

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (open) {
      closeMenu();
      return;
    }
    // detail === 0: activated with Enter/Space rather than a pointer.
    focusFirstItemOnOpen.current = event.detail === 0;
    setOpenOn(pathname);
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      focusFirstItemOnOpen.current = true;
      setOpenOn(pathname);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = menuItems();
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index < 0 ? -1 : index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(-1);
        break;
    }
  };

  const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu(true);
    }
  };

  const handleButtonFocus = (event: FocusEvent<HTMLButtonElement>) => {
    let focusVisible = false;
    try {
      focusVisible = event.currentTarget.matches(":focus-visible");
    } catch {
      // Browsers without :focus-visible just skip the hover animation.
    }
    setKeyboardFocus(focusVisible);
  };

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    // Touch taps also fire pointerenter; don't download the GIF on phones.
    if (event.pointerType === "mouse") setPointerOver(true);
  };

  const handleSignOut = () => {
    closeMenu();
    void signOut({ callbackUrl: "/" });
  };

  return (
    <div ref={containerRef} className="relative shrink-0" onKeyDown={handleContainerKeyDown}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        onFocus={handleButtonFocus}
        onBlur={() => setKeyboardFocus(false)}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={() => setPointerOver(false)}
        className={NAV_AVATAR_BUTTON}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- OAuth avatars come from arbitrary hosts and need referrerPolicy */}
        <img
          src={userImage ?? FALLBACK_AVATAR}
          alt={name ? `${name}'s avatar` : "Your avatar"}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`${userImage ? NAV_AVATAR_PHOTO : "h-8 w-auto"} transition-opacity ${
            showPepe && gifLoaded ? "opacity-0" : ""
          }`}
        />
        {showPepe && (
          // eslint-disable-next-line @next/next/no-img-element -- animated GIF, rendered only on hover/focus
          <img
            src={DANCING_PEPE}
            alt=""
            aria-hidden="true"
            onLoad={() => setGifLoaded(true)}
            className="pointer-events-none absolute h-[30px]"
          />
        )}
      </button>

      {open && (
        <div className={MENU_PANEL}>
          {/* Outside role="menu", as before. The full name on purpose: only the signed-in person sees this menu. */}
          <div className={MENU_HEADER}>
            <p className={MENU_NOTICE}>
              <SageTag kind="Notice" />
              {name ? (
                <>
                  Signed in as <span className="font-semibold text-white">{name}</span>.
                </>
              ) : (
                "Signed in."
              )}
            </p>
          </div>
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            onKeyDown={handleMenuKeyDown}
            className="p-1.5"
          >
            {listHref && scheduleHref && (
              <>
                <li role="none">
                  <Link
                    role="menuitem"
                    href={listHref}
                    aria-current={onList ? "page" : undefined}
                    onClick={() => closeMenu()}
                    className={MENU_ITEM}
                  >
                    My List
                    {onList && (
                      <span aria-hidden="true" className={MENU_CURRENT_DOT}>
                        ●
                      </span>
                    )}
                  </Link>
                </li>
                <li role="none">
                  <Link
                    role="menuitem"
                    href={scheduleHref}
                    aria-current={onSchedule ? "page" : undefined}
                    onClick={() => closeMenu()}
                    className={MENU_ITEM}
                  >
                    Airing Schedule
                    {onSchedule && (
                      <span aria-hidden="true" className={MENU_CURRENT_DOT}>
                        ●
                      </span>
                    )}
                  </Link>
                </li>
              </>
            )}
            <li role="none">
              <a
                role="menuitem"
                href="https://www.trackkilo.com/"
                // The name says where it goes (the ↗ is decor); it starts with the visible label.
                aria-label="Lift Tracker, external site"
                onClick={() => closeMenu()}
                className={MENU_ITEM}
              >
                Lift Tracker
                <span aria-hidden="true" className={MENU_EXTERNAL_GLYPH}>
                  ↗
                </span>
              </a>
            </li>
            <li role="none" className={MENU_SIGN_OUT_ROW}>
              <button
                role="menuitem"
                type="button"
                onClick={handleSignOut}
                className={MENU_ITEM}
              >
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
