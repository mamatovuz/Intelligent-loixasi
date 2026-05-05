import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dayjs from "dayjs";
import { getDb } from "./db.js";
import { config } from "./config.js";

const db = getDb();
const uploadsDir = config.storagePath
  ? path.resolve(config.storagePath, "uploads")
  : path.resolve("uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function mapStudentRow(student) {
  if (!student) {
    return null;
  }

  return {
    id: student.id,
    fullName: student.fullName,
    phone: student.phone,
    balance: student.balance,
    status: student.status,
    enrolledAt: student.enrolledAt || null,
    trialRequired: Number(student.trialRequired || 3),
    paymentDueDate: student.paymentDueDate || null,
    trialProgress: Number(student.trialProgress || 0),
    monthlyFee: student.monthlyFee,
    courseId: student.courseId,
    courseTitle: student.courseTitle,
    schedule: student.schedule,
    teacherId: student.teacherId,
    teacherName: student.teacherName,
    lastPaymentDate: student.lastPaymentDate,
    telegramId: student.telegramId,
    isArchived: Boolean(student.isArchived),
    profileImage: student.profileImage || null
  };
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persistProfileImage(profileImage) {
  if (!profileImage) {
    return null;
  }

  if (!profileImage.startsWith("data:image/")) {
    return profileImage;
  }

  const match = profileImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) {
    return profileImage;
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1].replace("+xml", "");
  const base64Data = match[2];
  const fileName = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
  return `/uploads/${fileName}`;
}

function mapDeveloperRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    username: row.username,
    fullName: row.fullName,
    age: row.age ? Number(row.age) : null,
    roleTitle: row.roleTitle,
    shortBio: row.shortBio || "",
    bio: row.bio || "",
    skills: safeJsonParse(row.skills, []),
    image: row.image || null,
    bannerImage: row.bannerImage || null,
    certificateImage: row.certificateImage || null,
    telegramUrl: row.telegramUrl || "",
    instagramUrl: row.instagramUrl || "",
    githubUrl: row.githubUrl || "",
    websiteUrl: row.websiteUrl || "",
    isActive: Boolean(row.isActive)
  };
}

function normalizePhone(value = "") {
  return String(value).replace(/\s+/g, "");
}

function createNotification({ targetRole = null, targetUserId = null, type, title, message, metadata = null }) {
  db.prepare(`
    INSERT INTO notifications (target_role, target_user_id, type, title, message, metadata, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'unread', ?)
  `).run(
    targetRole,
    targetUserId,
    type,
    title,
    message,
    metadata ? JSON.stringify(metadata) : null,
    dayjs().format("YYYY-MM-DD HH:mm:ss")
  );
}

function addStudentHistory(studentId, actorUserId, action, title, details) {
  db.prepare(`
    INSERT INTO student_history (student_id, actor_user_id, action, title, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, actorUserId || null, action, title, details || null, dayjs().format("YYYY-MM-DD HH:mm:ss"));
}

function getTrialProgress(studentId, enrolledAt) {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM attendance
    WHERE student_id = ?
      AND status = 'present'
      AND date(lesson_date) >= date(?)
  `).get(studentId, enrolledAt || dayjs().format("YYYY-MM-DD"));
  return Number(row?.count || 0);
}

function getNthTrialLessonDate(studentId, enrolledAt, trialRequired) {
  const row = db.prepare(`
    SELECT lesson_date as lessonDate
    FROM attendance
    WHERE student_id = ?
      AND status = 'present'
      AND date(lesson_date) >= date(?)
    ORDER BY date(lesson_date) ASC
    LIMIT 1 OFFSET ?
  `).get(studentId, enrolledAt || dayjs().format("YYYY-MM-DD"), Math.max(0, Number(trialRequired || 3) - 1));
  return row?.lessonDate || null;
}

function recalcStudentState(studentId) {
  const student = db.prepare(`
    SELECT s.id, s.balance, s.enrolled_at as enrolledAt, s.trial_required as trialRequired, c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return null;
  }

  const enrolledAt = student.enrolledAt || dayjs().format("YYYY-MM-DD");
  const trialRequired = Number(student.trialRequired || 3);
  const trialProgress = getTrialProgress(studentId, enrolledAt);
  const paymentDueDate = trialProgress >= trialRequired ? getNthTrialLessonDate(studentId, enrolledAt, trialRequired) : null;

  let status = "trial";
  if (trialProgress >= trialRequired) {
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  }

  db.prepare(`
    UPDATE students
    SET status = ?, enrolled_at = ?, trial_required = ?, payment_due_date = ?
    WHERE id = ?
  `).run(status, enrolledAt, trialRequired, paymentDueDate, studentId);

  return { status, trialProgress, trialRequired, paymentDueDate, enrolledAt };
}

export function getStudentByUserId(userId) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE s.user_id = ?
  `).get(userId);

  return mapStudentRow({ ...row, trialProgress: row ? getTrialProgress(row.id, row.enrolledAt) : 0 });
}

export function getStudentByPhone(phone) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      s.user_id as userId,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE u.phone = ?
  `).get(phone);

  return row ? { ...row, trialProgress: getTrialProgress(row.id, row.enrolledAt) } : null;
}

export function getStudentByTelegramId(telegramId) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      s.user_id as userId,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE u.telegram_id = ?
  `).get(String(telegramId));
  return mapStudentRow({ ...row, trialProgress: row ? getTrialProgress(row.id, row.enrolledAt) : 0 });
}

