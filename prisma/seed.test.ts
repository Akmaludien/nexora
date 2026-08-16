import { describe, expect, it } from "vitest";
import { DEMO_SEED_EMAIL, DEMO_SEED_PASSWORD, resolveSeedCredentials } from "./seed";

describe("resolveSeedCredentials", () => {
  it("falls back to demo credentials in development", () => {
    const creds = resolveSeedCredentials({ NODE_ENV: "test" });
    expect(creds.email).toBe(DEMO_SEED_EMAIL);
    expect(creds.password).toBe(DEMO_SEED_PASSWORD);
  });

  it("honours explicit credentials in development", () => {
    const creds = resolveSeedCredentials({
      NODE_ENV: "test",
      SEED_OWNER_EMAIL: "Owner@Example.com",
      SEED_OWNER_PASSWORD: "dev-pass-12345",
    });
    expect(creds.email).toBe("owner@example.com");
    expect(creds.password).toBe("dev-pass-12345");
  });

  it("refuses to seed without explicit credentials in production", () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: "production" })).toThrow(/SEED_OWNER_EMAIL/);
  });

  it("refuses the demo password in production", () => {
    expect(() =>
      resolveSeedCredentials({
        NODE_ENV: "production",
        SEED_OWNER_EMAIL: "owner@example.com",
        SEED_OWNER_PASSWORD: DEMO_SEED_PASSWORD,
      }),
    ).toThrow(/demo default/);
  });

  it("refuses a short production password", () => {
    expect(() =>
      resolveSeedCredentials({
        NODE_ENV: "production",
        SEED_OWNER_EMAIL: "owner@example.com",
        SEED_OWNER_PASSWORD: "short",
      }),
    ).toThrow(/12 characters/);
  });

  it("accepts an explicit production credential set", () => {
    const creds = resolveSeedCredentials({
      NODE_ENV: "production",
      SEED_OWNER_EMAIL: "Owner@Example.com",
      SEED_OWNER_PASSWORD: "prod-pass-12345",
    });
    expect(creds).toEqual({ email: "owner@example.com", password: "prod-pass-12345" });
  });

  it("treats SEED_STRICT=true as production-like even without NODE_ENV", () => {
    expect(() => resolveSeedCredentials({ SEED_STRICT: "true" })).toThrow(/SEED_OWNER_EMAIL/);
  });
});
