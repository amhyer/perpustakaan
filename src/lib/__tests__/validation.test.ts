/**
 * Unit tests untuk validation library.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 */

import { describe, it, expect } from "vitest";

import {
  required,
  email,
  minLength,
  maxLength,
  length,
  range,
  min,
  max,
  pattern,
  isbn,
  phoneID,
  url,
  matches,
  oneOf,
  custom,
  createValidator,
  formatErrors,
  getFieldError,
  hasErrors,
  emailRules,
  passwordRules,
  nameRules,
  memberNumberRules,
  phoneRules,
  type ValidationRule,
} from "../validation";

describe("validation: required", () => {
  it("rejects null", () => {
    expect(required()(null)).toBeTruthy();
  });
  it("rejects undefined", () => {
    expect(required()(undefined)).toBeTruthy();
  });
  it("rejects empty string", () => {
    expect(required()("")).toBeTruthy();
  });
  it("rejects whitespace-only", () => {
    expect(required()("   ")).toBeTruthy();
  });
  it("rejects empty array", () => {
    expect(required()([])).toBeTruthy();
  });
  it("accepts non-empty string", () => {
    expect(required()("hello")).toBeNull();
  });
  it("accepts 0", () => {
    expect(required()(0)).toBeNull();
  });
  it("accepts false", () => {
    expect(required()(false)).toBeNull();
  });
  it("uses custom message", () => {
    expect(required("Custom required")("") === "Custom required").toBe(true);
  });
});

describe("validation: email", () => {
  it("accepts valid email", () => {
    expect(email()("user@example.com")).toBeNull();
  });
  it("accepts email with subdomain", () => {
    expect(email()("user@mail.sub.example.com")).toBeNull();
  });
  it("rejects invalid email (no @)", () => {
    expect(email()("userexample.com")).toBeTruthy();
  });
  it("rejects invalid email (no domain)", () => {
    expect(email()("user@")).toBeTruthy();
  });
  it("skips empty value", () => {
    expect(email()("")).toBeNull();
  });
});

describe("validation: minLength", () => {
  it("accepts string with exact length", () => {
    expect(minLength(5)("hello")).toBeNull();
  });
  it("rejects string too short", () => {
    expect(minLength(5)("hi")).toBeTruthy();
  });
  it("skips empty value", () => {
    expect(minLength(5)("")).toBeNull();
  });
});

describe("validation: maxLength", () => {
  it("accepts within limit", () => {
    expect(maxLength(10)("hello")).toBeNull();
  });
  it("rejects over limit", () => {
    expect(maxLength(5)("hello world")).toBeTruthy();
  });
});

describe("validation: length (exact)", () => {
  it("accepts exact length", () => {
    expect(length(5)("hello")).toBeNull();
  });
  it("rejects different length", () => {
    expect(length(5)("hi")).toBeTruthy();
    expect(length(5)("helloo")).toBeTruthy();
  });
});

describe("validation: range (number)", () => {
  it("accepts in range", () => {
    expect(range(1, 10)(5)).toBeNull();
  });
  it("rejects below range", () => {
    expect(range(1, 10)(0)).toBeTruthy();
  });
  it("rejects above range", () => {
    expect(range(1, 10)(11)).toBeTruthy();
  });
  it("rejects non-numeric", () => {
    expect(range(1, 10)("abc")).toBeTruthy();
  });
  it("accepts boundary values", () => {
    expect(range(1, 10)(1)).toBeNull();
    expect(range(1, 10)(10)).toBeNull();
  });
});

describe("validation: min/max", () => {
  it("min accepts at/above", () => {
    expect(min(5)(5)).toBeNull();
    expect(min(5)(10)).toBeNull();
  });
  it("min rejects below", () => {
    expect(min(5)(3)).toBeTruthy();
  });
  it("max accepts at/below", () => {
    expect(max(5)(5)).toBeNull();
    expect(max(5)(3)).toBeNull();
  });
  it("max rejects above", () => {
    expect(max(5)(10)).toBeTruthy();
  });
});

describe("validation: pattern", () => {
  it("accepts matching pattern", () => {
    expect(pattern(/^\d+$/)("123")).toBeNull();
  });
  it("rejects non-matching", () => {
    expect(pattern(/^\d+$/)("abc")).toBeTruthy();
  });
});

describe("validation: isbn", () => {
  it("accepts valid ISBN-10", () => {
    // 0306406152 is a known valid ISBN-10
    expect(isbn()("0306406152")).toBeNull();
  });
  it("accepts ISBN-10 with dashes", () => {
    expect(isbn()("0-306-40615-2")).toBeNull();
  });
  it("accepts valid ISBN-13", () => {
    // 9780306406157
    expect(isbn()("9780306406157")).toBeNull();
  });
  it("accepts ISBN-10 ending in X", () => {
    expect(isbn()("155404295X")).toBeNull();
  });
  it("rejects wrong length", () => {
    expect(isbn()("12345")).toBeTruthy();
  });
  it("rejects invalid checksum", () => {
    expect(isbn()("0306406153")).toBeTruthy();
  });
});

