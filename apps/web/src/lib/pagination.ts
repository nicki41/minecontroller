/**
 * Windowed page numbers for numbered pagination controls: always includes
 * page 1 and the last page, plus `siblingCount` pages on each side of
 * `current`, collapsing any gap into a single "..." entry.
 */
export function paginationRange(current: number, total: number, siblingCount = 1): (number | "...")[] {
  if (total <= 0) return [1];

  const totalNumbersShown = siblingCount * 2 + 5; // first + last + current + 2 ellipses worth of siblings
  if (total <= totalNumbersShown) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblingCount, 1);
  const right = Math.min(current + siblingCount, total);

  const range: (number | "...")[] = [1];
  if (left > 2) range.push("...");
  for (let page = Math.max(left, 2); page <= Math.min(right, total - 1); page++) range.push(page);
  if (right < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}
