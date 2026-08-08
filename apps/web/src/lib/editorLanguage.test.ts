import { describe, expect, it } from "vitest";
import { isLikelyEditable, languageForFile } from "./editorLanguage.js";

describe("languageForFile", () => {
  it("maps common extensions to their Monaco language id", () => {
    expect(languageForFile("server.properties")).toBe("ini");
    expect(languageForFile("config.yml")).toBe("yaml");
    expect(languageForFile("Plugin.java")).toBe("java");
    expect(languageForFile("index.tsx")).toBe("typescript");
    expect(languageForFile("run.sh")).toBe("shell");
  });

  it("is case-insensitive on the extension", () => {
    expect(languageForFile("README.MD")).toBe("markdown");
  });

  it("falls back to plaintext for unknown or missing extensions", () => {
    expect(languageForFile("Dockerfile")).toBe("plaintext");
    expect(languageForFile("weird.xyz123")).toBe("plaintext");
  });
});

describe("isLikelyEditable", () => {
  it("accepts known text-ish extensions", () => {
    expect(isLikelyEditable("config.yml")).toBe(true);
    expect(isLikelyEditable("server.properties")).toBe(true);
    expect(isLikelyEditable("notes.csv")).toBe(true);
  });

  it("accepts extension-less files (e.g. Dockerfile) by default", () => {
    expect(isLikelyEditable("Dockerfile")).toBe(true);
    expect(isLikelyEditable("eula")).toBe(true);
  });

  it("rejects binary-ish extensions not in the allowlist", () => {
    expect(isLikelyEditable("world.dat")).toBe(false);
    expect(isLikelyEditable("archive.zip")).toBe(false);
    expect(isLikelyEditable("plugin.jar")).toBe(false);
  });
});
