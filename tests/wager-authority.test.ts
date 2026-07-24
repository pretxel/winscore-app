import { describe, expect, it } from "vitest";
import { parseKeypairSecret } from "@/lib/wager/authority";

describe("parseKeypairSecret", () => {
  it("parses a 64-byte JSON array", () => {
    const arr = Array.from({ length: 64 }, (_, i) => i % 256);
    const bytes = parseKeypairSecret(JSON.stringify(arr));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(64);
  });
  it("rejects a wrong-length array", () => {
    expect(() => parseKeypairSecret(JSON.stringify([1, 2, 3]))).toThrow();
  });
  it("rejects non-JSON", () => {
    expect(() => parseKeypairSecret("not json")).toThrow();
  });
});
