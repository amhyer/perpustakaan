// Seed data untuk Perpustakaan Jendela Ilmu
// Jalankan dengan: bun run prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data Perpustakaan Jendela Ilmu...");

  // Bersihkan data lama
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

  console.log("✅ Seeding selesai!");
  console.log(`   - ${books.length} buku dengan eksemplar`);
  console.log("   - 7 anggota (1 pustakawan, 2 guru, 4 siswa)");
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