export function listPaymentsByStudent(studentId) {
  return db.prepare(`
    SELECT id, amount, method, status, created_at as createdAt
    FROM payments
    WHERE student_id = ?
    ORDER BY datetime(created_at) DESC
  `).all(studentId);
}

export function listAllPayments() {
  return db.prepare(`
    SELECT
      p.id,
      p.amount,
      p.method,
      p.status,
      p.created_at as createdAt,
      staff.full_name as receivedBy,
      u.full_name as studentName,
      u.phone as studentPhone,
      c.title as courseTitle
    FROM payments p
    JOIN students s ON s.id = p.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users staff ON staff.id = p.received_by_user_id
    ORDER BY datetime(p.created_at) DESC
  `).all();
}

export function listStudents(filters = {}) {
  const values = [];
  let query = `
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE 1 = 1
  `;

  if (!filters.includeArchived) {
    query += ` AND s.is_archived = 0`;
  }

  if (filters.search) {
    query += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR c.title LIKE ?)`;
    values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.teacherId) {
    query += ` AND s.teacher_id = ?`;
    values.push(filters.teacherId);
  }

  if (filters.status === "active") {
    query += ` AND s.status = 'active'`;
  }

  if (filters.status === "debtor") {
    query += ` AND s.status = 'debtor'`;
  }

  if (filters.status === "trial") {
    query += ` AND s.status = 'trial'`;
  }

  query += ` ORDER BY u.full_name`;

  return db.prepare(query).all(...values).map((row) => mapStudentRow({ ...row, trialProgress: getTrialProgress(row.id, row.enrolledAt) }));
}

export function listTeachers() {
  const teachers = db.prepare(`
    SELECT id, full_name as fullName, username, phone, profile_image as profileImage
    FROM users
    WHERE role = 'teacher'
    ORDER BY full_name
  `).all();

  const assignmentRows = db.prepare(`
    SELECT teacher_id as teacherId, course_id as courseId
    FROM teacher_course_assignments
  `).all();

  return teachers.map((teacher) => ({
    ...teacher,
    courseIds: assignmentRows
      .filter((item) => Number(item.teacherId) === Number(teacher.id))
      .map((item) => Number(item.courseId))
  }));
}

function teacherCanTeachCourse(teacherId, courseId) {
  const row = db.prepare(`
    SELECT 1
    FROM teacher_course_assignments
    WHERE teacher_id = ? AND course_id = ?
    LIMIT 1
  `).get(teacherId, courseId);
  return Boolean(row);
}

function syncTeacherCourses(teacherId, courseIds = []) {
  db.prepare(`DELETE FROM teacher_course_assignments WHERE teacher_id = ?`).run(teacherId);
  const insert = db.prepare(`
    INSERT INTO teacher_course_assignments (teacher_id, course_id, created_at)
    VALUES (?, ?, ?)
  `);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  for (const courseId of courseIds) {
    insert.run(teacherId, Number(courseId), now);
  }
}

export function listCourses() {
  return db.prepare(`
    SELECT c.id, c.branch_id as branchId, b.name as branchName, c.title, c.monthly_fee as monthlyFee, c.schedule, c.is_active as isActive
    FROM courses c
    LEFT JOIN branches b ON b.id = c.branch_id
    WHERE c.is_active = 1
    ORDER BY c.title
  `).all().map((item) => ({ ...item, isActive: Boolean(item.isActive) }));
}

export function listAllCourses() {
  return db.prepare(`
    SELECT c.id, c.branch_id as branchId, b.name as branchName, c.title, c.monthly_fee as monthlyFee, c.schedule, c.is_active as isActive, c.created_at as createdAt
    FROM courses c
    LEFT JOIN branches b ON b.id = c.branch_id
    ORDER BY c.title
  `).all().map((item) => ({ ...item, isActive: Boolean(item.isActive) }));
}

export function listBranches() {
  return db.prepare(`
    SELECT id, name, address
    FROM branches
    ORDER BY name
  `).all();
}

export function addStudent(payload, actorUserId = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const enrolledDate = dayjs().format("YYYY-MM-DD");
  const createUser = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, role, telegram_id, profile_image, created_at)
    VALUES (?, NULL, NULL, ?, 'student', NULL, NULL, ?)
  `);
  const userId = createUser.run(payload.fullName, payload.phone, now).lastInsertRowid;

  const initialBalance = Number(payload.balance || 0);
  const status = "trial";

  if (!teacherCanTeachCourse(payload.teacherId, payload.courseId)) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  const studentId = db.prepare(`
    INSERT INTO students (user_id, course_id, teacher_id, balance, status, enrolled_at, trial_required, payment_due_date, last_payment_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    payload.courseId,
    payload.teacherId,
    initialBalance,
    status,
    enrolledDate,
    3,
    null,
    null,
    now
  ).lastInsertRowid;

  recalcStudentState(studentId);
  addStudentHistory(studentId, actorUserId, "created", "Student yaratildi", `${payload.fullName} tizimga qo'shildi. Sinov muddati 3 kun.`);
  createNotification({
    targetRole: "director",
    type: "student_created",
    title: "Yangi o'quvchi qo'shildi",
    message: `${payload.fullName} ro'yxatga qo'shildi`
  });

  return studentId;
}

