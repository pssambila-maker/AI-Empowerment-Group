import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_CLASS_SCHEDULE } from "../../config/assessment";

const { getDocMock, setDocMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...segments) => segments.join("/")),
  getDoc: getDocMock,
  setDoc: setDocMock,
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

const { fetchClassSchedule, saveClassSchedule } = await import("./classSchedule");

const fakeDb = {} as any;

describe("fetchClassSchedule", () => {
  beforeEach(() => {
    getDocMock.mockReset();
    setDocMock.mockReset();
  });

  it("returns DEFAULT_CLASS_SCHEDULE when the document doesn't exist yet", async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => ({}) });

    const schedule = await fetchClassSchedule(fakeDb);

    expect(schedule).toEqual(DEFAULT_CLASS_SCHEDULE);
  });

  it("merges a partial Firestore document over the defaults", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ year: 2027, day: 3, joinLink: "https://zoom.us/updated" }),
    });

    const schedule = await fetchClassSchedule(fakeDb);

    expect(schedule.year).toBe(2027);
    expect(schedule.day).toBe(3);
    expect(schedule.joinLink).toBe("https://zoom.us/updated");
    expect(schedule.month).toBe(DEFAULT_CLASS_SCHEDULE.month);
    expect(schedule.timezone).toBe(DEFAULT_CLASS_SCHEDULE.timezone);
  });

  it("falls back to DEFAULT_CLASS_SCHEDULE instead of throwing when the read is denied", async () => {
    getDocMock.mockRejectedValue(Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" }));

    const schedule = await fetchClassSchedule(fakeDb);

    expect(schedule).toEqual(DEFAULT_CLASS_SCHEDULE);
  });
});

describe("saveClassSchedule", () => {
  beforeEach(() => {
    getDocMock.mockReset();
    setDocMock.mockReset();
  });

  it("writes the full schedule plus an updatedAt timestamp", async () => {
    setDocMock.mockResolvedValue(undefined);

    await saveClassSchedule(fakeDb, DEFAULT_CLASS_SCHEDULE);

    expect(setDocMock).toHaveBeenCalledWith(
      "config/classSchedule",
      expect.objectContaining({ ...DEFAULT_CLASS_SCHEDULE, updatedAt: "SERVER_TIMESTAMP" }),
    );
  });

  it("propagates a denied write so the caller can show an error", async () => {
    setDocMock.mockRejectedValue(Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" }));

    await expect(saveClassSchedule(fakeDb, DEFAULT_CLASS_SCHEDULE)).rejects.toThrow();
  });
});
