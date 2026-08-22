# Security Policy — Perpustakaan Jendela Ilmu

Kami sangat重视 keamanan data sekolah & privasi pengguna. Dokumen ini menjelaskan cara melaporkan kerentanan dan kebijakan security update.

## 🛡️ Supported Versions

| Version | Supported          | Status |
|---------|--------------------|--------|
| 1.x     | ✅ Active support  | Latest stable |
| 0.x     | ❌ End of life     | Sudah tidak didukung |

## 🔒 Security Features

Aplikasi sudah menerapkan best practices:

### Authentication & Authorization
- ✅ **JWT** dengan HMAC-SHA256 (jose library)
- ✅ **bcrypt** password hashing (cost factor 10)
- ✅ **2FA TOTP** (RFC 6238) untuk pustakawan
- ✅ **Session cookies** HttpOnly + Secure + SameSite=strict
- ✅ **Rate limiting** untuk login, forgot password, 2FA
- ✅ **Role-based access control** (LIBRARIAN / PUSTAKAWAN_JUNIOR / TEACHER / STUDENT)
- ✅ **Password reset** dengan hashed token, 1 jam expiry, single-use

### Data Protection
- ✅ **API keys** hashed (sha256) sebelum disimpan
- ✅ **Password** di-hash (bcrypt), tidak pernah plain text
- ✅ **PII minimization** — hanya field yang diperlukan
- ✅ **Audit log** untuk semua mutasi data
- ✅ **HTTPS-only** cookies di production
- ✅ **Security headers** (HSTS, X-Content-Type-Options, X-Frame-Options, dll)

### Input Validation
- ✅ Server-side validation di setiap API route
- ✅ Email format validation
- ✅ Phone number normalization (WhatsApp)
- ✅ File upload size & MIME type validation
- ✅ SQL injection protection via Prisma parameterized queries
- ✅ XSS protection (React auto-escape + DOMPurify untuk markdown)

### Infrastructure
- ✅ **Fail-closed** untuk JWT_SECRET, CRON_SECRET (no fallback)
- ✅ **Environment variables** untuk secrets (never committed)
- ✅ **Database backup** otomatis harian dengan rotasi 7 hari
- ✅ **Caddy reverse proxy** dengan TLS otomatis

## 🚨 Reporting a Vulnerability

Kami sangat menghargai laporan kerentanan dari komunitas. **JANGAN** laporkan lewat GitHub Issues publik.

### Cara Melaporkan

Kirim email ke: **security@jendelailmu.sch.id** (atau kontak maintainer)

Include informasi berikut:
1. **Deskripsi** kerentanan
2. **Steps to reproduce**
3. **Potential impact**
4. **Suggested fix** (opsional)
5. **Disclosure timeline** preference

### Response SLA

| Severity | Response Time | Fix Timeline |
|----------|---------------|--------------|
| Critical | 24 jam        | 7 hari       |
| High     | 3 hari        | 30 hari      |
| Medium   | 7 hari        | 90 hari      |
| Low      | 14 hari       | Best effort  |

### Disclosure Policy

- ✅ Coordinated disclosure
- ✅ Credit kepada reporter (jika mau)
- ✅ Public CVE jika severe
- ❌ NO legal action terhadap researcher yang bertindak good faith

## 🏆 Hall of Fame

_(akan diupdate ketika ada kontributor security)_

## 📋 Security Checklist untuk Deployment

Sebelum deploy ke production, pastikan:

### Environment
- [ ] `JWT_SECRET` di-generate dengan `openssl rand -base64 32` (min 32 char)
- [ ] `CRON_SECRET` di-generate sama
- [ ] `NEXTAUTH_URL` set ke HTTPS URL production
- [ ] `.env` ada di `.gitignore` (sudah by default)
- [ ] Tidak ada secrets di Git history (`git log -p | grep -i secret`)

### Server
- [ ] HTTPS aktif (via Caddy + Let's Encrypt)
- [ ] Firewall: hanya port 22, 80, 443 terbuka
- [ ] SSH: key-based auth only (no password)
- [ ] Automatic security updates (`unattended-upgrades`)
- [ ] Database file permissions 600/640, owned by app user
- [ ] Upload folder permissions 755, owned by app user
- [ ] Backup di tempat terpisah (off-site)

### Application
- [ ] Change default passwords (pustakawan, demo accounts)
- [ ] Enable 2FA untuk semua pustakawan
- [ ] Setup email & WhatsApp channels
- [ ] Test rate limiting (coba 10x login salah)
- [ ] Test forgot password flow
- [ ] Review audit log untuk anomali
- [ ] Monitor error log

### Database
- [ ] Run `VACUUM` periodically (SQLite optimization)
- [ ] Monitor disk space (backup bisa membengkak)
- [ ] Test restore dari backup (DR drill)

### Monitoring
- [ ] Setup uptime monitoring (UptimeRobot / BetterStack)
- [ ] Error tracking (built-in atau Sentry)
- [ ] Log aggregation (Loki / CloudWatch)
- [ ] Alert untuk disk > 80%, memory > 90%, response time > 2s

## 🔐 Best Practices untuk Sekolah

### Password Policy

- Minimum 8 karakter (saat ini 6, akan naik ke 8 di v2)
- Kombinasi huruf besar, kecil, angka
- Rotate setiap 6 bulan
- Jangan pakai ulang password
- Pakai password manager (Bitwarden gratis)

### 2FA untuk Staf

- Wajib untuk LIBRARIAN
- Recommended untuk TEACHER
- Backup codes disimpan di tempat aman (offline)

### Data Privacy

- Hanya staff yang boleh akses data PII siswa
- Backup harus di-encrypt
- Logout saat tinggalkan workstation
- Jangan share akun (punya audit trail per user)

### Incident Response

Kalau ada insiden keamanan (data bocor, akun dibobol, dll):

1. **Isolasi** — disable akun yang compromised
2. **Investigasi** — cek audit log
3. **Notify** — informasikan ke stakeholder
4. **Mitigate** — patch vulnerability
5. **Document** — post-mortem report

## 📊 Security Audit History

| Date       | Type   | Result | Action |
|------------|--------|--------|--------|
| 2026-08-22 | Internal | ✅ Pass | - |

## 🔄 Update Policy

- **Patch release** (1.0.x): setiap 2 minggu
- **Minor release** (1.x): setiap 1-3 bulan
- **Major release** (2.0): sesuai roadmap
- **Security patch**: ASAP (di luar jadwal)

Subscribe ke GitHub Releases untuk update notifications:
https://github.com/amhyer/perpustakaan/releases

---

**Security is a process, not a product.** 🔒

Untuk pertanyaan non-security, gunakan [GitHub Discussions](https://github.com/amhyer/perpustakaan/discussions).
