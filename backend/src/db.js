import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { config } from "./config.js";

const dataDir = config.storagePath
  ? path.resolve(config.storagePath, "data")
  : path.resolve("data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "intelligent.db"));
db.pragma("journal_mode = WAL");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT,
      phone TEXT,
      role TEXT NOT NULL,
      telegram_id TEXT,
      profile_image TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      title TEXT NOT NULL,
      monthly_fee REAL NOT NULL,
      schedule TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      course_id INTEGER,
      teacher_id INTEGER,
      balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      enrolled_at TEXT,
      trial_required INTEGER NOT NULL DEFAULT 3,
      payment_due_date TEXT,
      last_payment_date TEXT,
      is_registered INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL,
      external_id TEXT,
      received_by_user_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      lesson_date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(student_id, lesson_date),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS telegram_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS student_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      actor_user_id INTEGER,
      action TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(actor_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_role TEXT,
      target_user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL,
      read_at TEXT,
      FOREIGN KEY(target_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_course_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(teacher_id, course_id),
      FOREIGN KEY(teacher_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS student_auth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS qr_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS developer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      age INTEGER,
      role_title TEXT NOT NULL,
      short_bio TEXT,
      bio TEXT,
      skills TEXT,
      image TEXT,
      banner_image TEXT,
      certificate_image TEXT,
      telegram_url TEXT,
      instagram_url TEXT,
      github_url TEXT,
      website_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL,
      read_at TEXT
    );
  `);

  const alterStatements = [
    `ALTER TABLE users ADD COLUMN profile_image TEXT`,
    `ALTER TABLE courses ADD COLUMN branch_id INTEGER`,
    `ALTER TABLE courses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE students ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE students ADD COLUMN archived_at TEXT`,
    `ALTER TABLE students ADD COLUMN enrolled_at TEXT`,
    `ALTER TABLE students ADD COLUMN trial_required INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE students ADD COLUMN payment_due_date TEXT`,
    `ALTER TABLE students ADD COLUMN is_registered INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE payments ADD COLUMN received_by_user_id INTEGER`
  ];

  for (const statement of alterStatements) {
    try {
      db.exec(statement);
    } catch {
      // Column already exists in persisted databases.
    }
  }
}

function seedDeveloperProfiles(now, passwordHash) {
  const count = db.prepare("SELECT COUNT(*) as count FROM developer_profiles").get().count;
  if (count > 0) {
    return;
  }

  const insertDeveloper = db.prepare(`
    INSERT INTO developer_profiles (
      slug, username, password_hash, full_name, age, role_title, short_bio, bio, skills,
      image, banner_image, certificate_image, telegram_url, instagram_url, github_url,
      website_url, is_active, created_at, updated_at
    )
    VALUES (
      @slug, @username, @password_hash, @full_name, @age, @role_title, @short_bio, @bio, @skills,
      @image, @banner_image, @certificate_image, @telegram_url, @instagram_url, @github_url,
      @website_url, 1, @created_at, @updated_at
    )
  `);

  [
    {
      slug: "ozodbek",
      username: "ozodbekmamatov",
      password_hash: passwordHash,
      full_name: "Mamatov Ozodbek",
      age: 22,
      role_title: "Full-stack Developer",
      short_bio: "Ta'lim va CRM tizimlari uchun zamonaviy veb mahsulotlar yaratadi.",
      bio: "Mamatov Ozodbek Intelligent loyihasining asosiy arxitektori va product-oriented full-stack dasturchisi. U CRM, dashboard, API va UI/UX qatlamlarini bir tizimga yig'ish bilan shug'ullanadi.",
      skills: JSON.stringify(["React", "Node.js", "Express", "SQLite", "JWT", "UI/UX"]),
      image: null,
      banner_image: null,
      certificate_image: null,
      telegram_url: "https://t.me/ozodbekmamatov",
      instagram_url: "https://instagram.com/ozodbekmamatov",
      github_url: "https://github.com/ozodbekmamatov",
      website_url: "",
      created_at: now,
      updated_at: now
    },
    {
      slug: "adiz",
      username: "mannabovadiz",
      password_hash: passwordHash,
      full_name: "Mannabov Adiz",
      age: 21,
      role_title: "Frontend Developer",
      short_bio: "Murakkab dashboard va landing page dizaynlarini kodga aylantiradi.",
      bio: "Mannabov Adiz komponentlarga boy SaaS interfeyslar, responsive layout va premium frontend animatsiyalar bo'yicha ishlaydi. UI detallarini foydalanuvchiga qulay ko'rinishga olib chiqadi.",
      skills: JSON.stringify(["React", "Vite", "CSS", "Responsive UI", "Dashboard Design"]),
      image: null,
      banner_image: null,
      certificate_image: null,
      telegram_url: "https://t.me/adizdev",
      instagram_url: "https://instagram.com/adizdev",
      github_url: "https://github.com/adizdev",
      website_url: "",
      created_at: now,
      updated_at: now
    },
    {
      slug: "javohir",
      username: "botirovjavohir",
      password_hash: passwordHash,
      full_name: "Botirov Javohir",
      age: 23,
      role_title: "Backend Developer",
      short_bio: "Barqaror API, autentifikatsiya va biznes logikalarni ishlab chiqadi.",
      bio: "Botirov Javohir backend arxitektura, ma'lumotlar bazasi, xavfsizlik va integratsiyalar ustida ishlaydi. Tizimning real biznes oqimlarini ishonchli backend bilan qo'llab-quvvatlaydi.",
      skills: JSON.stringify(["Node.js", "Express", "SQLite", "Auth", "Integrations", "Automation"]),
      image: null,
      banner_image: null,
      certificate_image: null,
      telegram_url: "https://t.me/javohirdev",
      instagram_url: "https://instagram.com/javohirdev",
      github_url: "https://github.com/javohirdev",
      website_url: "",
      created_at: now,
      updated_at: now
    }
  ].forEach(profile => insertDeveloper.run(profile));
}

export function seed() {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const passwordHash = bcrypt.hashSync("12345678", 10);
  seedDeveloperProfiles(now, passwordHash);

  const count = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (count > 0) {
    return;
  }

  const branchId = db.prepare(`
    INSERT INTO branches (name, address, created_at)
    VALUES (?, ?, ?)
  `).run("Asosiy filial", "Toshkent shahri, Chilonzor", now).lastInsertRowid;

  const insertUser = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, role, telegram_id, profile_image, created_at)
    VALUES (@full_name, @username, @password_hash, @phone, @role, @telegram_id, @profile_image, @created_at)
  `);

  const directorId = insertUser.run({
    full_name: "Azizbek Director",
    username: "director",
    password_hash: passwordHash,
    phone: "+998932303410",
    role: "director",
    telegram_id: null,
    profile_image: null,
    created_at: now
  }).lastInsertRowid;

  const receptionId = insertUser.run({
    full_name: "Malika Reception",
    username: "reception",
    password_hash: passwordHash,
    phone: "+998907778899",
    role: "reception",
    telegram_id: null,
    profile_image: null,
    created_at: now
  }).lastInsertRowid;

  const teacherId = insertUser.run({
    full_name: "Dilshod Teacher",
    username: "teacher",
    password_hash: passwordHash,
    phone: "+998909998877",
    role: "teacher",
    telegram_id: null,
    profile_image: null,
    created_at: now
  }).lastInsertRowid;

  const studentUser1 = insertUser.run({
    full_name: "Muhammadali Karimov",
    username: null,
    password_hash: null,
    phone: "+998932303410",
    role: "student",
    telegram_id: null,
    profile_image: null,
    created_at: now
  }).lastInsertRowid;

  const studentUser2 = insertUser.run({
    full_name: "Sevinch Ergasheva",
    username: null,
    password_hash: null,
    phone: "+998909876543",
    role: "student",
    telegram_id: null,
    profile_image: null,
    created_at: now
  }).lastInsertRowid;

  const courseStmt = db.prepare(`
    INSERT INTO courses (branch_id, title, monthly_fee, schedule, is_active, created_at)
    VALUES (@branch_id, @title, @monthly_fee, @schedule, @is_active, @created_at)
  `);

  const englishId = courseStmt.run({
    branch_id: branchId,
    title: "IELTS Intensive",
    monthly_fee: 800000,
    schedule: "Du-Chor-Juma, 18:00",
    is_active: 1,
    created_at: now
  }).lastInsertRowid;

  const mathId = courseStmt.run({
    branch_id: branchId,
    title: "Matematika Foundation",
    monthly_fee: 650000,
    schedule: "Se-Pay-Shan, 16:00",
    is_active: 1,
    created_at: now
  }).lastInsertRowid;

  db.prepare(`
    INSERT INTO teacher_course_assignments (teacher_id, course_id, created_at)
    VALUES (?, ?, ?), (?, ?, ?)
  `).run(teacherId, englishId, now, teacherId, mathId, now);

  const studentStmt = db.prepare(`
    INSERT INTO students (user_id, course_id, teacher_id, balance, status, enrolled_at, trial_required, payment_due_date, last_payment_date, created_at)
    VALUES (@user_id, @course_id, @teacher_id, @balance, @status, @enrolled_at, @trial_required, @payment_due_date, @last_payment_date, @created_at)
  `);

  const student1Id = studentStmt.run({
    user_id: studentUser1,
    course_id: englishId,
    teacher_id: teacherId,
    balance: 950000,
    status: "active",
    enrolled_at: dayjs().subtract(20, "day").format("YYYY-MM-DD"),
    trial_required: 3,
    payment_due_date: dayjs().subtract(18, "day").format("YYYY-MM-DD"),
    last_payment_date: dayjs().subtract(12, "day").format("YYYY-MM-DD"),
    created_at: now
  }).lastInsertRowid;

  const student2Id = studentStmt.run({
    user_id: studentUser2,
    course_id: mathId,
    teacher_id: teacherId,
    balance: 100000,
    status: "debtor",
    enrolled_at: dayjs().subtract(45, "day").format("YYYY-MM-DD"),
    trial_required: 3,
    payment_due_date: dayjs().subtract(41, "day").format("YYYY-MM-DD"),
    last_payment_date: dayjs().subtract(41, "day").format("YYYY-MM-DD"),
    created_at: now
  }).lastInsertRowid;

  const paymentStmt = db.prepare(`
    INSERT INTO payments (student_id, amount, method, status, external_id, created_at)
    VALUES (@student_id, @amount, @method, @status, @external_id, @created_at)
  `);

  paymentStmt.run({
    student_id: student1Id,
    amount: 800000,
    method: "click",
    status: "paid",
    external_id: "CLICK-DEMO-001",
    created_at: dayjs().subtract(12, "day").format("YYYY-MM-DD HH:mm:ss")
  });

  paymentStmt.run({
    student_id: student2Id,
    amount: 250000,
    method: "manual",
    status: "paid",
    external_id: "MANUAL-001",
    created_at: dayjs().subtract(40, "day").format("YYYY-MM-DD HH:mm:ss")
  });

  const attendanceStmt = db.prepare(`
    INSERT INTO attendance (student_id, teacher_id, lesson_date, status, created_at)
    VALUES (@student_id, @teacher_id, @lesson_date, @status, @created_at)
  `);

  [
    { student_id: student1Id, teacher_id: teacherId, lesson_date: dayjs().subtract(2, "day").format("YYYY-MM-DD"), status: "present" },
    { student_id: student1Id, teacher_id: teacherId, lesson_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"), status: "present" },
    { student_id: student2Id, teacher_id: teacherId, lesson_date: dayjs().subtract(2, "day").format("YYYY-MM-DD"), status: "absent" },
    { student_id: student2Id, teacher_id: teacherId, lesson_date: dayjs().subtract(1, "day").format("YYYY-MM-DD"), status: "present" }
  ].forEach((record) => attendanceStmt.run({ ...record, created_at: now }));

  const settingsStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  [
    ["center_name", "Intelligent Education"],
    ["center_phone", "+998 90 123 45 67"],
    ["center_address", "Toshkent shahri"],
    ["payment_rekvizit", "Click / Payme / Naqd"],
    ["telegram_support", "@intelligent_support"]
  ].forEach(([key, value]) => settingsStmt.run(key, value, now));
}

export function getDb() {
  return db;
}