export function updateStudent(studentId, payload, actorUserId = null) {
  const before = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      s.course_id as courseId,
      s.teacher_id as teacherId,
      s.is_archived as isArchived
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  const course = db.prepare(`
    SELECT monthly_fee as monthlyFee
    FROM courses
    WHERE id = ?
  `).get(payload.courseId);

  const nextBalance = Number(payload.balance || 0);

  if (!teacherCanTeachCourse(payload.teacherId, payload.courseId)) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  db.prepare(`
    UPDATE users
    SET full_name = ?, phone = ?
    WHERE id = (SELECT user_id FROM students WHERE id = ?)
  `).run(payload.fullName, payload.phone, studentId);

  db.prepare(`
    UPDATE students
    SET course_id = ?, teacher_id = ?, balance = ?, last_payment_date = COALESCE(last_payment_date, ?)
    WHERE id = ?
  `).run(
    payload.courseId,
    payload.teacherId,
    nextBalance,
    dayjs().format("YYYY-MM-DD"),
    studentId
  );

  recalcStudentState(studentId);

  if (before) {
    if (before.courseId !== payload.courseId) {
      addStudentHistory(studentId, actorUserId, "course_changed", "Kurs almashtirildi", `${before.fullName} yangi kursga o'tkazildi`);
    }
    if (before.teacherId !== payload.teacherId) {
      addStudentHistory(studentId, actorUserId, "teacher_changed", "O'qituvchi almashtirildi", `${before.fullName} uchun o'qituvchi yangilandi`);
    }
    addStudentHistory(studentId, actorUserId, "updated", "Student yangilandi", `${before.fullName} ma'lumotlari tahrirlandi`);
  }
}

