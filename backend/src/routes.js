import express from "express";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { authenticate, authorize, comparePassword, getUserProfile, signToken } from "./auth.js";
import { config } from "./config.js";
import { buildDirectorPdfReport, buildDirectorWorkbook } from "./reports.js";
import {
  addStudent,
  archiveStudent,
  buildFinanceCsv,
  buildStudentsCsv,
  changeStudentPassword,
  createContactRequest,
  createCourse,
  createStudentRegistrationToken,
  createTeacher,
  createTelegramLinkCode,
  deleteCourse,
  deleteStudent,
  deleteTeacher,
  getDeveloperProfileById,
  getDeveloperProfileBySlug,
  getDeveloperProfileByUsername,
  getDirectorStats,
  getFinanceSummary,
  getSettingsBundle,
  getStudentAttendance,
  getStudentDashboard,
  getStudentPayments,
  getStudentProfilePanel,
  getStudentByPhone,
  getStudentSchedule,
  getStudentAuthByPhone,
  getTeacherStudents,
  listAllCourses,
  listAllPayments,
  listAttendanceHistory,
  listBranches,
  listContactRequests,
  listCourses,
  listDeveloperProfiles,
  listNotifications,
  listStudentHistory,
  listStudents,
  listTeachers,
  markContactRequestRead,
  markNotificationRead,
  recordPayment,
  registerStudentByToken,
  saveSettings,
  updateCourse,
  updateDeveloperProfile,
  updateStudent,
  updateTeacher,
  updateUserProfile,
  validateStudentRegistrationToken,
  upsertAttendance
} from "./services.js";
import { getDb } from "./db.js";

const router = express.Router();
const db = getDb();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/public/app-config", (_req, res) => {
  res.json({
    telegramBotUsername: config.telegramBotUsername || "",
    webUrl: config.webUrl
  });
});

router.post("/public/contact-requests", (req, res) => {
  const { fullName, phone, message } = req.body;
  if (!fullName || !phone || !message) {
    return res.status(400).json({ message: "Ism, telefon va xabar majburiy" });
  }
  const id = createContactRequest({ fullName, phone, message });
  res.status(201).json({ id, message: "Murojaat qabul qilindi" });
});

router.get("/public/developers", (_req, res) => {
  res.json(listDeveloperProfiles());
});

router.get("/public/developers/:slug", (req, res) => {
  const developer = getDeveloperProfileBySlug(req.params.slug);
  if (!developer) {
    return res.status(404).json({ message: "Dasturchi topilmadi" });
  }
  res.json(developer);
});

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare(`
    SELECT id, full_name as fullName, username, password_hash as passwordHash, role
    FROM users
    WHERE username = ?
  `).get(username);

  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
  }

  const token = signToken({ id: user.id, role: user.role, fullName: user.fullName });
  res.json({ token, user: getUserProfile(user.id) });
});

router.post("/developers/auth/login", (req, res) => {
  const { username, password } = req.body;
  const developer = getDeveloperProfileByUsername(username);

  if (!developer || !comparePassword(password, developer.passwordHash)) {
    return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
  }

  const token = signToken({
    id: developer.id,
    role: "developer_portfolio",
    fullName: developer.fullName,
    slug: developer.slug
  });

  res.json({
    token,
    developer: getDeveloperProfileById(developer.id)
  });
});

router.get("/student-auth/register/validate", (req, res) => {
  try {
    res.json(validateStudentRegistrationToken(req.query.token));
  } catch (error) {
    res.status(400).json({ message: error.message || "Token yaroqsiz" });
  }
});

