/**
 * Unit tests untuk mobile i18n setup.
 * Test translation lookups, locale switching, fallback.
 */

// Mock i18n-js
const mockI18n = {
  locale: "id",
  translations: {} as Record<string, any>,
  t: function (key: string, options?: any) {
    const keys = key.split(".");
    let value: any = this.translations[this.locale];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined) return key;
    if (options && typeof value === "string") {
      return Object.entries(options).reduce(
        (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
        value
      );
    }
    return value;
  },
};

vi.mock("i18n-js", () => ({
  I18n: class {
    locale = "id";
    enableFallback = false;
    defaultLocale = "id";
    translations: any;
    t(key: string, options?: any) {
      const keys = key.split(".");
      let value: any = this.translations[this.locale];
      for (const k of keys) {
        value = value?.[k];
      }
      if (value === undefined) return key;
      if (options && typeof value === "string") {
        return Object.entries(options).reduce(
          (acc: string, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          value
        );
      }
      return value;
    }
  },
}));

import { id } from "../locales/id";
import { en } from "../locales/en";
import { ar } from "../locales/ar";

describe("mobile i18n: locales", () => {
  it("id locale has all required keys", () => {
    expect(id.app.name).toBeDefined();
    expect(id.nav.home).toBeDefined();
    expect(id.auth.login).toBeDefined();
    expect(id.home.greeting).toBeDefined();
    expect(id.common.loading).toBeDefined();
  });

  it("en locale has all required keys", () => {
    expect(en.app.name).toBeDefined();
    expect(en.nav.home).toBeDefined();
    expect(en.auth.login).toBeDefined();
    expect(en.home.greeting).toBeDefined();
    expect(en.common.loading).toBeDefined();
  });

  it("ar locale has all required keys", () => {
    expect(ar.app.name).toBeDefined();
    expect(ar.nav.home).toBeDefined();
    expect(ar.auth.login).toBeDefined();
    expect(ar.home.greeting).toBeDefined();
    expect(ar.common.loading).toBeDefined();
  });

  it("all locales have consistent structure", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
  });
});

describe("mobile i18n: translations", () => {
  it("translates common keys correctly", () => {
    const i18n = {
      locale: "id" as "id" | "en" | "ar",
      translations: { id, en, ar },
    };

    function t(key: string): string {
      const keys = key.split(".");
      let value: any = i18n.translations[i18n.locale];
      for (const k of keys) value = value?.[k];
      return value || key;
    }

    expect(t("auth.login")).toBe("Masuk");
    i18n.locale = "en";
    expect(t("auth.login")).toBe("Login");
    i18n.locale = "ar";
    expect(t("auth.login")).toBe("تسجيل الدخول");
  });

  it("translates nested keys", () => {
    const i18n = {
      locale: "id" as "id" | "en" | "ar",
      translations: { id, en, ar },
    };
    function t(key: string): string {
      const keys = key.split(".");
      let value: any = i18n.translations[i18n.locale];
      for (const k of keys) value = value?.[k];
      return value || key;
    }
    expect(t("nav.home")).toBe("Beranda");
    expect(t("home.greeting")).toBe("Halo");
  });

  it("returns key for missing translation", () => {
    const i18n = {
      locale: "id" as "id" | "en" | "ar",
      translations: { id, en, ar },
    };
    function t(key: string): string {
      const keys = key.split(".");
      let value: any = i18n.translations[i18n.locale];
      for (const k of keys) value = value?.[k];
      return value || key;
    }
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("mobile i18n: locale switching", () => {
  it("can switch between locales", () => {
    const i18n = {
      locale: "id" as "id" | "en" | "ar",
      translations: { id, en, ar },
    };
    function t(key: string): string {
      const keys = key.split(".");
      let value: any = i18n.translations[i18n.locale];
      for (const k of keys) value = value?.[k];
      return value || key;
    }

    expect(t("common.cancel")).toBe("Batal");
    i18n.locale = "en";
    expect(t("common.cancel")).toBe("Cancel");
    i18n.locale = "ar";
    expect(t("common.cancel")).toBe("إلغاء");
  });
});

describe("mobile i18n: arabic RTL", () => {
  it("Arabic translations contain Arabic characters", () => {
    expect(ar.nav.home).toMatch(/[\u0600-\u06FF]/);
    expect(ar.auth.login).toMatch(/[\u0600-\u06FF]/);
  });

  it("Arabic translations are non-empty", () => {
    expect(ar.app.name.length).toBeGreaterThan(0);
    expect(ar.nav.profile.length).toBeGreaterThan(0);
  });
});
