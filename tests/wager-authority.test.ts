import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseKeypairSecret, resolveKeypairJson } from "@/lib/wager/authority";

describe("resolveKeypairJson", () => {
  const arr = Array.from({ length: 64 }, (_, i) => i % 256);

  it("returns inline JSON unchanged", () => {
    const inline = JSON.stringify(arr);
    expect(resolveKeypairJson(inline)).toBe(inline);
  });

  it("tolerates leading whitespace on inline JSON", () => {
    const inline = `  ${JSON.stringify(arr)}`;
    expect(parseKeypairSecret(resolveKeypairJson(inline)).length).toBe(64);
  });

  it("reads a keypair file when given a path", () => {
    const dir = mkdtempSync(join(tmpdir(), "wager-authority-"));
    const path = join(dir, "keypair.json");
    writeFileSync(path, JSON.stringify(arr));
    expect(parseKeypairSecret(resolveKeypairJson(path)).length).toBe(64);
  });

  it("throws a named error when the path does not exist", () => {
    expect(() => resolveKeypairJson("/nonexistent/wager-keypair.json")).toThrow(
      /WAGER_AUTHORITY_KEYPAIR/,
    );
  });
});

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