router.post("/student-auth/register", (req, res) => {
  try {
    const { token, phone, password } = req.body;
    if (!token || !phone || !password) {
      return res.status(400).json({ message: "Token, telefon va parol majburiy" });
    }
    registerStudentByToken({
      token,
      phone,
      passwordHash: bcrypt.hashSync(password, 10)
    });
    res.json({ message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi" });
  } catch (error) {
    res.status(400).json({ message: error.message || "Ro'yxatdan o'tib bo'lmadi" });
  }
});

router.post("/student-auth/login", (req, res) => {
  const { phone, password } = req.body;
  const auth = getStudentAuthByPhone(phone);
  if (!auth || !comparePassword(password, auth.passwordHash)) {
    return res.status(401).json({ message: "Telefon yoki parol noto'g'ri" });
  }
  const user = getUserProfile(auth.userId);
  const token = signToken({ id: user.id, role: "student", fullName: user.fullName });
  res.json({ token, user });
});

router.post("/auth/telegram/request", (req, res) => {
  const { phone } = req.body;
  const data = createTelegramLinkCode(phone);

  if (!data) {
    return res.status(404).json({ message: "Student topilmadi" });
  }

  res.json({
    message: "Tasdiqlash kodi yaratildi. Kod bot orqali studentga yuboriladi.",
    demoCode: data.code
  });
});

router.post("/auth/telegram/verify", (req, res) => {
  const { code } = req.body;
  const link = db.prepare(`
    SELECT s.user_id as userId, u.full_name as fullName
    FROM telegram_links tl
    JOIN students s ON s.id = tl.student_id
    JOIN users u ON u.id = s.user_id
    WHERE tl.code = ? AND tl.used = 0
    ORDER BY tl.id DESC
    LIMIT 1
  `).get(code);

  if (!link) {
    return res.status(404).json({ message: "Kod noto'g'ri yoki eskirgan" });
  }

  db.prepare(`UPDATE telegram_links SET used = 1 WHERE code = ?`).run(code);
  const token = signToken({ id: link.userId, role: "student", fullName: link.fullName });
  res.json({ token, user: getUserProfile(link.userId) });
});

router.get("/meta", authenticate, (req, res) => {
  const unreadCount = listNotifications({ userId: req.user.id, role: req.user.role, unreadOnly: true }).length;
  res.json({
    user: getUserProfile(req.user.id),
    teachers: listTeachers(),
    courses: req.user.role === "director" ? listAllCourses() : listCourses(),
    branches: listBranches(),
    unreadNotifications: unreadCount,
    unreadContactRequests:
      req.user.role === "reception" || req.user.role === "director"
        ? listContactRequests({ unreadOnly: true }).length
        : 0
  });
});

router.get("/profile", authenticate, (req, res) => {
  res.json(getUserProfile(req.user.id));
});

router.put("/profile", authenticate, (req, res) => {
  const current = db.prepare(`SELECT username FROM users WHERE id = ?`).get(req.user.id);
  if (req.body.username && req.body.username !== current?.username) {
    const exists = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(req.body.username, req.user.id);
    if (exists) {
      return res.status(409).json({ message: "Bu username band" });
    }
  }

  const profile = updateUserProfile(req.user.id, {
    fullName: req.body.fullName,
    username: req.body.username,
    phone: req.body.phone,
    profileImage: req.body.profileImage,
    password: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
  });
  res.json(profile);
});

router.get("/reception/students", authenticate, authorize("reception", "director"), (req, res) => {
  const search = req.query.search || "";
  const status = req.query.status || "";
  const includeArchived = req.query.includeArchived === "1";
  res.json(listStudents({ search, status, includeArchived }));
});

router.post("/reception/students", authenticate, authorize("reception", "director"), (req, res) => {
  try {
    const body = req.body;
    const course = listAllCourses().find((item) => item.id === Number(body.courseId));
    const studentId = addStudent({
      ...body,
      courseId: Number(body.courseId),
      teacherId: Number(body.teacherId),
      monthlyFee: course?.monthlyFee || 0
    }, req.user.id);
    res.status(201).json({ studentId });
  } catch (error) {
    res.status(400).json({ message: error.message || "Student qo'shilmadi" });
  }
});

router.put("/reception/students/:id", authenticate, authorize("reception", "director"), (req, res) => {
  try {
    updateStudent(Number(req.params.id), {
      ...req.body,
      courseId: Number(req.body.courseId),
      teacherId: Number(req.body.teacherId),
      balance: Number(req.body.balance || 0)
    }, req.user.id);
    res.json({ message: "Student yangilandi" });
  } catch (error) {
    res.status(400).json({ message: error.message || "Student yangilanmadi" });
  }
});

router.post("/reception/students/:id/archive", authenticate, authorize("reception", "director"), (req, res) => {
  const archived = archiveStudent(Number(req.params.id), req.user.id);
  if (!archived) {
    return res.status(404).json({ message: "Student topilmadi" });
  }
  res.json({ message: "Student arxivlandi" });
});

router.get("/reception/students/:id/history", authenticate, authorize("reception", "director"), (req, res) => {
  res.json(listStudentHistory(Number(req.params.id)));
});

router.post("/reception/students/:id/register-token", authenticate, authorize("reception", "director"), (req, res) => {
  try {
    const data = createStudentRegistrationToken(Number(req.params.id), Number(req.body.expiresInSeconds || 90));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message || "QR token yaratilmadi" });
  }
});