describe("validation: phoneID", () => {
  it("accepts 08xxxxxxxxxx", () => {
    expect(phoneID()("081234567890")).toBeNull();
  });
  it("accepts +62", () => {
    expect(phoneID()("+6281234567890")).toBeNull();
  });
  it("accepts with dashes/spaces", () => {
    expect(phoneID()("0812-3456-7890")).toBeNull();
  });
  it("rejects invalid", () => {
    expect(phoneID()("12345")).toBeTruthy();
  });
});

describe("validation: url", () => {
  it("accepts valid URL", () => {
    expect(url()("https://example.com")).toBeNull();
  });
  it("rejects invalid URL", () => {
    expect(url()("not a url")).toBeTruthy();
  });
});

describe("validation: matches (cross-field)", () => {
  it("matches when equal", () => {
    expect(matches("password")("secret", { password: "secret" })).toBeNull();
  });
  it("rejects when different", () => {
    expect(matches("password")("other", { password: "secret" })).toBeTruthy();
  });
});

describe("validation: oneOf", () => {
  it("accepts allowed value", () => {
    expect(oneOf(["a", "b", "c"])("a")).toBeNull();
  });
  it("rejects disallowed", () => {
    expect(oneOf(["a", "b"])("c")).toBeTruthy();
  });
});

describe("validation: custom", () => {
  it("uses custom function", () => {
    const isEven: ValidationRule<number> = custom((v) =>
      v % 2 === 0 ? null : "Must be even"
    );
    expect(isEven(4)).toBeNull();
    expect(isEven(3)).toBeTruthy();
  });
});

describe("validation: createValidator", () => {
  it("validates all fields", () => {
    const v = createValidator({
      email: [required(), email()],
      age: [required(), range(1, 120)],
    });
    const result = v.validate({ email: "test@example.com", age: 25 });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("returns errors for invalid fields", () => {
    const v = createValidator({
      email: [required(), email()],
      age: [required(), range(1, 120)],
    });
    const result = v.validate({ email: "invalid", age: 200 });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.age).toBeTruthy();
  });

  it("stops at first error per field", () => {
    const v = createValidator({
      password: [required(), minLength(8)],
    });
    const result = v.validate({ password: "x" });
    // Only first error (required) — but actually password is provided
    // minLength fails first since password is "x"
    expect(result.errors.password).toBeTruthy();
  });

  it("firstError points to first invalid field", () => {
    const v = createValidator({
      name: [required()],
      email: [required()],
    });
    const result = v.validate({ name: "John", email: "" });
    expect(result.firstError?.field).toBe("email");
  });

  it("validateField works on single field", () => {
    const v = createValidator({
      email: [required(), email()],
    });
    const error = v.validateField("email", "invalid");
    expect(error).toBeTruthy();
  });
});

describe("validation: helpers", () => {
  it("formatErrors joins errors", () => {
    const formatted = formatErrors({ email: "Invalid", name: "Required" });
    expect(formatted).toContain("email: Invalid");
    expect(formatted).toContain("name: Required");
  });

  it("getFieldError returns error or undefined", () => {
    const errors = { email: "Bad" };
    expect(getFieldError(errors, "email")).toBe("Bad");
    expect(getFieldError(errors, "name")).toBeUndefined();
  });

  it("hasErrors detects any error", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ email: "x" })).toBe(true);
  });
});

describe("validation: preset rules", () => {
  it("emailRules requires + valid format", () => {
    const rules = emailRules();
    expect(rules[0]("")).toBeTruthy();
    expect(rules[1]("invalid")).toBeTruthy();
    expect(rules[1]("user@example.com")).toBeNull();
  });

  it("passwordRules requires min length", () => {
    const rules = passwordRules(8);
    expect(rules[0]("")).toBeTruthy();
    expect(rules[1]("short")).toBeTruthy();
    expect(rules[1]("longenough")).toBeNull();
  });

  it("nameRules requires min 2 chars", () => {
    const rules = nameRules();
    expect(rules[0]("")).toBeTruthy();
    expect(rules[1]("A")).toBeTruthy();
    expect(rules[1]("John")).toBeNull();
  });

  it("memberNumberRules requires pattern", () => {
    const rules = memberNumberRules();
    expect(rules[0]("")).toBeTruthy();
    expect(rules[1]("invalid")).toBeTruthy();
    expect(rules[1]("SIS-2024-001")).toBeNull();
  });

  it("phoneRules requires + valid format", () => {
    const rules = phoneRules();
    expect(rules[0]("")).toBeTruthy();
    expect(rules[1]("invalid")).toBeTruthy();
    expect(rules[1]("081234567890")).toBeNull();
  });
});
