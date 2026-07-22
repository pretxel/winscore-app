import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { Logotype } from "@/components/logotype";

describe("Logotype", () => {
  for (const size of ["xs", "md", "xl"] as const) {
    it(`renders exactly one <svg> at size="${size}"`, () => {
      const html = renderToString(React.createElement(Logotype, { size }));
      const svgMatches = html.match(/<svg\b/g) ?? [];
      expect(svgMatches).toHaveLength(1);
      expect(html).toMatch(/viewBox="0 0 \d+ \d+"/);
    });
  }

  it("compact size (xs) drops the INSCORE wordmark text", () => {
    const html = renderToString(React.createElement(Logotype, { size: "xs" }));
    expect(html).not.toContain("INSCORE");
  });

  it("non-compact sizes include the INSCORE wordmark text", () => {
    const html = renderToString(React.createElement(Logotype, { size: "md" }));
    expect(html).toContain("INSCORE");
  });

  it("renders the edition suffix only when provided", () => {
    const without = renderToString(React.createElement(Logotype, { size: "md" }));
    expect(without).not.toContain("· ");
    const withEdition = renderToString(
      React.createElement(Logotype, { size: "md", edition: "26" }),
    );
    expect(withEdition).toContain("· 26");
  });
});
