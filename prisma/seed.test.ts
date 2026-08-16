import { describe, expect, it } from "vitest";
import { DEMO_SEED_EMAIL, DEMO_SEED_PASSWORD, resolveSeedCredentials } from "./seed";

describe("resolveSeedCredentials", () => {
  it("returns demo credentials in development by default", () => {
    expect(resolveSeedCredentials({})).toEqual({ email: DEMO_SEED_EMAIL, password: DEMO_SEED_PASSWORD });
  });

  it("honours explicit overrides in development (lowercased email)", () => {
    expect(resolveSeedCredentials({ SEED_OWNER_EMAIL: "Dev@Example.COM", SEED_OWNER_PASSWORD: "dev-pass-1234567" })).toEqual({ email: "dev@example.com", password: "dev-pass-1234567" });
  });

  it("rejects demo credentials in production when env is missing", () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: "production" })).toThrow(/demo credentials/i);
  });

  it("rejects demo credentials when SEED_STRICT=true even outside production", () => {
    expect(() => resolveSeedCredentials({ SEED_STRICT: "true" })).toThrow(/demo credentials/i);
  });

  it("accepts explicit non-demo credentials in production", () => {
    expect(resolveSeedCredentials({ NODE_ENV: "production", SEED_OWNER_EMAIL: "owner@prod.example", SEED_OWNER_PASSWORD: "a-strong-production-password-42" })).toEqual({ email: "owner@prod.example", password: "a-strong-production-password-42" });
  });

  it("rejects the demo default password in production even with a new email", () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: "production", SEED_OWNER_EMAIL: "owner@prod.example", SEED_OWNER_PASSWORD: DEMO_SEED_PASSWORD })).toThrow(/demo credentials/i);
  });

  it("rejects short passwords in production", () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: "production", SEED_OWNER_EMAIL: "owner@prod.example", SEED_OWNER_PASSWORD: "short" })).toThrow(/demo credentials/i);
  });
});
