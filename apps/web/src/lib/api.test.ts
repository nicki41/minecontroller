import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, setCsrfToken } from "./api.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("api client", () => {
  beforeEach(() => {
    setCsrfToken(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not attach a CSRF header before setCsrfToken has been called", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { ok: true }));
    await api.get("/servers");

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["x-csrf-token"]).toBeUndefined();
  });

  it("attaches the CSRF token header on every request once set", async () => {
    setCsrfToken("token-abc-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { ok: true }));

    await api.post("/servers", { name: "My Server" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/servers");
    const headers = init!.headers as Record<string, string>;
    expect(headers["x-csrf-token"]).toBe("token-abc-123");
    expect(init!.credentials).toBe("include");
    expect(init!.method).toBe("POST");
    expect(init!.body).toBe(JSON.stringify({ name: "My Server" }));
  });

  it("always sends credentials, with or without a CSRF token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, {}));
    await api.get("/health");
    expect(fetchMock.mock.calls[0]![1]!.credentials).toBe("include");
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.delete("/servers/abc")).resolves.toBeUndefined();
  });

  it("throws an ApiError built from the server's structured error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(403, { error: { code: "FORBIDDEN", message: "You cannot grant permissions you don't have yourself." } }),
    );

    await expect(api.post("/roles", { permissions: ["settings.manage"] })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot grant permissions you don't have yourself.",
    });
  });

  it("falls back to a generic ApiError when the error response has no JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }));

    await expect(api.get("/servers")).rejects.toBeInstanceOf(ApiError);
    await expect(api.get("/servers")).rejects.toMatchObject({ status: 500, code: "INTERNAL_ERROR" });
  });

  it("api.raw() forwards a real RequestInit (e.g. FormData body) without JSON-encoding it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const form = new FormData();
    form.set("file", new Blob(["data"]), "plugin.jar");

    await api.raw("/servers/abc/files/upload", { method: "POST", body: form });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/servers/abc/files/upload");
    expect(init!.body).toBe(form);
    expect(init!.credentials).toBe("include");
  });
});