export function archiveStudent(studentId, actorUserId = null) {
  const student = db.prepare(`
    SELECT s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return false;
  }

  db.prepare(`
    UPDATE students
    SET is_archived = 1, archived_at = ?
    WHERE id = ?
  `).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), studentId);

  addStudentHistory(studentId, actorUserId, "archived", "Student arxivlandi", `${student.fullName} arxivga o'tkazildi`);
  return true;
}

export function deleteStudent(studentId) {
  const student = db.prepare(`
    SELECT s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return false;
  }

  db.prepare(`DELETE FROM payments WHERE student_id = ?`).run(studentId);
  db.prepare(`DELETE FROM attendance WHERE student_id = ?`).run(studentId);
  db.prepare(`DELETE FROM telegram_links WHERE student_id = ?`).run(studentId);
  db.prepare(`DELETE FROM student_history WHERE student_id = ?`).run(studentId);
  db.prepare(`DELETE FROM students WHERE id = ?`).run(studentId);
  db.prepare(`DELETE FROM users WHERE id = ?`).run(student.userId);
  return true;
}

export function recordPayment(studentId, amount, method, status = "paid", externalId = null, actorUserId = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const paymentId = db.prepare(`
    INSERT INTO payments (student_id, amount, method, status, external_id, received_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, method, status, externalId, actorUserId || null, now).lastInsertRowid;

  const student = db.prepare(`
    SELECT s.id, s.balance, c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  const newBalance = Number(student.balance) + Number(amount);

  db.prepare(`
    UPDATE students
    SET balance = ?, last_payment_date = ?
    WHERE id = ?
  `).run(
    newBalance,
    dayjs().format("YYYY-MM-DD"),
    studentId
  );
  recalcStudentState(studentId);

  const summary = db.prepare(`
    SELECT u.full_name as fullName, u.phone, c.title as courseTitle
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  addStudentHistory(studentId, actorUserId, "payment_recorded", "To'lov qabul qilindi", `${Number(amount).toLocaleString("ru-RU")} UZS / ${method}`);
  createNotification({
    targetRole: "director",
    type: "payment",
    title: "Yangi to'lov qabul qilindi",
    message: `${summary.fullName} - ${summary.courseTitle} uchun ${Number(amount).toLocaleString("ru-RU")} UZS`
  });
  const studentUser = db.prepare(`SELECT user_id as userId FROM students WHERE id = ?`).get(studentId);
  if (studentUser?.userId) {
    createNotification({
      targetUserId: studentUser.userId,
      type: "payment_received",
      title: "To'lov qabul qilindi",
      message: `${Number(amount).toLocaleString("ru-RU")} UZS to'lovingiz tizimga tushdi`
    });
  }

  return {
    id: paymentId,
    studentId,
    fullName: summary.fullName,
    phone: summary.phone,
    courseTitle: summary.courseTitle,
    amount: Number(amount),
    method,
    paidAt: now
  };
}

export function upsertAttendance({ studentId, teacherId, lessonDate, status }) {
  db.prepare(`
    INSERT INTO attendance (student_id, teacher_id, lesson_date, status, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, lesson_date)
    DO UPDATE SET status = excluded.status, teacher_id = excluded.teacher_id
  `).run(
    studentId,
    teacherId,
    lessonDate,
    status,
    dayjs().format("YYYY-MM-DD HH:mm:ss")
  );
  const next = recalcStudentState(studentId);

  if (status === "absent") {
    const student = db.prepare(`
      SELECT u.id as userId, u.full_name as fullName
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(studentId);

    createNotification({
      targetRole: "reception",
      type: "attendance_absent",
      title: "Davomat ogohlantirishi",
      message: `${student?.fullName || "Student"} darsga kelmadi`
    });
    if (student?.userId) {
      createNotification({
        targetUserId: student.userId,
        type: "absent_alert",
        title: "Davomat ogohlantirishi",
        message: "Bugungi dars uchun kelmadi deb belgilandingiz"
      });
    }
  }

  if (next?.status === "debtor" && next.paymentDueDate === lessonDate) {
    const student = db.prepare(`
      SELECT u.id as userId, u.full_name as fullName
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(studentId);
    createNotification({
      targetRole: "reception",
      type: "trial_finished",
      title: "Sinov muddati tugadi",
      message: `${student?.fullName || "Student"} uchun sinov tugadi va to'lov muddati boshlandi`
    });
    if (student?.userId) {
      createNotification({
        targetUserId: student.userId,
        type: "trial_ending",
        title: "Sinov muddati tugadi",
        message: "3 kunlik sinov tugadi. Endi oylik to'lov talab qilinadi"
      });
    }
  }
}

export function createStudentRegistrationToken(studentId, expiresInSeconds = 90) {
  const student = db.prepare(`
    SELECT s.id, s.is_registered as isRegistered, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.is_archived = 0
  `).get(studentId);

  if (!student) {
    throw new Error("Student topilmadi");
  }
  if (Number(student.isRegistered)) {
    throw new Error("Student allaqachon ro'yxatdan o'tgan");
  }

  db.prepare(`DELETE FROM qr_tokens WHERE student_id = ? AND used = 0`).run(studentId);

  const ttl = Math.min(120, Math.max(60, Number(expiresInSeconds || 90)));
  const token = crypto.randomBytes(24).toString("hex");
  const now = dayjs();
  const expiresAt = now.add(ttl, "second").format("YYYY-MM-DD HH:mm:ss");

  db.prepare(`
    INSERT INTO qr_tokens (token, student_id, expires_at, used, used_at, created_at)
    VALUES (?, ?, ?, 0, NULL, ?)
  `).run(token, studentId, expiresAt, now.format("YYYY-MM-DD HH:mm:ss"));

  return {
    token,
    studentId,
    fullName: student.fullName,
    expiresAt,
    registerUrl: `${config.webUrl}/register?token=${token}`
  };
}

export function validateStudentRegistrationToken(token) {
  const row = db.prepare(`
    SELECT
      qt.id,
      qt.token,
      qt.student_id as studentId,
      qt.expires_at as expiresAt,
      qt.used,
      s.is_registered as isRegistered,
      u.full_name as fullName,
      u.phone
    FROM qr_tokens qt
    JOIN students s ON s.id = qt.student_id
    JOIN users u ON u.id = s.user_id
    WHERE qt.token = ?
    LIMIT 1
  `).get(token);

  if (!row) {
    throw new Error("Token topilmadi");
  }
  if (Number(row.used)) {
    throw new Error("Token allaqachon ishlatilgan");
  }
  if (Number(row.isRegistered)) {
    throw new Error("Student allaqachon ro'yxatdan o'tgan");
  }
  if (dayjs(row.expiresAt).isBefore(dayjs())) {
    throw new Error("Token muddati tugagan");
  }

  const [firstName = "", ...rest] = (row.fullName || "").split(" ");
  return {
    token: row.token,
    studentId: row.studentId,
    firstName,
    lastName: rest.join(" "),
    fullName: row.fullName,
    phone: row.phone,
    expiresAt: row.expiresAt
  };
}

export function registerStudentByToken({ token, phone, passwordHash }) {
  const qr = validateStudentRegistrationToken(token);
  if (normalizePhone(qr.phone) !== normalizePhone(phone)) {
    throw new Error("Telefon raqam student ma'lumoti bilan mos emas");
  }

  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  db.prepare(`
    INSERT INTO student_auth (student_id, phone, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(qr.studentId, normalizePhone(phone), passwordHash, now, now);

  db.prepare(`UPDATE students SET is_registered = 1 WHERE id = ?`).run(qr.studentId);
  db.prepare(`UPDATE qr_tokens SET used = 1, used_at = ? WHERE token = ?`).run(now, token);

  return qr;
}

export function getStudentAuthByPhone(phone) {
  return db.prepare(`
    SELECT sa.id, sa.student_id as studentId, sa.phone, sa.password_hash as passwordHash, s.user_id as userId
    FROM student_auth sa
    JOIN students s ON s.id = sa.student_id
    WHERE REPLACE(sa.phone, ' ', '') = ?
  `).get(normalizePhone(phone));
}

function getNextLessonDateFromSchedule(schedule) {
  if (!schedule) return null;
  const dayMap = {
    du: 1,
    se: 2,
    chor: 3,
    pay: 4,
    juma: 5,
    shan: 6,
    yak: 0
  };
  const daysPart = schedule.split(",")[0] || "";
  const dayKeys = daysPart
    .split("-")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => dayMap[item])
    .filter((item) => item !== undefined);
  if (!dayKeys.length) return null;

  const today = dayjs();
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = today.add(offset, "day");
    if (dayKeys.includes(candidate.day())) {
      return candidate.format("YYYY-MM-DD");
    }
  }
  return null;
}

export function getStudentDashboard(userId) {
  const profile = getStudentByUserId(userId);
  if (!profile) {
    return null;
  }
  return {
    fullName: profile.fullName,
    status: profile.status,
    balance: profile.balance,
    courseTitle: profile.courseTitle,
    teacherName: profile.teacherName,
    nextLessonDate: getNextLessonDateFromSchedule(profile.schedule),
    trialProgress: profile.trialProgress,
    trialRequired: profile.trialRequired,
    monthlyFee: profile.monthlyFee,
    paymentDueDate: profile.paymentDueDate
  };
}

export function getStudentAttendance(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const items = listAttendanceHistory({ studentId: student.id, range: "month" });
  const presentCount = items.filter((item) => item.status === "present").length;
  const percentage = items.length ? Math.round((presentCount / items.length) * 100) : 0;
  return {
    percentage,
    last30Days: {
      present: presentCount,
      absent: items.filter((item) => item.status === "absent").length
    },
    items: items.map((item) => ({
      date: item.lessonDate,
      status: item.status
    }))
  };
}

export function getStudentPayments(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const items = db.prepare(`
    SELECT
      p.id,
      p.amount,
      p.method,
      p.status,
      p.created_at as createdAt,
      staff.full_name as receivedBy
    FROM payments p
    LEFT JOIN users staff ON staff.id = p.received_by_user_id
    WHERE p.student_id = ?
    ORDER BY datetime(p.created_at) DESC
  `).all(student.id);
  return {
    balance: student.balance,
    debt: Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0)),
    items
  };
}

export function getStudentSchedule(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const schedule = student.schedule || "";
  const dayMap = {
    du: "Dushanba",
    se: "Seshanba",
    chor: "Chorshanba",
    pay: "Payshanba",
    juma: "Juma",
    shan: "Shanba",
    yak: "Yakshanba"
  };
  const [daysPart = "", timePart = ""] = schedule.split(",");
  const dayKeys = daysPart.split("-").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const todayIndex = dayjs().day();
  const numericMap = { du: 1, se: 2, chor: 3, pay: 4, juma: 5, shan: 6, yak: 0 };
  return {
    courseTitle: student.courseTitle,
    teacherName: student.teacherName,
    items: dayKeys.map((key) => ({
      day: dayMap[key] || key,
      time: timePart.trim(),
      isToday: numericMap[key] === todayIndex
    }))
  };
}

export function getStudentProfilePanel(userId) {
  const profile = getStudentByUserId(userId);
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    phone: profile.phone
  };
}

export function changeStudentPassword(userId, passwordHash) {
  const student = getStudentByUserId(userId);
  if (!student) {
    throw new Error("Student topilmadi");
  }
  db.prepare(`
    UPDATE student_auth
    SET password_hash = ?, updated_at = ?
    WHERE student_id = ?
  `).run(passwordHash, dayjs().format("YYYY-MM-DD HH:mm:ss"), student.id);
}

export function listAttendanceHistory({ teacherId = null, studentId = null, range = "month" } = {}) {
  const values = [];
  let query = `
    SELECT
      a.id,
      a.lesson_date as lessonDate,
      a.status,
      s.id as studentId,
      u.full_name as studentName,
      c.title as courseTitle,
      t.full_name as teacherName
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = a.teacher_id
    WHERE 1 = 1
  `;

  if (teacherId) {
    query += ` AND a.teacher_id = ?`;
    values.push(teacherId);
  }
  if (studentId) {
    query += ` AND a.student_id = ?`;
    values.push(studentId);
  }

  if (range === "week") {
    query += ` AND date(a.lesson_date) >= date('now', '-7 day')`;
  } else if (range === "day") {
    query += ` AND date(a.lesson_date) = date('now')`;
  } else {
    query += ` AND date(a.lesson_date) >= date('now', '-30 day')`;
  }

  query += ` ORDER BY date(a.lesson_date) DESC, u.full_name ASC`;
  return db.prepare(query).all(...values);
}

export function getTeacherStudents(teacherId) {
  const students = listStudents({ teacherId });
  return students.map((student) => {
    const stats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount,
        COUNT(*) as totalCount
      FROM attendance
      WHERE student_id = ?
    `).get(student.id);

    return {
      ...student,
      attendancePercent: stats.totalCount
        ? Math.round((stats.presentCount / stats.totalCount) * 100)
        : 0
    };
  });
}

export function getDirectorStats() {
  const cards = db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')) as monthlyRevenue,
      (SELECT COUNT(*) FROM students) as totalStudents,
      (SELECT COUNT(*) FROM students WHERE status = 'debtor') as debtorsCount,
      (SELECT COUNT(*) FROM students WHERE status = 'trial' AND is_archived = 0) as trialStudentsCount
  `).get();

  const monthlyRevenue = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COALESCE(SUM(amount), 0) as revenue
    FROM payments
    WHERE status = 'paid'
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse().map((item) => ({
    period: item.period,
    label: dayjs(`${item.period}-01`).format("MMM"),
    revenue: Number(item.revenue || 0)
  }));

  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = dayjs().subtract(6 - index, "day");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid' AND date(created_at) = date(?)
    `).get(date.format("YYYY-MM-DD"));
    return {
      period: date.format("YYYY-MM-DD"),
      label: date.format("DD MMM"),
      startDate: date.format("YYYY-MM-DD"),
      endDate: date.format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const weeklyTrend = Array.from({ length: 8 }, (_, index) => {
    const weekStart = dayjs().startOf("week").add(1, "day").subtract(7 * (7 - index), "day");
    const weekEnd = weekStart.add(6, "day");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid'
        AND date(created_at) BETWEEN date(?) AND date(?)
    `).get(weekStart.format("YYYY-MM-DD"), weekEnd.format("YYYY-MM-DD"));
    return {
      period: `${weekStart.format("YYYY-MM-DD")}_${weekEnd.format("YYYY-MM-DD")}`,
      label: `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`,
      startDate: weekStart.format("YYYY-MM-DD"),
      endDate: weekEnd.format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = dayjs().startOf("month").subtract(5 - index, "month");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', ?)
    `).get(monthDate.format("YYYY-MM-DD"));
    return {
      period: monthDate.format("YYYY-MM"),
      label: monthDate.format("MMM"),
      startDate: monthDate.startOf("month").format("YYYY-MM-DD"),
      endDate: monthDate.endOf("month").format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const courseAnalysis = listAllCourses()
    .map((course) => {
      const studentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND is_archived = 0
      `).get(course.id).count;

      const groupsCount = db.prepare(`
        SELECT COUNT(DISTINCT teacher_id) as count
        FROM students
        WHERE course_id = ? AND is_archived = 0 AND teacher_id IS NOT NULL
      `).get(course.id).count;

      const revenue = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = ? AND p.status = 'paid'
      `).get(course.id).total;

      const activeCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'active' AND is_archived = 0
      `).get(course.id).count;

      const trialCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'trial' AND is_archived = 0
      `).get(course.id).count;

      const debtorsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'debtor' AND is_archived = 0
      `).get(course.id).count;

      return {
        id: course.id,
        title: course.title,
        studentsCount,
        groupsCount,
        revenue,
        activeCount,
        trialCount,
        debtorsCount,
        efficiency: studentsCount ? Math.min(97, 64 + studentsCount * 2 + activeCount) : 0
      };
    })
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const teacherPerformance = listTeachers()
    .map((teacher) => {
      const studentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND is_archived = 0
      `).get(teacher.id).count;

      const activeStudentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'active' AND is_archived = 0
      `).get(teacher.id).count;

      const trialStudentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'trial' AND is_archived = 0
      `).get(teacher.id).count;

      const debtorsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'debtor' AND is_archived = 0
      `).get(teacher.id).count;

      const attendance = db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount,
          COUNT(*) as totalCount
        FROM attendance
        WHERE teacher_id = ?
      `).get(teacher.id);

      const revenue = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = ? AND p.status = 'paid'
      `).get(teacher.id).total;

      return {
        id: teacher.id,
        fullName: teacher.fullName,
        courseIds: teacher.courseIds || [],
        studentsCount,
        activeStudentsCount,
        trialStudentsCount,
        debtorsCount,
        revenue,
        attendancePercent: attendance.totalCount
          ? Math.round((Number(attendance.presentCount || 0) / Number(attendance.totalCount || 1)) * 100)
          : 0
      };
    })
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const studentStatusBreakdown = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCount,
      SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trialCount,
      SUM(CASE WHEN status = 'debtor' THEN 1 ELSE 0 END) as debtorCount
    FROM students
    WHERE is_archived = 0
  `).get();

  const admissionsTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COUNT(*) as count
    FROM students
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse();

  return {
    cards,
    monthlyRevenue,
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend
    },
    courseAnalysis,
    teacherPerformance,
    studentStatusBreakdown,
    admissionsTrend
  };
}

