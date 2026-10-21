# kylevb Anime: the iPhone widget

A [Scriptable](https://scriptable.app) script that puts your Airing Schedule's **Next episodes** card on the
iPhone Home Screen (small, medium, large) and Lock Screen (rectangular, inline, circular), in the site's
night-sky look. It reads `https://kylevb.com/api/widget/v1/list/<your list id>` (CLAUDE.md §5.9).

## Setup

```
kylevb Anime: your Airing Schedule on the Home Screen and Lock Screen

1. Install "Scriptable" from the App Store (free).
2. On your iPhone, open this file on GitHub: widgets/scriptable/kylevb-anime.js → tap "Raw" →
   select all → Copy.
3. In Scriptable tap +, paste, then tap the title and name the script kylevb-anime. Tap Done.
4. Run it once (tap ▶). Choose "Link my list…" and paste your list link: on kylevb.com open your
   Airing Schedule and tap "Copy link". It looks like https://kylevb.com/user/65f1…
   (a /mylist/… link or just the id works too). Then try the previews.
5. Home Screen: touch and hold an empty spot → Edit → Add Widget → Scriptable → pick Small,
   Medium or Large → Add Widget. Touch and hold the new widget → Edit Widget:
     Script:            kylevb-anime
     When Interacting:  leave as it is (the widget opens the right page itself)
     Parameter:         leave empty (it uses the link from step 4)
6. Lock Screen (optional): touch and hold the Lock Screen → Customize → Lock Screen → tap the
   widget area → Scriptable → Rectangular, Inline or Circular → tap it → Script: kylevb-anime.
7. Tinted or Clear Home Screen and the widget looks washed out? Run the script and turn on
   "Glass mode for every widget" (or add the word glass to one widget's Parameter).

Showing a different list: paste its link into that widget's Parameter.
Reading it: times are Pacific Time, like the site. Countdowns tick live within a day of an episode.
iOS decides when a widget redraws, so right after an episode's time a countdown may count up until
it does; the time printed beside it is always right.
Updating: when the script's menu says a newer version is on GitHub, repeat steps 2–3, pasting over
the old text. Your link, saved data and widgets keep working.
Privacy: one request to kylevb.com per refresh for your list's public schedule (the same data as
your /mylist link), plus the widget's pictures from kylevb.com (downloaded once, and again after an
update) and AniList cover images. Stored on this phone only. No passwords, keys or tracking.
```

## For maintainers

| File | What |
|---|---|
| `kylevb-anime.js` | The script (plain JavaScript for Scriptable's JavaScriptCore; linted by `eslint.config.mjs`'s Scriptable block, never bundled or imported by the app) |
| `mockRuntime.ts` | A mock of Scriptable's API with its documented defaults and known quirks |
| `harness.ts` | Runs the real script in the mock under vitest (`runScript`) |
| `fixtures.ts` | Lists and real payloads (`buildWidgetPayload`) at fixed Pacific Time epochs |
| `kylevb-anime.test.ts` | The script through the mock: every family, state, failure and deadline |
| `parity.test.ts` | The script's rules, constants and copy against `lib/widget.ts`, `lib/anime/widgetCopy.ts` and the Next-episodes card |
| `mockRuntime.test.ts` | The mock's own fidelity |

- The server sends every word and Pacific Time label in the payload; the script decides only what depends on the
  phone's clock (which rows are still visible, each row's phase, the slime's mood, `refreshAfterDate`).
- Any change to the script: bump `SCRIPT_VERSION` here and `WIDGET_SCRIPT_VERSION` in `lib/widget.ts`
  (the menu then tells people to re-paste). The `/v1` payload stays additive; a breaking change ships `/v2`.
- Any change to the art: bump `WIDGET_ART_VERSION` in `lib/widgetArt.ts`, set the script's
  `ART_VERSION_FALLBACK` to match (parity checks it) and bump `SCRIPT_VERSION` with it. Phones remember the
  latest art version a payload named (`config.json`), so stored copies and the no-payload states ask for art the
  server still serves after an update (a picture not fetched yet is drawn from an older cached version).
- The card's layout is copied here: any change to `components/mylist/NextEpisodes.tsx`'s JSX shape (each element's
  depth, tag, `className` and `mode`, in order; a className built from a constant fails until the extraction is
  extended) fails `parity.test.ts`'s tripwire, and so does a change to `CountdownText`'s row-mode soon text or its
  dot, until this script has been checked against them (CLAUDE.md §9.18).

## Checking it on a phone

What only a real iPhone can tell (the tests run the script in a mock, and the previews approximate SwiftUI):

1. The script runs and the menu appears; **Link my list…** says "Linked to …"; **Diagnostics** shows `Art v1 @3x: 15/15`
   (`@2x` on a 2× screen: SE, XR, 11, iPads).
2. Medium and large on the Home Screen: the sky fills edge to edge, the forest at the bottom, covers sharp,
   "PT" on every line, the slime standing on the card (large) and the footer (medium).
3. Small: the timer ticks; a tap opens the Airing Schedule's whole week (after a Scriptable flash).
4. Within an hour of an episode the row turns amber; after its time, note how long until it reads "Aired …"
   (Diagnostics' gaps show how often iOS really redraws).
5. Tinted and Clear Home Screens: if the sky turns into a white block, turn on **Glass mode for every widget**.
6. Lock Screen rectangular, inline and circular: the timer ticks in rectangular and never touches the time.
7. Turn on Airplane Mode and check in Control Center that Wi-Fi is off too (Airplane Mode keeps Wi-Fi on if you
   turned it on there before). Wait 2 minutes (a copy saved under 90 s ago is shown as fresh, with no request),
   then open Scriptable (iOS usually redraws its widgets then; or run the script and use **Preview…**): the rows
   stay, with "Saved …" (medium) and "Couldn't reach kylevb.com. Showing air times saved …" (large).
8. On a slow connection, a widget still draws within a few seconds. The script races every download against
   Scriptable's `Timer`; whether that timer fires inside a widget is unconfirmed (if not, the widget waits on
   iOS's own idle timeout instead).
9. An iPad, if you use one: medium and large fit with nothing clipped.
