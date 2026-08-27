-- Kelas yang diajar guru (dipisah koma). Siswa tidak memakai kolom ini.
-- classGrade tetap: siswa = kelas, guru = mata pelajaran.
ALTER TABLE "Member" ADD COLUMN "taughtClasses" TEXT;