export function createTelegramLinkCode(phone) {
  const student = getStudentByPhone(phone);
  if (!student) {
    return null;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(`
    INSERT INTO telegram_links (student_id, phone, code, used, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(student.id, phone, code, dayjs().format("YYYY-MM-DD HH:mm:ss"));

  return {
    studentId: student.id,
    code
  };
}

export function consumeTelegramCode(code, telegramId) {
  const link = db.prepare(`
    SELECT *
    FROM telegram_links
    WHERE code = ? AND used = 0
    ORDER BY id DESC
    LIMIT 1
  `).get(code);

  if (!link) {
    return null;
  }

  const student = db.prepare(`
    SELECT s.id, s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(link.student_id);

  db.prepare(`UPDATE telegram_links SET used = 1 WHERE id = ?`).run(link.id);
  db.prepare(`UPDATE users SET telegram_id = ? WHERE id = ?`).run(String(telegramId), student.userId);

  return student;
}

export function listDebtors() {
  return db.prepare(`
    SELECT
      s.id as studentId,
      u.phone,
      u.full_name as fullName,
      u.telegram_id as telegramId,
      c.title as courseTitle,
      c.schedule,
      t.full_name as teacherName,
      s.balance,
      c.monthly_fee as monthlyFee,
      s.last_payment_date as lastPaymentDate
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE s.status = 'debtor'
  `).all();
}

export function listUpcomingPayments(days = 3) {
  return db.prepare(`
    SELECT
      s.id as studentId,
      u.full_name as fullName,
      u.telegram_id as telegramId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      s.last_payment_date as lastPaymentDate
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.is_archived = 0
      AND u.telegram_id IS NOT NULL
      AND s.last_payment_date IS NOT NULL
      AND date(s.last_payment_date) <= date('now', ?)
  `).all(`-${27 - days} day`);
}

export function listStudentHistory(studentId) {
  return db.prepare(`
    SELECT
      sh.id,
      sh.action,
      sh.title,
      sh.details,
      sh.created_at as createdAt,
      u.full_name as actorName
    FROM student_history sh
    LEFT JOIN users u ON u.id = sh.actor_user_id
    WHERE sh.student_id = ?
    ORDER BY datetime(sh.created_at) DESC
  `).all(studentId);
}

export function listNotifications({ userId = null, role = null, unreadOnly = false } = {}) {
  const values = [];
  let query = `
    SELECT id, target_role as targetRole, target_user_id as targetUserId, type, title, message, metadata, status, created_at as createdAt, read_at as readAt
    FROM notifications
    WHERE 1 = 1
  `;
  if (userId) {
    query += ` AND (target_user_id = ? OR target_user_id IS NULL)`;
    values.push(userId);
  }
  if (role) {
    query += ` AND (target_role = ? OR target_role IS NULL)`;
    values.push(role);
  }
  if (unreadOnly) {
    query += ` AND status = 'unread'`;
  }
  query += ` ORDER BY datetime(created_at) DESC LIMIT 50`;
  return db.prepare(query).all(...values).map((item) => ({ ...item, metadata: safeJsonParse(item.metadata, null) }));
}

export function markNotificationRead(notificationId, userId = null) {
  const row = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(notificationId);
  if (!row) {
    return false;
  }
  if (row.target_user_id && userId && Number(row.target_user_id) !== Number(userId)) {
    return false;
  }
  db.prepare(`UPDATE notifications SET status = 'read', read_at = ? WHERE id = ?`).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), notificationId);
  return true;
}

