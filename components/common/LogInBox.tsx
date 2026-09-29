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
import { airingSchedulePath, myListPath, signInPath } from "@/lib/routes";

const AVATAR_BUTTON_SIZE = "h-12 w-12 sm:h-[63px] sm:w-[63px]";
const FALLBACK_AVATAR = "/rimuru.png";
const DANCING_PEPE = "/assets/pepe-the-frog-dancing.gif";

const MENU_ITEM_CLASS =
  "block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-blue-500 hover:text-white focus-visible:bg-blue-500 focus-visible:text-white focus-visible:outline-none";

export default function LoginBox() {
  const { data: session, status } = useSession();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (status === "loading") {
    return (
      <div aria-hidden="true" className={`${AVATAR_BUTTON_SIZE} flex items-center justify-center`}>
        <div className="h-8 w-8 animate-pulse rounded-full bg-[rgb(53,53,53)]" />
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
        className="flex h-16 shrink-0 items-center rounded-2xl px-3 text-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#95ccff] sm:px-5 sm:text-base"
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
        className={`${AVATAR_BUTTON_SIZE} relative flex items-center justify-center rounded-full hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#95ccff] ${
          open ? "bg-blue-500" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- OAuth avatars come from arbitrary hosts and need referrerPolicy */}
        <img
          src={userImage ?? FALLBACK_AVATAR}
          alt={name ? `${name}'s avatar` : "Your avatar"}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`${userImage ? "h-8 w-8 rounded-full object-cover" : "h-8 w-auto"} transition-opacity ${
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
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] py-2 shadow-lg shadow-black/50">
          {name && (
            <p className="truncate border-b border-[rgb(53,53,53)] px-4 pb-2 text-xs text-[rgb(164,164,164)]">
              Signed in as <span className="text-white">{name}</span>
            </p>
          )}
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            onKeyDown={handleMenuKeyDown}
            className="pt-1"
          >
            {session.objectId && (
              <>
                <li role="none">
                  <Link
                    role="menuitem"
                    href={myListPath(session.objectId)}
                    onClick={() => closeMenu()}
                    className={MENU_ITEM_CLASS}
                  >
                    My List
                  </Link>
                </li>
                <li role="none">
                  <Link
                    role="menuitem"
                    href={airingSchedulePath(session.objectId)}
                    onClick={() => closeMenu()}
                    className={MENU_ITEM_CLASS}
                  >
                    Airing Schedule
                  </Link>
                </li>
              </>
            )}
            <li role="none">
              <a
                role="menuitem"
                href="https://www.trackkilo.com/"
                onClick={() => closeMenu()}
                className={MENU_ITEM_CLASS}
              >
                Lift Tracker
              </a>
            </li>
            <li role="none" className="mt-1 border-t border-[rgb(53,53,53)] pt-1">
              <button
                role="menuitem"
                type="button"
                onClick={handleSignOut}
                className={MENU_ITEM_CLASS}
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
