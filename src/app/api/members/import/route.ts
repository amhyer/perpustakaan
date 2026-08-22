// src/app/api/members/import/route.ts — Impor massal anggota dari CSV (Tahap 14)

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLibrarian, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendWhatsApp, whatsappTemplates } from "@/lib/whatsapp";

const MAX_ROWS = 500;
const DEFAULT_DOMAIN = "jendelailmu.sch.id";

export async function POST(req: Request) {
  const { user, error } = await requireLibrarian();
  if (error) return error;

  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Tidak ada data untuk diimpor" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris per impor` }, { status: 400 });
  }

  const defaultPassword =
    typeof body.defaultPassword === "string" && body.defaultPassword.length >= 6
      ? body.defaultPassword
      : "perpustakaan";

  const errors: { row: number; reason: string }[] = [];
  let imported = 0;
  const sendWelcome = body.sendWelcome !== false; // default true
  const newMembers: { email: string; name: string; memberNumber: string; phone: string | null; temporaryPassword: string }[] = [];

  await db.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const rowNo = i + 2; // baris 1 = header
      const fullName = typeof r.fullName === "string" ? r.fullName.trim() : "";
      if (!fullName) {
        errors.push({ row: rowNo, reason: "Nama lengkap kosong" });
        continue;
      }
      if (fullName.length < 3) {
        errors.push({ row: rowNo, reason: "Nama terlalu pendek" });
        continue;
      }

      const memberNumber = typeof r.memberNumber === "string" ? r.memberNumber.trim() : "";
      if (!memberNumber) {
        errors.push({ row: rowNo, reason: "Nomor anggota kosong" });
        continue;
      }

      const existingMember = await tx.member.findUnique({ where: { memberNumber } });
      if (existingMember) {
        errors.push({ row: rowNo, reason: `Nomor ${memberNumber} sudah dipakai` });
        continue;
      }

      const category =
        typeof r.category === "string" && r.category.trim().toUpperCase() === "TEACHER"
          ? "TEACHER"
          : "STUDENT";

      let email = typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNo, reason: `Email tidak valid: ${email}` });
        continue;
      }
      if (!email) {
        const safeNumber = memberNumber.toLowerCase().replace(/[^a-z0-9.-]/g, "");
        email = `${safeNumber || `member${rowNo}`}@${DEFAULT_DOMAIN}`;
      }

      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        errors.push({ row: rowNo, reason: `Email ${email} sudah terdaftar` });
        continue;
      }

      const passwordHash = await hashPassword(defaultPassword);
      const newUser = await tx.user.create({
        data: { email, passwordHash, name: fullName, role: category },
      });

      const phone = typeof r.phone === "string" && r.phone.trim() ? r.phone.trim() : null;
      await tx.member.create({
        data: {
          userId: newUser.id,
          memberNumber,
          fullName,
          category,
          status: "ACTIVE",
          classGrade:
            typeof r.classGrade === "string" && r.classGrade.trim() ? r.classGrade.trim() : null,
          phone,
        },
      });
      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: "Selamat Datang!",
          message: `Selamat datang di Perpustakaan Jendela Ilmu, ${fullName}. Akun Anda telah aktif.`,
          type: "INFO",
        },
      });
      imported++;
      newMembers.push({
        email: newUser.email,
        name: fullName,
        memberNumber,
        phone,
        temporaryPassword: defaultPassword,
      });
    }
  });

  await logAudit(user!.id, "MEMBER_IMPORT", "Member", undefined, `${imported} anggota diimport`);

  // Kirim welcome email + WA (best-effort, tidak memblokir response)
  if (sendWelcome && newMembers.length > 0) {
    Promise.allSettled(
      newMembers.map(async (m) => {
        // Email
        const tpl = emailTemplates.welcome({
          name: m.name,
          email: m.email,
          temporaryPassword: m.temporaryPassword,
        });
        await sendEmail({
          to: m.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          category: "WELCOME",
          relatedId: m.memberNumber,
        }).catch(() => {});

        // WhatsApp (jika ada nomor)
        if (m.phone) {
          const waTpl = whatsappTemplates.welcome({ name: m.name, memberNumber: m.memberNumber });
          await sendWhatsApp({
            phone: m.phone,
            message: waTpl,
            category: "WELCOME",
            relatedId: m.memberNumber,
          }).catch(() => {});
        }
      })
    ).then((results) => {
      const sent = results.filter((r) => r.status === "fulfilled").length;
      console.log(`[member-import] Welcome sent: ${sent}/${newMembers.length}`);
    });
  }

  return NextResponse.json({
    imported,
    skipped: rows.length - imported,
    welcomeSent: sendWelcome,
    errors: errors.slice(0, 100),
  });
}