export function getFinanceSummary() {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'paid' AND date(created_at) = date('now') THEN amount ELSE 0 END), 0) as todayRevenue,
      COALESCE(SUM(CASE WHEN status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as monthlyRevenue
    FROM payments
  `).get();

  const debtors = db.prepare(`
    SELECT COUNT(*) as debtorsCount, COALESCE(SUM(ABS(balance)), 0) as debtAmount
    FROM students
    WHERE status = 'debtor' AND is_archived = 0
  `).get();

  const byCourse = listAllCourses()
    .map((course) => ({
      title: course.title,
      revenue: db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = ? AND p.status = 'paid'
      `).get(course.id).total
    }))
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));

  const paymentMethods = db.prepare(`
    SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments
    WHERE status = 'paid'
    GROUP BY method
    ORDER BY amount DESC
  `).all();

  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as revenue
    FROM payments
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse();

  const topTeachers = listTeachers()
    .map((teacher) => ({
      id: teacher.id,
      fullName: teacher.fullName,
      revenue: db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = ? AND p.status = 'paid'
      `).get(teacher.id).total
    }))
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
    .slice(0, 5);

  return { totals, debtors, byCourse, paymentMethods, monthlyTrend, topTeachers };
}

export function getSettingsBundle() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = Object.fromEntries(rows.map((item) => [item.key, item.value]));
  return {
    settings,
    teachers: listTeachers(),
    courses: listAllCourses(),
    branches: listBranches()
  };
}

export function saveSettings(payload) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  Object.entries(payload).forEach(([key, value]) => stmt.run(key, String(value ?? ""), now));
}

export function updateUserProfile(userId, payload) {
  const current = db.prepare(`SELECT username, password_hash as passwordHash FROM users WHERE id = ?`).get(userId);
  const nextPasswordHash = payload.password ? payload.password : null;
  const nextProfileImage = persistProfileImage(payload.profileImage);
  db.prepare(`
    UPDATE users
    SET full_name = ?, username = ?, phone = COALESCE(?, phone), profile_image = ?
    WHERE id = ?
  `).run(payload.fullName, payload.username, payload.phone || null, nextProfileImage, userId);

  if (nextPasswordHash) {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(nextPasswordHash, userId);
  }

  return getUserProfileLite(userId);
}

export function getUserProfileLite(userId) {
  return db.prepare(`
    SELECT id, full_name as fullName, username, phone, role, telegram_id as telegramId, profile_image as profileImage
    FROM users
    WHERE id = ?
  `).get(userId);
}

export function createCourse(payload) {
  const id = db.prepare(`
    INSERT INTO courses (branch_id, title, monthly_fee, schedule, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, dayjs().format("YYYY-MM-DD HH:mm:ss")).lastInsertRowid;
  return id;
}

export function createTeacher(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const passwordHash = payload.passwordHash;
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  const teacherId = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, role, telegram_id, profile_image, created_at)
    VALUES (?, ?, ?, ?, 'teacher', NULL, ?, ?)
  `).run(payload.fullName, payload.username, passwordHash, payload.phone || null, nextProfileImage, now).lastInsertRowid;
  syncTeacherCourses(teacherId, payload.courseIds || []);
  return teacherId;
}

export function updateTeacher(teacherId, payload) {
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  db.prepare(`
    UPDATE users
    SET full_name = ?, username = ?, phone = ?, profile_image = ?
    WHERE id = ? AND role = 'teacher'
  `).run(payload.fullName, payload.username, payload.phone || null, nextProfileImage, teacherId);

  if (payload.passwordHash) {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ? AND role = 'teacher'`).run(payload.passwordHash, teacherId);
  }

  syncTeacherCourses(teacherId, payload.courseIds || []);
}

