/**
 * Scrolls a chip fully into view inside its sideways-scrolling row (the phone
 * shelf rows on My List and the landing's tracker demo), clear of the row's
 * right-edge fade. Moves only the row, never the page.
 */
export function revealInRow(chip: Element | null | undefined, fade = 40): void {
  const row = chip?.closest("ul");
  if (!chip || !row || row.scrollWidth <= row.clientWidth) return;
  const rowBox = row.getBoundingClientRect();
  const chipBox = chip.getBoundingClientRect();
  if (chipBox.left < rowBox.left + 4) row.scrollLeft -= rowBox.left + 4 - chipBox.left;
  else if (chipBox.right > rowBox.right - fade) row.scrollLeft += chipBox.right - (rowBox.right - fade);
}
