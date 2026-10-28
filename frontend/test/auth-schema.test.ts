import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signInSchema } from "../src/features/auth/schemas/sign-in.schema.ts";

describe("Sign-in Validation Schema", () => {
  it("rejects empty submission", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = result.error.format();
      assert.ok(formatted.email?._errors.includes("Email address is required."));
      assert.ok(formatted.password?._errors.includes("Password is required."));
    }
  });

  it("rejects invalid email syntax", () => {
    const result = signInSchema.safeParse({
      email: "invalid-email",
      password: "SomePassword123",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const formatted = result.error.format();
      assert.ok(formatted.email?._errors.includes("Enter a valid official email address."));
    }
  });

  it("accepts valid officer credentials", () => {
    const result = signInSchema.safeParse({
      email: "officer1@aicte.gov.in",
      password: "Officer@AICTE2026!",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.email, "officer1@aicte.gov.in");
      assert.equal(result.data.password, "Officer@AICTE2026!");
    }
  });
});