export function deleteTeacher(teacherId) {
  const assigned = db.prepare(`SELECT COUNT(*) as count FROM students WHERE teacher_id = ? AND is_archived = 0`).get(teacherId);
  if (assigned.count > 0) {
    return { blocked: true };
  }
  db.prepare(`DELETE FROM teacher_course_assignments WHERE teacher_id = ?`).run(teacherId);
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'teacher'`).run(teacherId);
  return { blocked: false };
}

export function updateCourse(courseId, payload) {
  db.prepare(`
    UPDATE courses
    SET branch_id = ?, title = ?, monthly_fee = ?, schedule = ?, is_active = ?
    WHERE id = ?
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, payload.isActive ? 1 : 0, courseId);
}

export function deleteCourse(courseId) {
  const used = db.prepare(`SELECT COUNT(*) as count FROM students WHERE course_id = ? AND is_archived = 0`).get(courseId);
  if (used.count > 0) {
    db.prepare(`UPDATE courses SET is_active = 0 WHERE id = ?`).run(courseId);
    return { softDeleted: true };
  }
  db.prepare(`DELETE FROM courses WHERE id = ?`).run(courseId);
  return { softDeleted: false };
}

export function buildStudentsCsv() {
  const students = listStudents({ includeArchived: true });
  return [
    "Ism,Telefon,Kurs,O'qituvchi,Balans,Status,Arxiv",
    ...students.map((student) =>
      [student.fullName, student.phone, student.courseTitle || "", student.teacherName || "", student.balance, student.status, student.isArchived ? "Ha" : "Yo'q"].join(",")
    )
  ].join("\n");
}

