import { describe, it, expect } from "vitest";
import { calculateDeadlineStatus } from "./deadline.js";

describe("calculateDeadlineStatus", () => {
  it("should return blue if completed", () => {
    expect(calculateDeadlineStatus(new Date(), true)).toBe("blue");
    expect(calculateDeadlineStatus(null, true)).toBe("blue");
  });

  it("should return gray if no deadline", () => {
    expect(calculateDeadlineStatus(null, false)).toBe("gray");
    expect(calculateDeadlineStatus(undefined, false)).toBe("gray");
  });

  it("should return gray if deadline has passed", () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(calculateDeadlineStatus(pastDate, false)).toBe("gray");
  });

  it("should return red if deadline is within 3 days", () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(calculateDeadlineStatus(inTwoDays, false)).toBe("red");
  });

  it("should return orange if deadline is between 3 and 7 days", () => {
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(calculateDeadlineStatus(inFiveDays, false)).toBe("orange");
  });

  it("should return yellow if deadline is between 7 and 14 days", () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(calculateDeadlineStatus(inTenDays, false)).toBe("yellow");
  });

  it("should return green if deadline is more than 14 days", () => {
    const inTwentyDays = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    expect(calculateDeadlineStatus(inTwentyDays, false)).toBe("green");
  });
});