router.delete("/reception/students/:id", authenticate, authorize("reception", "director"), (req, res) => {
  const deleted = deleteStudent(Number(req.params.id));
  if (!deleted) {
    return res.status(404).json({ message: "Student topilmadi" });
  }
  res.json({ message: "Student o'chirildi" });
});

router.post("/reception/payments", authenticate, authorize("reception", "director"), (req, res) => {
  const { studentId, amount, method } = req.body;
  const receipt = recordPayment(Number(studentId), Number(amount), method, "paid", null, req.user.id);
  res.json({ message: "To'lov saqlandi", receipt });
});

router.get("/reception/payments", authenticate, authorize("reception", "director"), (_req, res) => {
  res.json(listAllPayments());
});

router.get("/reception/contact-requests", authenticate, authorize("reception", "director"), (_req, res) => {
  res.json(listContactRequests());
});

router.post("/reception/contact-requests/:id/read", authenticate, authorize("reception", "director"), (req, res) => {
  const ok = markContactRequestRead(Number(req.params.id));
  if (!ok) {
    return res.status(404).json({ message: "Murojaat topilmadi" });
  }
  res.json({ ok: true });
});

router.post("/payments/webhook", (req, res) => {
  const { phone, amount, provider, transactionId } = req.body;
  const student = getStudentByPhone(phone);

  if (!student) {
    return res.status(404).json({ message: "Student topilmadi" });
  }

  recordPayment(student.id, Number(amount), provider, "paid", transactionId);
  res.json({ message: "Webhook qabul qilindi" });
});

router.get("/teacher/students", authenticate, authorize("teacher"), (req, res) => {
  res.json(getTeacherStudents(req.user.id));
});

router.get("/teacher/attendance/history", authenticate, authorize("teacher"), (req, res) => {
  res.json(listAttendanceHistory({ teacherId: req.user.id, range: req.query.range || "month" }));
});

router.post("/teacher/attendance", authenticate, authorize("teacher"), (req, res) => {
  const { studentId, status, lessonDate } = req.body;
  upsertAttendance({
    studentId: Number(studentId),
    teacherId: req.user.id,
    lessonDate: lessonDate || dayjs().format("YYYY-MM-DD"),
    status
  });
  res.json({ message: "Davomat saqlandi" });
});

router.get("/director/overview", authenticate, authorize("director"), (_req, res) => {
  res.json(getDirectorStats());
});

router.get("/director/finance", authenticate, authorize("director"), (_req, res) => {
  res.json(getFinanceSummary());
});

router.get("/director/courses", authenticate, authorize("director"), (_req, res) => {
  res.json(listAllCourses());
});

router.post("/director/teachers", authenticate, authorize("director"), (req, res) => {
  try {
    const teacherId = createTeacher({
      fullName: req.body.fullName,
      username: req.body.username,
      phone: req.body.phone,
      profileImage: req.body.profileImage,
      courseIds: Array.isArray(req.body.courseIds) ? req.body.courseIds.map(Number) : [],
      passwordHash: bcrypt.hashSync(req.body.password || "12345678", 10)
    });
    res.status(201).json({ teacherId });
  } catch (error) {
    res.status(400).json({ message: error.message || "O'qituvchi qo'shilmadi" });
  }
});