export function buildFinanceCsv() {
  const summary = getFinanceSummary();
  return [
    "Kategoriya,Qiymat",
    `Jami tushum,${summary.totals.totalRevenue}`,
    `Bugungi tushum,${summary.totals.todayRevenue}`,
    `Oylik tushum,${summary.totals.monthlyRevenue}`,
    `Qarzdorlar soni,${summary.debtors.debtorsCount}`,
    `Qarz summasi,${summary.debtors.debtAmount}`,
    "",
    "Kurs,Tushum",
    ...summary.byCourse.map((item) => `${item.title},${item.revenue}`)
  ].join("\n");
}

export function listDeveloperProfiles() {
  const rows = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE is_active = 1
    ORDER BY id ASC
  `).all();
  return rows.map(mapDeveloperRow);
}

export function getDeveloperProfileBySlug(slug) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE slug = ? AND is_active = 1
  `).get(slug);
  return mapDeveloperRow(row);
}

export function getDeveloperProfileByUsername(username) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      password_hash as passwordHash,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE username = ? AND is_active = 1
  `).get(username);
  return row ? { ...mapDeveloperRow(row), passwordHash: row.passwordHash } : null;
}

export function getDeveloperProfileById(id) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE id = ? AND is_active = 1
  `).get(id);
  return mapDeveloperRow(row);
}

export function updateDeveloperProfile(id, payload) {
  const current = getDeveloperProfileById(id);
  if (!current) {
    throw new Error("Dasturchi topilmadi");
  }

  if (payload.username && payload.username !== current.username) {
    const existing = db.prepare(`SELECT id FROM developer_profiles WHERE username = ? AND id != ?`).get(payload.username, id);
    if (existing) {
      throw new Error("Bu login band");
    }
  }

  const nextImage = payload.image ? persistProfileImage(payload.image) : current.image;
  const nextBannerImage = payload.bannerImage ? persistProfileImage(payload.bannerImage) : current.bannerImage;
  const nextCertificateImage = payload.certificateImage ? persistProfileImage(payload.certificateImage) : current.certificateImage;
  const nextPasswordHash = payload.passwordHash || null;

  db.prepare(`
    UPDATE developer_profiles
    SET
      full_name = ?,
      age = ?,
      role_title = ?,
      short_bio = ?,
      bio = ?,
      skills = ?,
      image = ?,
      banner_image = ?,
      certificate_image = ?,
      telegram_url = ?,
      instagram_url = ?,
      github_url = ?,
      website_url = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    payload.fullName,
    payload.age ? Number(payload.age) : null,
    payload.roleTitle,
    payload.shortBio || "",
    payload.bio || "",
    JSON.stringify(payload.skills || []),
    nextImage,
    nextBannerImage,
    nextCertificateImage,
    payload.telegramUrl || "",
    payload.instagramUrl || "",
    payload.githubUrl || "",
    payload.websiteUrl || "",
    dayjs().format("YYYY-MM-DD HH:mm:ss"),
    id
  );

  if (payload.username && payload.username !== current.username) {
    db.prepare(`UPDATE developer_profiles SET username = ? WHERE id = ?`).run(payload.username, id);
  }

  if (nextPasswordHash) {
    db.prepare(`UPDATE developer_profiles SET password_hash = ? WHERE id = ?`).run(nextPasswordHash, id);
  }

  return getDeveloperProfileById(id);
}

export function createContactRequest(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const id = db.prepare(`
    INSERT INTO contact_requests (full_name, phone, message, status, created_at)
    VALUES (?, ?, ?, 'new', ?)
  `).run(payload.fullName, payload.phone, payload.message, now).lastInsertRowid;

  createNotification({
    targetRole: "reception",
    type: "contact_request",
    title: "Yangi murojaat",
    message: `${payload.fullName} tomonidan yangi bog'lanish so'rovi yuborildi`,
    metadata: { contactRequestId: id, phone: payload.phone }
  });

  return id;
}

export function listContactRequests({ unreadOnly = false } = {}) {
  let query = `
    SELECT
      id,
      full_name as fullName,
      phone,
      message,
      status,
      created_at as createdAt,
      read_at as readAt
    FROM contact_requests
  `;

  const values = [];
  if (unreadOnly) {
    query += ` WHERE status = 'new'`;
  }

  query += ` ORDER BY datetime(created_at) DESC, id DESC`;
  return db.prepare(query).all(...values);
}

export function markContactRequestRead(id) {
  const result = db.prepare(`
    UPDATE contact_requests
    SET status = 'read', read_at = ?
    WHERE id = ?
  `).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), id);
  return result.changes > 0;
}
