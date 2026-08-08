import { describe, expect, it } from "vitest";
import { paginationRange } from "./pagination.js";

describe("paginationRange", () => {
  it("shows every page when the total fits without collapsing", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("always includes page 1 and the last page", () => {
    const range = paginationRange(5, 20);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(20);
  });

  it("collapses a large gap on both sides into a single ellipsis", () => {
    expect(paginationRange(10, 20)).toEqual([1, "...", 9, 10, 11, "...", 20]);
  });

  it("omits the leading ellipsis when current is near the start", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, "...", 20]);
  });

  it("omits the trailing ellipsis when current is near the end", () => {
    expect(paginationRange(20, 20)).toEqual([1, "...", 19, 20]);
  });

  it("handles a single page", () => {
    expect(paginationRange(1, 1)).toEqual([1]);
  });

  it("handles zero total gracefully instead of returning an empty range", () => {
    expect(paginationRange(1, 0)).toEqual([1]);
  });

  it("respects a wider siblingCount", () => {
    expect(paginationRange(10, 20, 2)).toEqual([1, "...", 8, 9, 10, 11, 12, "...", 20]);
  });
});
