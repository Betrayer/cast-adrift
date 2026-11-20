import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const HEAD_SCRIPT = /<head>[\s\S]*?<script>([\s\S]*?)<\/script>/;

const forwardScript = (): string => {
  const html = readFileSync("landing/index.html", "utf8");
  const match = HEAD_SCRIPT.exec(html);
  if (match?.[1] === undefined) throw new Error("landing head carries no script");
  return match[1];
};

const replacedWith = (href: string): string | null => {
  let target: string | null = null;
  const url = new URL(href);
  const location = {
    hash: url.hash,
    search: url.search,
    replace: (next: string) => {
      target = next;
    },
  };
  new Function("location", forwardScript())(location);
  return target;
};

describe("the landing forwards a Telegram client before it paints", () => {
  it("is the document's first script, and it sits inside the head", () => {
    const html = readFileSync("landing/index.html", "utf8");
    const firstScript = html.indexOf("<script");
    expect(firstScript).toBeGreaterThan(html.indexOf("<head>"));
    expect(firstScript).toBeLessThan(html.indexOf("</head>"));
    expect(forwardScript()).toContain("location.replace('/play'");
  });

  it("forwards on tgWebAppData in the hash, keeping the hash", () => {
    expect(replacedWith("https://x.dev/#tgWebAppData=abc&tgWebAppVersion=7")).toBe(
      "/play#tgWebAppData=abc&tgWebAppVersion=7",
    );
  });

  it("forwards on tgWebAppPlatform in the hash", () => {
    expect(replacedWith("https://x.dev/#tgWebAppPlatform=android")).toBe(
      "/play#tgWebAppPlatform=android",
    );
  });

  it("forwards on tgWebAppStartParam in the search, keeping the query", () => {
    expect(replacedWith("https://x.dev/?tgWebAppStartParam=daily")).toBe(
      "/play?tgWebAppStartParam=daily",
    );
  });

  it("carries a deep link's search and hash together", () => {
    expect(
      replacedWith("https://x.dev/?tgWebAppStartParam=daily#tgWebAppData=abc"),
    ).toBe("/play?tgWebAppStartParam=daily#tgWebAppData=abc");
  });

  it("leaves an ordinary visitor on the landing", () => {
    expect(replacedWith("https://x.dev/")).toBeNull();
    expect(replacedWith("https://x.dev/?utm_source=telegram")).toBeNull();
    expect(replacedWith("https://x.dev/#play")).toBeNull();
  });
});
