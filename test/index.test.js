import { describe, it, expect } from "vitest";
import worker from "../src/index.js";

describe("worker", () => {
  it("returns hello message on /", async () => {
    const request = new Request("http://example.com/");
    const response = await worker.fetch(request, {}, {});
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Hello from Cloudflare Worker!");
  });

  it("returns health status on /health", async () => {
    const request = new Request("http://example.com/health");
    const response = await worker.fetch(request, {}, {});
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: "ok" });
  });

  it("returns 404 for unknown paths", async () => {
    const request = new Request("http://example.com/unknown");
    const response = await worker.fetch(request, {}, {});
    expect(response.status).toBe(404);
  });
});
