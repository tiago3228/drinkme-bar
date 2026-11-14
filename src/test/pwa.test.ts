import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

describe("DrinkMe PWA contract", () => {
  it("declares an installable standalone manifest", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8"),
    ) as {
      name: string;
      short_name: string;
      display: string;
      start_url: string;
      scope: string;
      icons: { src: string }[];
    };

    expect(manifest.name).toBe("DrinkMe Bar");
    expect(manifest.short_name).toBe("DrinkMe");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.icons).toHaveLength(3);
    expect(
      manifest.icons.every((icon) => existsSync(resolve(root, "public", icon.src.slice(1)))),
    ).toBe(true);
  });

  it("does not cache navigations or protected routes", () => {
    const worker = readFileSync(resolve(root, "public/sw.js"), "utf8");

    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('url.pathname.startsWith("/aluno")');
    expect(worker).toContain('url.pathname.startsWith("/admin")');
    expect(worker).toContain('url.pathname.includes("/storage/")');
    expect(worker).not.toContain('caches.addAll(["/aluno"])');
  });
});