router.put("/director/teachers/:id", authenticate, authorize("director"), (req, res) => {
  try {
    updateTeacher(Number(req.params.id), {
      fullName: req.body.fullName,
      username: req.body.username,
      phone: req.body.phone,
      profileImage: req.body.profileImage,
      courseIds: Array.isArray(req.body.courseIds) ? req.body.courseIds.map(Number) : [],
      passwordHash: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
    });
    res.json({ message: "O'qituvchi yangilandi" });
  } catch (error) {
    res.status(400).json({ message: error.message || "O'qituvchi yangilanmadi" });
  }
});

router.delete("/director/teachers/:id", authenticate, authorize("director"), (req, res) => {
  res.json(deleteTeacher(Number(req.params.id)));
});

router.post("/director/courses", authenticate, authorize("director"), (req, res) => {
  const courseId = createCourse({
    title: req.body.title,
    monthlyFee: Number(req.body.monthlyFee || 0),
    schedule: req.body.schedule
  });
  res.status(201).json({ courseId });
});

router.put("/director/courses/:id", authenticate, authorize("director"), (req, res) => {
  updateCourse(Number(req.params.id), {
    title: req.body.title,
    monthlyFee: Number(req.body.monthlyFee || 0),
    schedule: req.body.schedule,
    isActive: req.body.isActive !== false
  });
  res.json({ message: "Kurs yangilandi" });
});

router.delete("/director/courses/:id", authenticate, authorize("director"), (req, res) => {
  const result = deleteCourse(Number(req.params.id));
  res.json(result);
});

router.get("/director/reports/export", authenticate, authorize("director"), (req, res) => {
  const type = req.query.type || "overview";
  const format = req.query.format || "xlsx";
  const reportFilters = {
    period: req.query.period || "",
    from: req.query.from || "",
    to: req.query.to || ""
  };

  if (format === "csv") {
    const content = type === "finance" ? buildFinanceCsv() : buildStudentsCsv();
    const fileName = type === "finance" ? "finance-report.csv" : "students-report.csv";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    return res.send(content);
  }

  if (format === "pdf") {
    buildDirectorPdfReport(reportFilters).then((buffer) => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=intelligent-report.pdf");
      res.send(buffer);
    }).catch((error) => {
      res.status(500).json({ message: error.message || "PDF report yaratilmadi" });
    });
    return;
  }

  buildDirectorWorkbook(reportFilters).then((buffer) => {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=intelligent-report.xlsx");
    res.send(Buffer.from(buffer));
  }).catch((error) => {
    res.status(500).json({ message: error.message || "Excel report yaratilmadi" });
  });
});

