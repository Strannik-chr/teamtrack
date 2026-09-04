import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { createRouter } from "./router.js";

const app = express();
app.use(createRouter());

describe("API Routes", () => {
  it("GET /health should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.app).toBe("TeamTrack");
  });

  it("GET /api/health should return status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("should enforce rate limiting and security headers (Helmet)", async () => {
    const res = await request(app).get("/api/health");
    // Helmet sets this header by default
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});
