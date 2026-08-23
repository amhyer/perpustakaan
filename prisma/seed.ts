// Seed data untuk Perpustakaan Jendela Ilmu
// Jalankan dengan: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data Perpustakaan Jendela Ilmu...");

  // Bersihkan data lama
  await db.pointTransaction.deleteMany();
  await db.rewardRedemption.deleteMany();
  await db.semesterArchive.deleteMany();
  await db.notificationSchedule.deleteMany();
  await db.reward.deleteMany();
  await db.pointRule.deleteMany();
  await db.notification.deleteMany();
  await db.announcement.deleteMany();
  await db.bookProposal.deleteMany();
  await db.wishlist.deleteMany();
  await db.reservation.deleteMany();
  await db.loan.deleteMany();
  await db.bookItem.deleteMany();
  await db.book.deleteMany();
  await db.location.deleteMany();
  await db.category.deleteMany();
  await db.member.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany();

  // ===== Settings =====
  await db.setting.createMany({
    data: [
      { key: "library_name", value: "Perpustakaan Jendela Ilmu" },
      { key: "head_librarian", value: "Dra. Siti Rahmawati, M.Pd." },
      { key: "library_address", value: "Jl. Pendidikan No. 1, Jakarta" },
      { key: "fine_per_day_student", value: "1000" },
      { key: "fine_per_day_teacher", value: "500" },
      { key: "loan_days_student", value: "7" },
      { key: "loan_days_teacher", value: "14" },
    ],
  });

  // ===== Categories =====
  const categories = await db.category.createMany({
    data: [
      { name: "Fiksi", code: "F", description: "Novel, cerpen, dan karya imajinatif" },
      { name: "Sains", code: "500", description: "Ilmu pengetahuan alam" },
      { name: "Sejarah", code: "900", description: "Sejarah dan biografi" },
      { name: "Matematika", code: "510", description: "Matematika dan statistika" },
      { name: "Bahasa & Sastra", code: "400", description: "Linguistik dan sastra" },
      { name: "Teknologi", code: "600", description: "Ilmu terapan dan teknologi" },
      { name: "Agama", code: "200", description: "Agama dan spiritualitas" },
      { name: "Anak & Remaja", code: "AN", description: "Buku bacaan anak dan remaja" },
    ],
  });
  const cats = await db.category.findMany();

  // ===== Locations =====
  await db.location.createMany({
    data: [
      { name: "Rak A - Fiksi", code: "A-01", description: "Novel dan cerpen" },
      { name: "Rak B - Sains", code: "B-01", description: "Buku sains dan matematika" },
      { name: "Rak C - Sejarah", code: "C-01", description: "Sejarah dan biografi" },
      { name: "Rak D - Pelajaran", code: "D-01", description: "Buku pelajaran" },
      { name: "Rak E - Anak", code: "E-01", description: "Sudut baca anak" },
      { name: "Rak F - Agama", code: "F-01", description: "Buku keagamaan" },
    ],
  });
  const locs = await db.location.findMany();

  // ===== Users & Members =====
  const password = await bcrypt.hash("password123", 10);

  const createUser = async (
    email: string,
    name: string,
    role: string,
    memberNumber: string,
    category: string,
    extra: { classGrade?: string; phone?: string; address?: string; gender?: string }
  ) => {
    const user = await db.user.create({
      data: { email, passwordHash: password, name, role },
    });
    const member = await db.member.create({
      data: {
        userId: user.id,
        memberNumber,
        fullName: name,
        category,
        status: "ACTIVE",
        gender: extra.gender ?? "L",
        phone: extra.phone,
        address: extra.address,
        classGrade: extra.classGrade,
        joinDate: new Date("2024-01-15"),
        expiryDate: new Date("2028-12-31"),
      },
    });
    return { user, member };
  };

  // Pustakawan utama
  const lib = await createUser(
    "pustakawan@jendelailmu.sch.id",
    "Dewi Lestari",
    "LIBRARIAN",
    "PST-001",
    "LIBRARIAN",
    { phone: "081234567890", address: "Jl. Pendidikan No. 1", gender: "P" }
  );

  // Guru
  const guru1 = await createUser(
    "budi@jendelailmu.sch.id",
    "Budi Santoso, S.Pd.",
    "TEACHER",
    "GUR-001",
    "TEACHER",
    { classGrade: "Matematika", phone: "081234500001", gender: "L" }
  );
  const guru2 = await createUser(
    "siti@jendelailmu.sch.id",
    "Siti Aminah, S.Pd.",
    "TEACHER",
    "GUR-002",
    "TEACHER",
    { classGrade: "Bahasa Indonesia", phone: "081234500002", gender: "P" }
  );

  // Siswa
  const siswa1 = await createUser(
    "andini@jendelailmu.sch.id",
    "Andini Putri Maharani",
    "STUDENT",
    "SIS-2024-001",
    "STUDENT",
    { classGrade: "IX-A", phone: "081234560001", gender: "P" }
  );
  const siswa2 = await createUser(
    "rafi@jendelailmu.sch.id",
    "Rafi Pratama",
    "STUDENT",
    "SIS-2024-002",
    "STUDENT",
    { classGrade: "VIII-B", phone: "081234560002", gender: "L" }
  );
  const siswa3 = await createUser(
    "nayla@jendelailmu.sch.id",
    "Nayla Zahra",
    "STUDENT",
    "SIS-2024-003",
    "STUDENT",
    { classGrade: "VII-C", phone: "081234560003", gender: "P" }
  );
  const siswa4 = await createUser(
    "dimas@jendelailmu.sch.id",
    "Dimas Anggara",
    "STUDENT",
    "SIS-2024-004",
    "STUDENT",
    { classGrade: "IX-A", phone: "081234560004", gender: "L" }
  );

  // ===== Books =====
  const bookData = [
    { title: "Laskar Pelangi", author: "Andrea Hirata", publisher: "Bentang Pustaka", isbn: "9789793062792", year: 2005, pages: 529, category: "Fiksi", location: "Rak A - Fiksi", color: "#1e3a5f", subject: "Novel", synopsis: "Kisah inspiratif sepuluh anak miskin di Belitung yang berjuang meraih pendidikan. Sebuah cerita tentang persahabatan, mimpi, dan keajaiban yang lahir dari keterbatasan." },
    { title: "Bumi Manusia", author: "Pramoedya Ananta Toer", publisher: "Lentera Dipantara", isbn: "9789799731234", year: 1980, pages: 535, category: "Fiksi", location: "Rak A - Fiksi", color: "#7c4a2d", subject: "Novel Sejarah", synopsis: "Roman historis pertama tetralogi Buru, mengisahkan perjalanan Minke melawan kolonialisme Belanda dengan kekuatan pena." },
    { title: "Filosofi Teras", author: "Henry Manampiring", publisher: "Kompas", isbn: "9786024128637", year: 2018, pages: 296, category: "Fiksi", location: "Rak A - Fiksi", color: "#2d5a3d", subject: "Pengembangan Diri", synopsis: "Hikmah Stoisisme kuno untuk menghadapi kecemasan dan emosi negatif dalam kehidupan modern." },
    { title: "Sapiens: Riwayat Singkat Umat Manusia", author: "Yuval Noah Harari", publisher: "Gramedia", isbn: "9786024240142", year: 2017, pages: 477, category: "Sejarah", location: "Rak C - Sejarah", color: "#8b3a3a", subject: "Sejarah Umum", synopsis: "Perjalanan panjang Homo Sapiens dari predator biasa menjadi penguasa bumi, menelusuri revolusi kognitif, agrikultur, dan ilmiah." },
    { title: "Sejarah Indonesia Modern", author: "M.C. Ricklefs", publisher: "Serambi", isbn: "9789791393539", year: 2008, pages: 690, category: "Sejarah", location: "Rak C - Sejarah", color: "#5a3a6b", subject: "Sejarah Nasional", synopsis: "Penelusuran komprehensif sejarah Indonesia dari 1200 hingga masa reformasi, sebuah rujukan utama bagi peminat sejarah." },
    { title: "A Brief History of Time", author: "Stephen Hawking", publisher: "Gramedia", isbn: "9789792278455", year: 2016, pages: 256, category: "Sains", location: "Rak B - Sains", color: "#1f5f5b", subject: "Fisika", synopsis: "Penjelasan menakjubkan tentang alam semesta, lubang hitam, dan asal-usul waktu dari salah satu fisikawan terbesar abad ini." },
    { title: "Matematika untuk SMA Kelas XII", author: "Tim Erlangga", publisher: "Erlangga", isbn: "9789790993456", year: 2022, pages: 312, category: "Matematika", location: "Rak B - Sains", color: "#3d4a2d", subject: "Matematika", synopsis: "Buku ajar matematika SMA lengkap dengan latihan soal dan pembahasan, sesuai kurikulum merdeka." },
    { title: "Atomic Habits", author: "James Clear", publisher: "Gramedia", isbn: "9786024241797", year: 2019, pages: 408, category: "Fiksi", location: "Rak A - Fiksi", color: "#4a3a6b", subject: "Pengembangan Diri", synopsis: "Panduan praktis membangun kebiasaan baik dan menghilangkan yang buruk melalui perubahan kecil yang konsisten setiap hari." },
    { title: "Belajar Bahasa Inggris Kontemporer", author: "Rani Wulandari", publisher: "Yrama Widya", isbn: "9789790078901", year: 2021, pages: 224, category: "Bahasa & Sastra", location: "Rak D - Pelajaran", color: "#6b3a4a", subject: "Bahasa Inggris", synopsis: "Pembelajaran bahasa Inggris modern dengan konteks nyata dan latihan interaktif untuk siswa SMA." },
    { title: "Pemrograman Web untuk Pemula", author: "Andi Cahyono", publisher: "Informatika", isbn: "9789793509123", year: 2023, pages: 380, category: "Teknologi", location: "Rak D - Pelajaran", color: "#2d4a5a", subject: "Informatika", synopsis: "Panduan lengkap membangun website dari nol menggunakan HTML, CSS, dan JavaScript dengan studi kasus nyata." },
    { title: "Tuntunan Shalat untuk Anak", author: "Ustadz Ahmad", publisher: "Tiga Serangkai", isbn: "9789790167890", year: 2020, pages: 96, category: "Agama", location: "Rak F - Agama", color: "#1e3a5f", subject: "Agama Islam", synopsis: "Panduan praktis tata cara shalat untuk anak dengan ilustrasi menarik dan bahasa yang mudah dipahami." },
    { title: "Dongeng Nusantara untuk Anak", author: "Tim Ceria", publisher: "Mizan Kids", isbn: "9789794338012", year: 2019, pages: 120, category: "Anak & Remaja", location: "Rak E - Anak", color: "#2d5a3d", subject: "Dongeng", synopsis: "Kumpulan dongeng nusantara penuh hikmah, dari Malin Kundang hingga Sangkuriang, dengan ilustrasi warna-warni." },
    { title: "Kamus Besar Bahasa Indonesia", author: "Tim KBBI", publisher: "Balai Pustaka", isbn: "9789794072544", year: 2020, pages: 1100, category: "Bahasa & Sastra", location: "Rak D - Pelajaran", color: "#7c4a2d", subject: "Referensi", synopsis: "Kamus resmi bahasa Indonesia edisi terbaru, rujukan utama untuk penulisan dan pembelajaran bahasa." },
    { title: "Biologi untuk SMA Kelas X", author: "Irna Ariyani", publisher: "Yudhistira", isbn: "9789790034567", year: 2022, pages: 268, category: "Sains", location: "Rak B - Sains", color: "#1f5f5b", subject: "Biologi", synopsis: "Buku ajar biologi SMA dengan pendekatan saintifik dan ilustrasi sel yang memukau." },
    { title: "Negeri 5 Menara", author: "Ahmad Fuadi", publisher: "Gramedia", isbn: "9789792276796", year: 2009, pages: 416, category: "Fiksi", location: "Rak A - Fiksi", color: "#5a3a6b", subject: "Novel", synopsis: "Kisah Alif dan kawan-kawan di Pondok Madani yang meraih mimpi berkat mantra 'man jadda wajada'." },
  ];

  const books: { id: string }[] = [];
  for (const b of bookData) {
    const cat = cats.find((c) => c.name === b.category)!;
    const loc = locs.find((l) => l.name === b.location)!;
    const book = await db.book.create({
      data: {
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        isbn: b.isbn,
        year: b.year,
        pages: b.pages,
        synopsis: b.synopsis,
        coverImage: null,
        coverColor: b.color,
        language: "Indonesia",
        subject: b.subject,
        categoryId: cat.id,
        locationId: loc.id,
      },
    });
    // Buat 2-3 eksemplar per buku
    const itemCount = b.title.includes("Kamus") ? 1 : 3;
    for (let i = 1; i <= itemCount; i++) {
      await db.bookItem.create({
        data: {
          bookId: book.id,
          itemCode: `${b.isbn.slice(-6)}-${i}`,
          status: "AVAILABLE",
          condition: "BAIK",
        },
      });
    }
    books.push(book);
  }

  // ===== Loans =====
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

  // Helper: pinjam buku
  const borrowBook = async (
    memberId: string,
    bookIdx: number,
    loanDaysAgo: number,
    dueInDays: number,
    returned: boolean
  ) => {
    const book = books[bookIdx];
    const item = await db.bookItem.findFirst({
      where: { bookId: book.id, status: "AVAILABLE" },
    });
    if (!item) return;
    const loanDate = daysAgo(loanDaysAgo);
    const dueDate = loanDaysAgo > dueInDays ? daysAgo(loanDaysAgo - dueInDays) : daysAhead(dueInDays - loanDaysAgo);
    const isOverdue = !returned && dueDate < now;
    const returnDate = returned ? daysAgo(loanDaysAgo - 5) : null;
    await db.loan.create({
      data: {
        memberId,
        bookItemId: item.id,
        bookId: book.id,
        loanDate,
        dueDate,
        returnDate,
        status: returned ? "RETURNED" : isOverdue ? "OVERDUE" : "LOANED",
        fineAmount: returnDate && returnDate > dueDate ? 5000 : 0,
        renewedCount: 0,
      },
    });
    if (!returned) {
      await db.bookItem.update({ where: { id: item.id }, data: { status: "BORROWED" } });
    }
  };

  // Siswa 1 (Andini) - 2 aktif, 1 returned
  await borrowBook(siswa1.member.id, 0, 3, 7, false); // Laskar Pelangi, aktif
  await borrowBook(siswa1.member.id, 2, 1, 7, false); // Filosofi Teras, aktif
  await borrowBook(siswa1.member.id, 7, 30, 7, true); // Atomic Habits, returned

  // Siswa 2 (Rafi) - 1 overdue
  await borrowBook(siswa2.member.id, 3, 12, 7, false); // Sapiens, overdue
  await borrowBook(siswa2.member.id, 14, 20, 7, true); // Negeri 5 Menara, returned

  // Siswa 3 (Nayla) - 1 aktif
  await borrowBook(siswa3.member.id, 11, 2, 7, false); // Dongeng Nusantara

  // Siswa 4 (Dimas) - 1 overdue, 1 returned
  await borrowBook(siswa4.member.id, 9, 15, 7, false); // Pemrograman Web, overdue
  await borrowBook(siswa4.member.id, 5, 40, 7, true); // A Brief History of Time, returned

  // Guru 1 (Budi) - 2 aktif
  await borrowBook(guru1.member.id, 6, 5, 14, false); // Matematika XII
  await borrowBook(guru1.member.id, 13, 8, 14, false); // Biologi

  // Guru 2 (Siti) - 1 aktif, 1 returned
  await borrowBook(guru2.member.id, 8, 4, 14, false); // Bahasa Inggris
  await borrowBook(guru2.member.id, 4, 25, 14, true); // Sejarah Indonesia

  // ===== Reservations =====
  await db.reservation.create({
    data: {
      memberId: siswa3.member.id,
      bookId: books[0].id, // Laskar Pelangi (sedang dipinjam Andini)
      status: "PENDING",
      queueOrder: 1,
      reservedAt: daysAgo(1),
      expiresAt: daysAhead(7),
      note: "Sangat butuh untuk tugas bahasa",
    },
  });
  await db.reservation.create({
    data: {
      memberId: siswa4.member.id,
      bookId: books[7].id, // Atomic Habits
      status: "PENDING",
      queueOrder: 1,
      reservedAt: daysAgo(2),
    },
  });

  // ===== Wishlist =====
  await db.wishlist.create({ data: { memberId: siswa1.member.id, bookId: books[3].id } });
  await db.wishlist.create({ data: { memberId: siswa1.member.id, bookId: books[5].id } });
  await db.wishlist.create({ data: { memberId: siswa3.member.id, bookId: books[14].id } });
  await db.wishlist.create({ data: { memberId: siswa4.member.id, bookId: books[9].id } });
  await db.wishlist.create({ data: { memberId: guru1.member.id, bookId: books[3].id } });

  // ===== Proposals =====
  await db.bookProposal.create({
    data: {
      memberId: guru1.member.id,
      title: "Matematika Tingkat Lanjut untuk Olimpiade",
      author: "Prof. Soeharso",
      publisher: "Erlangga",
      isbn: "9789790999999",
      reason: "Dibutuhkan untuk pembinaan tim olimpiade matematika sekolah",
      status: "PENDING",
    },
  });
  await db.bookProposal.create({
    data: {
      memberId: siswa1.member.id,
      title: "Kumpulan Puisi Modern Indonesia",
      author: "Sapardi Djoko Damono",
      reason: "Referensi tambahan untuk pelajaran bahasa Indonesia",
      status: "PENDING",
    },
  });
  await db.bookProposal.create({
    data: {
      memberId: guru2.member.id,
      title: "Panduan Menulis Kreatif",
      author: "Goenawan Mohamad",
      reason: "Untuk melatih keterampilan menulis siswa kelas IX",
      status: "APPROVED",
      reviewedBy: lib.user.id,
      reviewNote: "Disetujui, akan diadakan bulan depan",
      reviewedAt: daysAgo(3),
    },
  });

  // ===== Announcements =====
  await db.announcement.create({
    data: {
      title: "Selamat Datang di Perpustakaan Jendela Ilmu!",
      content:
        "Perpustakaan buka setiap hari Senin - Jumat pukul 07.00 - 16.00. Mari manfaatkan koleksi buku kami untuk menambah wawasan. Selamat membaca!",
      authorId: lib.user.id,
      isPinned: true,
      publishedAt: daysAgo(7),
    },
  });
  await db.announcement.create({
    data: {
      title: "Pekan Literasi Bulan Ini",
      content:
        "Ayo ikuti Pekan Literasi dengan tema 'Membaca Membuka Jendela Dunia'. Ada lomba resensi buku dan pajangan buku favorit. Hadiah menarik menanti!",
      authorId: lib.user.id,
      isPinned: false,
      publishedAt: daysAgo(3),
    },
  });
  await db.announcement.create({
    data: {
      title: "Buku Baru Telah Tiba!",
      content:
        "Telah hadir koleksi buku terbaru: Atomic Habits, Sapiens, dan Filosofi Teras. Segera pinjam dan jangan sampai kehabisan!",
      authorId: lib.user.id,
      isPinned: false,
      publishedAt: daysAgo(1),
    },
  });

  // ===== Notifications =====
  const dueNotif = async (userId: string, title: string, message: string, type: string) => {
    await db.notification.create({
      data: { userId, title, message, type, isRead: false, createdAt: daysAgo(1) },
    });
  };
  await dueNotif(siswa1.user.id, "Pengingat Jatuh Tempo", `Buku "Laskar Pelangi" jatuh tempo dalam 4 hari. Jangan lupa kembalikan tepat waktu!`, "DUE_DATE");
  await dueNotif(siswa2.user.id, "Buku Terlambat", `Buku "Sapiens" sudah melewati jatuh tempo. Segera kembalikan untuk menghindari denda bertambah.`, "OVERDUE");
  await dueNotif(siswa4.user.id, "Buku Terlambat", `Buku "Pemrograman Web untuk Pemula" sudah melewati jatuh tempo.`, "OVERDUE");
  await dueNotif(siswa3.user.id, "Reservasi Diterima", `Reservasi buku "Laskar Pelangi" sedang dalam antrean.`, "INFO");
  await dueNotif(guru1.user.id, "Pekan Literasi", "Jangan lewatkan Pekan Literasi bulan ini!", "ANNOUNCEMENT");

  // =========================================================================
  // REWARD SYSTEM — Poin & Hadiah
  // =========================================================================

  // ===== Point Rules (Konfigurasi Aturan Poin) =====
  console.log("   - Seeding point rules...");
  const pointRules = [
    // Untuk Siswa
    { code: "LOAN_RETURNED", name: "Selesai Baca Buku", description: "Poin untuk setiap buku yang selesai dibaca", points: 10, role: "STUDENT", maxPerMonth: 30, minLoanDays: 2, minBookPages: 50 },
    { code: "ON_TIME_RETURN", name: "Tepat Waktu", description: "Bonus karena mengembalikan tepat waktu", points: 5, role: "STUDENT", maxPerMonth: 30 },
    { code: "EARLY_RETURN", name: "Lebih Awal", description: "Bonus karena mengembalikan 3+ hari lebih awal", points: 10, role: "STUDENT", maxPerMonth: 15 },
    { code: "REVIEW_WRITTEN", name: "Tulis Review", description: "Bonus untuk review minimal 50 kata", points: 10, role: "STUDENT", maxPerMonth: 5 },
    { code: "RATING_5STAR", name: "Rating 5 Bintang", description: "Bonus untuk rating 5 bintang", points: 3, role: "STUDENT", maxPerMonth: 15 },
    { code: "STREAK_7", name: "Streak 7 Hari", description: "Membaca 7 hari berturut-turut", points: 25, role: "STUDENT", cooldownHours: 168 },
    { code: "STREAK_30", name: "Streak 30 Hari", description: "Membaca 30 hari berturut-turut", points: 100, role: "STUDENT", cooldownHours: 720 },
    { code: "BADGE_UNLOCK", name: "Unlock Badge", description: "Bonus setiap unlock badge baru", points: 20, role: "STUDENT", maxPerMonth: 10 },
    { code: "YEARLY_GOAL", name: "Capai Target Tahunan", description: "Bonus saat mencapai target baca tahunan", points: 200, role: "STUDENT", maxPerMonth: 1 },
    // Untuk Guru
    { code: "LOAN_RETURNED", name: "Selesai Baca Buku (Guru)", description: "Poin untuk setiap buku yang selesai dibaca", points: 15, role: "TEACHER", maxPerMonth: 20, minLoanDays: 2, minBookPages: 50 },
    { code: "READING_LIST_CREATE", name: "Buat Reading List", description: "Guru membuat reading list untuk kelas", points: 30, role: "TEACHER", maxPerMonth: 4, cooldownHours: 168 },
    { code: "GURU_REVIEW", name: "Review dari Perspektif Guru", description: "Review buku dengan nilai edukatif", points: 20, role: "TEACHER", maxPerMonth: 4 },
  ];

  for (const r of pointRules) {
    await db.pointRule.create({ data: r });
  }

  // ===== Rewards (Katalog Hadiah) =====
  console.log("   - Seeding rewards...");
  const rewards = [
    // Level Pemula (50-200 poin) — Siswa
    { name: "Bookmark Custom Perpustakaan", description: "Bookmark berkualitas dengan desain eksklusif perpustakaan kami. Tersedia dalam 5 warna.", category: "STATIONERY", pointCost: 50, minRole: "STUDENT", stock: 100, requiresApproval: false, isFeatured: true, sortOrder: 1 },
    { name: "Pulpen Branded Sekolah", description: "Pulsah hitam dengan logo Jendela Ilmu. Nyaman di tangan untuk mencatat.", category: "STATIONERY", pointCost: 100, minRole: "STUDENT", stock: 80, requiresApproval: false, isFeatured: true, sortOrder: 2 },
    { name: "Notebook Kecil Eksklusif", description: "Buku catatan A6 dengan sampul bermotif jendela perpustakaan. 80 halaman.", category: "STATIONERY", pointCost: 150, minRole: "STUDENT", stock: 50, requiresApproval: false, isFeatured: true, sortOrder: 3 },
    { name: "Set Spidol Warna-Warni", description: "Paket 6 spidol warna cerah untuk mencatat dengan penuh warna.", category: "STATIONERY", pointCost: 200, minRole: "STUDENT", stock: 30, requiresApproval: false, isFeatured: true, sortOrder: 4 },
    // Level Menengah (200-500 poin) — Siswa
    { name: "Buku Pilihan 1 Eksemplar", description: "Pilih 1 buku dari daftar rekomendasi pustakawan (novel/buku pelajaran). Poin dipotong saat buku dipilih.", category: "BOOK", pointCost: 300, minRole: "STUDENT", stock: 15, requiresApproval: true, isFeatured: true, sortOrder: 5, maxPerMember: 2 },
    { name: "Bookmark Logam Eksklusif", description: "Bookmark dari stainless steel dengan ukiran logo perpustakaan. Tahan lama dan elegan.", category: "STATIONERY", pointCost: 350, minRole: "STUDENT", stock: 20, requiresApproval: false, sortOrder: 6 },
    { name: "Voucher Kopi Sekolah Rp 25.000", description: "Voucher untuk kopi/snack di kantin sekolah. Berlaku 30 hari sejak klaim.", category: "VOUCHER", pointCost: 400, minRole: "STUDENT", stock: 25, requiresApproval: true, sortOrder: 7, cooldownDays: 14 },
    { name: "Topi Sekolah Eksklusif", description: "Topi dengan bordir logo perpustakaan. Warna navy, adjustable size.", category: "GIFT_CARD", pointCost: 450, minRole: "STUDENT", stock: 12, requiresApproval: true, sortOrder: 8 },
    // Level Lanjut (500-1000 poin) — Siswa
    { name: "Voucher Buku Gramedia Rp 50.000", description: "Voucher belanja di Gramedia. Bisa untuk beli buku baru.", category: "VOUCHER", pointCost: 600, minRole: "STUDENT", stock: 8, requiresApproval: true, sortOrder: 9, maxPerMember: 1, cooldownDays: 60 },
    { name: "Sertifikat 'Pembaca Teladan'", description: "Sertifikat digital & fisik untuk Siswa dengan poin tertinggi bulanan.", category: "CERTIFICATE", pointCost: 700, minRole: "STUDENT", stock: null, requiresApproval: true, sortOrder: 10 },
    { name: "Paket 3 Buku Pilihan", description: "Pilih 3 buku berbeda dari katalog perpustakaan.", category: "BOOK", pointCost: 800, minRole: "STUDENT", stock: 6, requiresApproval: true, sortOrder: 11, maxPerMember: 1 },
    { name: "Mystery Box Perpustakaan", description: "Kotak misteri berisi merchandise &文具随机.惊喜等你来开!", category: "CUSTOM", pointCost: 1000, minRole: "STUDENT", stock: 5, requiresApproval: true, sortOrder: 12, maxPerMember: 1 },
    // Level Prestisius (1000+ poin) — Siswa
    { name: "Buku Edisi Khusus/Koleksi", description: "Buku langka atau edisi pertama dari koleksi pilihan pustakawan.", category: "BOOK", pointCost: 1500, minRole: "STUDENT", stock: 3, requiresApproval: true, sortOrder: 13, maxPerMember: 1, cooldownDays: 180 },
    { name: "Plakat 'Top Reader' Tahunan", description: "Plakat kayu dengan ukiran nama Anda sebagai Top Reader tahun ini.", category: "CERTIFICATE", pointCost: 2000, minRole: "STUDENT", stock: 3, requiresApproval: true, sortOrder: 14, maxPerMember: 1 },
    // Hadiah Guru
    { name: "Voucher Kopi Guru Rp 30.000", description: "Voucher untuk kopi premium di kantin guru.", category: "VOUCHER", pointCost: 400, minRole: "TEACHER", stock: null, requiresApproval: false, isFeatured: true, sortOrder: 20 },
    { name: "Akses Prioritas Ruang Diskusi", description: "Prioritas booking ruang diskusi selama 1 bulan.", category: "PRIVILEGE", pointCost: 500, minRole: "TEACHER", stock: null, requiresApproval: false, sortOrder: 21, cooldownDays: 30 },
    { name: "Sertifikat 'Guru Inspiratif'", description: "Sertifikat digital yang bisa dicetak & dipajang.", category: "CERTIFICATE", pointCost: 1000, minRole: "TEACHER", stock: null, requiresApproval: true, sortOrder: 22, maxPerMember: 1 },
    { name: "Buku Referensi Baru", description: "Pilih 1 buku referensi terbaru untuk koleksi pribadi.", category: "BOOK", pointCost: 800, minRole: "TEACHER", stock: 10, requiresApproval: true, sortOrder: 23, maxPerMember: 2 },
  ];

  for (const r of rewards) {
    await db.reward.create({
      data: {
        ...r,
        createdById: lib.user.id,
      },
    });
  }

  // ===== Sample Point Transactions (Demo State) =====
  // Beri poin awal ke siswa1 (Andini) yang sudah return 1 buku
  console.log("   - Seeding sample point transactions...");

  // Andini: 1 buku returned (Atomic Habits) → LOAN_RETURNED +10, ON_TIME_RETURN +5 = 15 poin
  const andiniLoan = await db.loan.findFirst({
    where: { memberId: siswa1.member.id, status: "RETURNED" },
    orderBy: { returnDate: "asc" },
  });
  if (andiniLoan) {
    await db.pointTransaction.create({
      data: {
        memberId: siswa1.member.id,
        type: "EARN",
        source: "LOAN_RETURNED",
        sourceId: andiniLoan.id,
        pointsConfigId: (await db.pointRule.findFirst({ where: { code: "LOAN_RETURNED", role: "STUDENT" } }))?.id,
        amount: 10,
        balanceAfter: 10,
        description: "Selesai baca 'Atomic Habits'",
      },
    });
    await db.pointTransaction.create({
      data: {
        memberId: siswa1.member.id,
        type: "EARN",
        source: "ON_TIME_RETURN",
        sourceId: andiniLoan.id,
        pointsConfigId: (await db.pointRule.findFirst({ where: { code: "ON_TIME_RETURN", role: "STUDENT" } }))?.id,
        amount: 5,
        balanceAfter: 15,
        description: "Tepat waktu!",
      },
    });
  }

  // Siswa4 (Dimas): 1 returned (A Brief History of Time) → 10 poin
  const dimasLoan = await db.loan.findFirst({
    where: { memberId: siswa4.member.id, status: "RETURNED" },
    orderBy: { returnDate: "asc" },
  });
  if (dimasLoan) {
    await db.pointTransaction.create({
      data: {
        memberId: siswa4.member.id,
        type: "EARN",
        source: "LOAN_RETURNED",
        sourceId: dimasLoan.id,
        amount: 10,
        balanceAfter: 10,
        description: "Selesai baca 'A Brief History of Time'",
      },
    });
  }

  // Guru1 (Budi): belum ada returned loan (semua aktif)

  // ===== Sample Reward Redemption (Demo) =====
  console.log("   - Seeding sample redemptions...");

  // Andini klaim 1 bookmark (sudah disetujui & delivered) sebagai demo
  const bookmarkReward = await db.reward.findFirst({
    where: { name: "Bookmark Custom Perpustakaan" },
  });
  if (bookmarkReward && andiniLoan) {
    // Refund poin untuk demo
    const currentBalance = 15;
    const newBalance = currentBalance - 50; // -50 untuk bookmark

    // Create transaction (REDEMEM)
    const redemption = await db.rewardRedemption.create({
      data: {
        memberId: siswa1.member.id,
        rewardId: bookmarkReward.id,
        rewardName: bookmarkReward.name,
        rewardCategory: bookmarkReward.category,
        pointsSpent: 50,
        status: "DELIVERED",
        approvedById: lib.user.id,
        approvedAt: daysAgo(2),
        deliveredAt: daysAgo(1),
        deliveredById: lib.user.id,
        memberNote: "Warna biru dongker kalau ada",
        staffNote: "Diberikan saat Andini ke perpus",
      },
    });

    // Kurangi stok
    await db.reward.update({
      where: { id: bookmarkReward.id },
      data: { stockClaimed: 1 },
    });

    // Log transaksi poin
    await db.pointTransaction.create({
      data: {
        memberId: siswa1.member.id,
        type: "REDEEM",
        rewardId: bookmarkReward.id,
        redemptionId: redemption.id,
        amount: 50,
        balanceAfter: -35, // Saldo jadi minus (sebelum refund kita adjust)
        description: `Tukar "${bookmarkReward.name}"`,
      },
    });

    // Kasih adjustment supaya saldo konsisten
    await db.pointTransaction.create({
      data: {
        memberId: siswa1.member.id,
        type: "ADJUST_UP",
        amount: 35,
        balanceAfter: 0,
        description: "Penyesuaian saldo demo (hackathon seed)",
        awardedById: lib.user.id,
      },
    });
  }

  // ===== Notification Schedules (default) =====
  console.log("   - Seeding notification schedules...");
  const existingSchedules = await db.notificationSchedule.findMany();
  if (existingSchedules.length === 0) {
    await db.notificationSchedule.createMany({
      data: [
        { name: "Weekly Student Digest", type: "WEEKLY", channel: "BOTH", targetRole: "STUDENT", dayOfWeek: 0, hour: 18, templateKey: "weeklyDigestStudent" },
        { name: "Monthly Top Reader", type: "MONTHLY", channel: "BOTH", targetRole: "STUDENT", dayOfMonth: 1, hour: 9, templateKey: "monthlyTopReader" },
        { name: "Weekly Teacher Recap", type: "WEEKLY", channel: "EMAIL", targetRole: "TEACHER", dayOfWeek: 5, hour: 16, templateKey: "weeklyDigestTeacher" },
      ],
    });
  }

  // ===== Settings (reward config) =====
  await db.setting.upsert({
    where: { key: "leaderboard_reset_mode" },
    update: {},
    create: { key: "leaderboard_reset_mode", value: "ARCHIVE" },
  });

  // ===== Chat FAQ (Sprint F1 - AI Assistant) =====
  console.log("   - Seeding chat FAQ cache...");
  const existingFAQs = await db.chatFAQ.count();
  if (existingFAQs === 0) {
    await db.chatFAQ.createMany({
      data: [
        {
          question: "Jam buka perpustakaan?",
          answer: "🕐 **Jam Operasional**\n- Senin-Jumat: 07.00 - 15.00\n- Sabtu: 08.00 - 12.00\n- Minggu & hari libur: Tutup",
          category: "hours",
          locale: "id",
          variations: JSON.stringify(["jam buka", "kapan buka", "jam operasional", "buka jam berapa", "tutup jam berapa"]),
        },
        {
          question: "Bagaimana cara pinjam buku?",
          answer: "📖 **Cara Meminjam Buku**\n1. Datang ke perpustakaan\n2. Bawa kartu anggota\n3. Pilih buku dari katalog\n4. Scan barcode di meja sirkulasi\n5. Batas waktu pengembalian sesuai aturan\n\n**Syarat**: Keanggotaan aktif, tidak ada pinjaman terlambat.",
          category: "loan_rules",
          locale: "id",
          variations: JSON.stringify(["cara pinjam", "pinjam buku", "meminjam", "how to borrow", "borrow book"]),
        },
        {
          question: "Berapa lama siswa boleh pinjam buku?",
          answer: "📚 **Aturan Peminjaman**\n- **Siswa**: max 3 buku, 7 hari\n- **Guru**: max 5 buku, 14 hari\n- **Pustakawan**: max 10 buku, 30 hari\n\nPerpanjangan: 1x (7 hari) jika tidak ada yang予約.",
          category: "loan_rules",
          locale: "id",
          variations: JSON.stringify(["berapa lama", "lama pinjam", "max pinjam", "aturan pinjam", "loan duration"]),
        },
        {
          question: "Berapa denda jika terlambat?",
          answer: "💰 **Denda Keterlambatan**\n- Siswa: Rp 1.000/hari/buku\n- Guru: Rp 500/hari/buku\n- Rusak/hilang: ganti buku baru atau 2x harga\n\n💡 Tips: Kembalikan tepat waktu untuk menghindari denda!",
          category: "loan_rules",
          locale: "id",
          variations: JSON.stringify(["denda", "denda berapa", "telat", "terlambat", "fine"]),
        },
        {
          question: "Bagaimana cara daftar anggota perpustakaan?",
          answer: "📋 **Pendaftaran Anggota**\n1. Datang ke perpustakaan saat jam buka\n2. Bawa fotokopi kartu pelajar / KTP\n3. Isi formulir pendaftaran\n4. Foto untuk kartu anggota\n5. Langsung aktif! Gratis untuk siswa & guru.\n\nNomor anggota + QR code langsung diterbitkan.",
          category: "membership",
          locale: "id",
          variations: JSON.stringify(["daftar anggota", "cara daftar", "mendaftar", "registrasi", "jadi anggota"]),
        },
        {
          question: "Apa itu sistem poin?",
          answer: "⭐ **Sistem Poin Jendela**\nDapatkan poin dari:\n- Selesai baca & kembalikan buku (+10)\n- Tulis review (+5)\n- Streak 7 hari berturut (+25)\n- Streak 30 hari (+100)\n\nTukar poin dengan hadiah di katalog!",
          category: "points",
          locale: "id",
          variations: JSON.stringify(["poin", "apa itu poin", "sistem poin", "point system"]),
        },
        {
          question: "Bagaimana cara klaim hadiah?",
          answer: "🎁 **Cara Klaim Hadiah**\n1. Buka menu **Hadiah** → pilih katalog\n2. Klik hadiah yang kamu mau\n3. Konfirmasi klaim (poin akan terpotong)\n4. Tunggu approval pustakawan\n5. Datang ke perpustakaan dengan kode pickup\n6. Scan QR saat mengambil",
          category: "points",
          locale: "id",
          variations: JSON.stringify(["klaim hadiah", "cara klaim", "tukar poin", "claim reward", "redeem"]),
        },
        {
          question: "Apakah perpustakaan punya wifi?",
          answer: "📶 **WiFi Perpustakaan**\nYa, tersedia WiFi gratis untuk siswa & guru.\n\n**SSID**: PerpustakaanJI\n**Password**: jendela2026\n\n⚠️ Dilarang untuk akses konten negatif.",
          category: "general",
          locale: "id",
          variations: JSON.stringify(["wifi", "internet", "ssid", "password wifi"]),
        },
        {
          question: "Boleh bawa makanan ke perpustakaan?",
          answer: "🍔 **Kebijakan Makanan**\n- **Dilarang**: makanan berat, minuman berwarna, makanan berbau tajam\n- **Diperbolehkan**: air putih dalam botol tertutup, snack ringan tanpa bau\n\nJaga kebersihan & kenyamanan bersama! 🙏",
          category: "general",
          locale: "id",
          variations: JSON.stringify(["makanan", "makan", "minum", "bawa makanan"]),
        },
        {
          question: "Bagaimana cara mencari buku tertentu?",
          answer: "🔍 **Cara Cari Buku**\n1. Buka menu **Katalog** di sidebar\n2. Ketik judul / pengarang / ISBN di search bar\n3. Filter berdasarkan kategori / lokasi rak\n4. Klik buku untuk lihat detail & ketersediaan\n\nAtau tanya saya langsung, saya bantu cari! 😊",
          category: "general",
          locale: "id",
          variations: JSON.stringify(["cari buku", "menemukan buku", "find book", "search"]),
        },
        // English FAQ
        {
          question: "What are the library hours?",
          answer: "🕐 **Opening Hours**\n- Monday-Friday: 07.00 - 15.00\n- Saturday: 08.00 - 12.00\n- Sunday & holidays: Closed",
          category: "hours",
          locale: "en",
          variations: JSON.stringify(["library hours", "when open", "opening times"]),
        },
        {
          question: "How do I borrow a book?",
          answer: "📖 **How to Borrow**\n1. Visit the library\n2. Bring your member card\n3. Choose books from the catalog\n4. Scan the barcode at the circulation desk\n5. Return by the due date\n\n**Requirements**: Active membership, no overdue loans.",
          category: "loan_rules",
          locale: "en",
          variations: JSON.stringify(["borrow", "how to borrow", "check out"]),
        },
      ],
    });
  }

  console.log("✅ Seeding selesai!");
  console.log(`   - ${books.length} buku dengan eksemplar`);
  console.log("   - 7 anggota (1 pustakawan, 2 guru, 4 siswa)");
  console.log("   - 11 point rules (9 untuk siswa, 3 untuk guru)");
  console.log("   - 18 hadiah (15 siswa, 4 guru)");
  console.log("   - Sample transactions: Andini 0 poin (sudah tukar bookmark), Dimas 10 poin");
  console.log("   - Akun demo:");
  console.log("     Pustakawan: pustakawan@jendelailmu.sch.id / password123");
  console.log("     Guru: budi@jendelailmu.sch.id / password123");
  console.log("     Siswa: andini@jendelailmu.sch.id / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
