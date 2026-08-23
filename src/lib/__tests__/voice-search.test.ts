/**
 * Tests for voice search library.
 *
 * Sprint S - Tier 4 #14: Voice Interface.
 */

import { describe, it, expect, vi } from "vitest";
import {
  parseVoiceCommand,
  isSpeechRecognitionSupported,
  createVoiceSession,
  type VoiceCommand,
} from "../voice-search";

describe("voice-search: parseVoiceCommand", () => {
  describe("SEARCH_BOOK intent", () => {
    it("parses 'Cari buku persahabatan'", () => {
      const cmd = parseVoiceCommand("Cari buku persahabatan");
      expect(cmd.intent).toBe("SEARCH_BOOK");
      expect(cmd.entities.topic).toBe("persahabatan");
    });

    it("parses 'Carikan novel romance'", () => {
      const cmd = parseVoiceCommand("Carikan novel romance");
      expect(cmd.intent).toBe("SEARCH_BOOK");
      expect(cmd.entities.topic).toBe("romance");
    });

    it("parses 'Cari komik petualangan'", () => {
      const cmd = parseVoiceCommand("Cari komik petualangan");
      expect(cmd.intent).toBe("SEARCH_BOOK");
      expect(cmd.entities.topic).toBe("petualangan");
    });
  });

  describe("BORROW_BOOK intent", () => {
    it("parses 'Pinjam Laskar Pelangi'", () => {
      const cmd = parseVoiceCommand("Pinjam Laskar Pelangi");
      expect(cmd.intent).toBe("BORROW_BOOK");
      expect(cmd.entities.bookTitle).toBe("Laskar Pelangi");
    });

    it("parses 'Pinjamkan Atomic Habits'", () => {
      const cmd = parseVoiceCommand("Pinjamkan Atomic Habits");
      expect(cmd.intent).toBe("BORROW_BOOK");
      expect(cmd.entities.bookTitle).toBe("Atomic Habits");
    });

    it("parses 'Mau pinjam Harry Potter'", () => {
      const cmd = parseVoiceCommand("Mau pinjam Harry Potter");
      expect(cmd.intent).toBe("BORROW_BOOK");
      expect(cmd.entities.bookTitle).toBe("Harry Potter");
    });
  });

  describe("RETURN_BOOK intent", () => {
    it("parses 'Kembalikan Laskar Pelangi'", () => {
      const cmd = parseVoiceCommand("Kembalikan Laskar Pelangi");
      expect(cmd.intent).toBe("RETURN_BOOK");
      expect(cmd.entities.bookTitle).toBe("Laskar Pelangi");
    });
  });

  describe("RESERVE_BOOK intent", () => {
    it("parses 'Reservasi Harry Potter'", () => {
      const cmd = parseVoiceCommand("Reservasi Harry Potter");
      expect(cmd.intent).toBe("RESERVE_BOOK");
      expect(cmd.entities.bookTitle).toBe("Harry Potter");
    });
  });

  describe("CHECK_LOANS intent", () => {
    it("parses 'Cek pinjaman saya'", () => {
      const cmd = parseVoiceCommand("Cek pinjaman saya");
      expect(cmd.intent).toBe("CHECK_LOANS");
    });

    it("parses 'Apa yang saya pinjam'", () => {
      const cmd = parseVoiceCommand("Apa yang saya pinjam");
      expect(cmd.intent).toBe("CHECK_LOANS");
    });
  });

  describe("VIEW_PROFILE intent", () => {
    it("parses 'Lihat profil'", () => {
      const cmd = parseVoiceCommand("Lihat profil");
      expect(cmd.intent).toBe("VIEW_PROFILE");
    });

    it("parses 'Profil saya'", () => {
      const cmd = parseVoiceCommand("Profil saya");
      expect(cmd.intent).toBe("VIEW_PROFILE");
    });
  });

  describe("VIEW_NOTIFICATIONS intent", () => {
    it("parses 'Lihat notifikasi'", () => {
      const cmd = parseVoiceCommand("Lihat notifikasi");
      expect(cmd.intent).toBe("VIEW_NOTIFICATIONS");
    });

    it("parses 'Ada notif baru?'", () => {
      const cmd = parseVoiceCommand("Ada notif baru?");
      expect(cmd.intent).toBe("VIEW_NOTIFICATIONS");
    });
  });

  describe("OPEN_MENU intent", () => {
    it("parses 'Buka katalog'", () => {
      const cmd = parseVoiceCommand("Buka katalog");
      expect(cmd.intent).toBe("OPEN_MENU");
      expect(cmd.entities.menuName).toBe("katalog");
    });

    it("parses 'Pergi ke dashboard'", () => {
      const cmd = parseVoiceCommand("Pergi ke dashboard");
      expect(cmd.intent).toBe("OPEN_MENU");
      expect(cmd.entities.menuName).toBe("dashboard");
    });
  });

  describe("HELP intent", () => {
    it("parses 'Bantu'", () => {
      const cmd = parseVoiceCommand("Bantu");
      expect(cmd.intent).toBe("HELP");
    });

    it("parses 'Tolong'", () => {
      const cmd = parseVoiceCommand("Tolong");
      expect(cmd.intent).toBe("HELP");
    });
  });

  describe("UNKNOWN intent", () => {
    it("returns UNKNOWN for unrecognized phrases", () => {
      const cmd = parseVoiceCommand("xyz random gibberish");
      expect(cmd.intent).toBe("UNKNOWN");
      expect(cmd.confidence).toBe(0.3);
    });

    it("returns UNKNOWN for empty string", () => {
      const cmd = parseVoiceCommand("");
      expect(cmd.intent).toBe("UNKNOWN");
    });
  });

  describe("Audience detection in search", () => {
    it("detects 'untuk anak' as audience", () => {
      const cmd = parseVoiceCommand("Cari buku untuk anak");
      expect(cmd.entities.audience).toBe("anak");
    });

    it("detects 'untuk remaja' as audience", () => {
      const cmd = parseVoiceCommand("Cari novel untuk remaja");
      expect(cmd.entities.audience).toBe("remaja");
    });
  });

  describe("Response generation", () => {
    it("provides friendly Indonesian response", () => {
      const cmd = parseVoiceCommand("Cari buku persahabatan");
      expect(cmd.response).toContain("persahabatan");
    });

    it("response includes book title for borrow", () => {
      const cmd = parseVoiceCommand("Pinjam Laskar Pelangi");
      expect(cmd.response).toContain("Laskar Pelangi");
    });
  });
});

describe("voice-search: SpeechRecognition", () => {
  it("isSpeechRecognitionSupported returns false without window", () => {
    expect(isSpeechRecognitionSupported()).toBe(false);
  });
});

describe("voice-search: VoiceSession", () => {
  it("createVoiceSession returns manager", () => {
    const session = createVoiceSession();
    expect(session).toBeDefined();
    expect(typeof session.start).toBe("function");
    expect(typeof session.stop).toBe("function");
    expect(typeof session.onResult).toBe("function");
    expect(typeof session.onError).toBe("function");
  });

  it("session.start calls onError when not supported", () => {
    const session = createVoiceSession();
    const errorFn = vi.fn();
    session.onError(errorFn);
    session.start();
    // In test env, SpeechRecognition is not defined
    expect(errorFn).toHaveBeenCalled();
  });
});