router.get("/director/reports/print", authenticate, authorize("director"), (_req, res) => {
  const finance = getFinanceSummary();
  const students = listStudents({ includeArchived: true });
  const html = `
    <html><head><meta charset="utf-8"><title>Intelligent Report</title></head>
    <body style="font-family: Inter, Arial; padding: 24px;">
      <h1>Intelligent Hisobot</h1>
      <h2>Moliyaviy ko'rsatkichlar</h2>
      <p>Jami tushum: ${finance.totals.totalRevenue}</p>
      <p>Bugungi tushum: ${finance.totals.todayRevenue}</p>
      <p>Oylik tushum: ${finance.totals.monthlyRevenue}</p>
      <h2>O'quvchilar</h2>
      <table border="1" cellspacing="0" cellpadding="8">
        <tr><th>Ism</th><th>Telefon</th><th>Kurs</th><th>Balans</th><th>Status</th></tr>
        ${students.map((student) => `<tr><td>${student.fullName}</td><td>${student.phone}</td><td>${student.courseTitle || ""}</td><td>${student.balance}</td><td>${student.status}</td></tr>`).join("")}
      </table>
    </body></html>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

router.get("/notifications", authenticate, (req, res) => {
  res.json(listNotifications({ userId: req.user.id, role: req.user.role }));
});

router.post("/notifications/:id/read", authenticate, (req, res) => {
  const ok = markNotificationRead(Number(req.params.id), req.user.id);
  if (!ok) {
    return res.status(404).json({ message: "Notification topilmadi" });
  }
  res.json({ message: "Notification o'qildi" });
});

router.get("/settings", authenticate, authorize("director", "reception"), (_req, res) => {
  res.json(getSettingsBundle());
});

router.put("/settings", authenticate, authorize("director"), (req, res) => {
  saveSettings(req.body);
  res.json({ message: "Sozlamalar saqlandi" });
});

router.get("/student/me", authenticate, authorize("student"), (req, res) => {
  const dashboard = getStudentDashboard(req.user.id);
  const payments = getStudentPayments(req.user.id);
  if (!dashboard || !payments) {
    return res.status(404).json({ message: "Student topilmadi" });
  }
  res.json({
    profile: {
      ...dashboard,
      schedule: getStudentSchedule(req.user.id)?.items?.map((item) => `${item.day} ${item.time}`).join(", ") || ""
    },
    payments: payments.items.slice(0, 5)
  });
});

router.get("/student/me/dashboard", authenticate, authorize("student"), (req, res) => {
  const data = getStudentDashboard(req.user.id);
  if (!data) {
    return res.status(404).json({ message: "Student topilmadi" });
  }
  res.json(data);
});

router.get("/student/me/attendance", authenticate, authorize("student"), (req, res) => {
  const data = getStudentAttendance(req.user.id);
  if (!data) {
    return res.status(404).json({ message: "Davomat topilmadi" });
  }
  res.json(data);
});

router.get("/student/me/payments", authenticate, authorize("student"), (req, res) => {
  const data = getStudentPayments(req.user.id);
  if (!data) {
    return res.status(404).json({ message: "To'lovlar topilmadi" });
  }
  res.json(data);
});

router.get("/student/me/schedule", authenticate, authorize("student"), (req, res) => {
  const data = getStudentSchedule(req.user.id);
  if (!data) {
    return res.status(404).json({ message: "Jadval topilmadi" });
  }
  res.json(data);
});

router.get("/student/me/notifications", authenticate, authorize("student"), (req, res) => {
  res.json(listNotifications({ userId: req.user.id, role: "student" }));
});

router.get("/student/me/profile", authenticate, authorize("student"), (req, res) => {
  const data = getStudentProfilePanel(req.user.id);
  if (!data) {
    return res.status(404).json({ message: "Profil topilmadi" });
  }
  res.json(data);
});

router.put("/student/me/profile/password", authenticate, authorize("student"), (req, res) => {
  if (!req.body.password) {
    return res.status(400).json({ message: "Yangi parol majburiy" });
  }
  try {
    changeStudentPassword(req.user.id, bcrypt.hashSync(req.body.password, 10));
    res.json({ message: "Parol yangilandi" });
  } catch (error) {
    res.status(400).json({ message: error.message || "Parol yangilanmadi" });
  }
});

router.get("/developers/me", authenticate, authorize("developer_portfolio"), (req, res) => {
  const developer = getDeveloperProfileById(req.user.id);
  if (!developer) {
    return res.status(404).json({ message: "Dasturchi topilmadi" });
  }
  res.json(developer);
});

router.put("/developers/me", authenticate, authorize("developer_portfolio"), (req, res) => {
  try {
    const developer = updateDeveloperProfile(req.user.id, {
      username: req.body.username,
      fullName: req.body.fullName,
      age: req.body.age,
      roleTitle: req.body.roleTitle,
      shortBio: req.body.shortBio,
      bio: req.body.bio,
      skills: req.body.skills,
      image: req.body.image,
      bannerImage: req.body.bannerImage,
      certificateImage: req.body.certificateImage,
      telegramUrl: req.body.telegramUrl,
      instagramUrl: req.body.instagramUrl,
      githubUrl: req.body.githubUrl,
      websiteUrl: req.body.websiteUrl,
      passwordHash: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
    });
    res.json(developer);
  } catch (error) {
    res.status(400).json({ message: error.message || "Dasturchi profili yangilanmadi" });
  }
});

export default router;
