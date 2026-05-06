import cron from "node-cron";
import dayjs from "dayjs";
import PDFDocument from "pdfkit";
import { Markup, Telegraf } from "telegraf";
import { config } from "./config.js";
import {
  getStudentAuthByPhone,
  getStudentByTelegramId,
  linkTelegramStudentByCredentials,
  listDebtors,
  listPendingTelegramNotifications,
  listUpcomingPayments,
  markNotificationDelivered
} from "./services.js";
import { signToken } from "./auth.js";

let bot = null;
const linkFlowState = new Map();

function buildStudentPortalLink(student, nextPath = "/student/dashboard") {
  const token = signToken({ id: student.userId, role: "student", fullName: student.fullName });
  const query = new URLSearchParams({ studentToken: token });
  if (nextPath) {
    query.set("next", nextPath);
  }
  return `${config.webUrl}/?${query.toString()}`;
}

function buildDefaultKeyboard() {
  return Markup.keyboard([
    ["📘 Kurs", "💰 Balans"],
    ["🗓 Jadval", "🔔 Bildirishnomalar"],
    ["🆘 Yordam"]
  ]).resize();
}

function buildStudentKeyboard(student) {
  return Markup.keyboard([
    ["📘 Kurs", "💰 Balans"],
    ["🗓 Jadval", "🔔 Bildirishnomalar"],
    [Markup.button.webApp("🌐 Web App", buildStudentPortalLink(student, "/student/profile"))],
    ["🆘 Yordam"]
  ]).resize();
}

function buildStudentInlineActions(student, options = {}) {
  const rows = [];

  if (options.payment) {
    rows.push([
      Markup.button.url("💳 To'lov qilish", buildStudentPortalLink(student, "/student/payments"))
    ]);
  }

  if (options.notifications || options.schedule) {
    const row = [];
    if (options.notifications) {
      row.push(
        Markup.button.url(
          "🔔 Bildirishnomalar",
          buildStudentPortalLink(student, "/student/notifications")
        )
      );
    }
    if (options.schedule) {
      row.push(
        Markup.button.url("🗓 Jadval", buildStudentPortalLink(student, "/student/schedule"))
      );
    }
    rows.push(row);
  }

  rows.push([Markup.button.url("🌐 Kabinet", buildStudentPortalLink(student, "/student/profile"))]);
  return Markup.inlineKeyboard(rows);
}

async function safeReply(ctx, message, markup = undefined) {
  try {
    await ctx.reply(message, markup);
  } catch {
    return null;
  }
}

async function safeReplyWithKeyboard(ctx, message, markup = buildDefaultKeyboard()) {
  return safeReply(ctx, message, markup);
}

async function safeReplyWithInline(ctx, message, markup) {
  return safeReply(ctx, message, markup);
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} so'm`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat("uz-UZ", { month: "long" }).format(new Date(value));
}

function buildNotificationCopy(item) {
  switch (item.type) {
    case "trial_ending":
      return {
        title: "⏳ Sinov muddati tugadi",
        body: `${item.message}\nIltimos, oylik to'lovni o'z vaqtida amalga oshiring.`
      };
    case "attendance_absent":
      return {
        title: "🚫 Davomat ogohlantirishi",
        body: `${item.message}\nKeyingi darslarda qatnashishingiz muhim.`
      };
    case "payment_received":
      return {
        title: "✅ To'lov qabul qilindi",
        body: item.message
      };
    default:
      return {
        title: item.title,
        body: item.message
      };
  }
}

function buildPaymentReceiptPdf(receipt) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [420, 620],
      margin: 0
    });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, 420, 620).fill("#f6f8ff");
    doc.roundedRect(24, 24, 372, 572, 24).fill("#ffffff");
    doc.roundedRect(24, 24, 372, 116, 24).fill("#183b84");
    doc.fillColor("#dbe6ff").fontSize(12).font("Helvetica-Bold").text("INTELLIGENT EDUCATION", 48, 52);
    doc.fillColor("#ffffff").fontSize(28).font("Helvetica-Bold").text("TO'LOV CHEKI", 48, 76);
    doc.fillColor("#c7d7ff").fontSize(11).font("Helvetica").text(formatDateTime(receipt.paidAt), 48, 112);

    doc.fillColor("#6b7a97").fontSize(11).font("Helvetica-Bold").text("TO'LOVCHI", 48, 170);
    doc.fillColor("#12213f").fontSize(22).font("Helvetica-Bold").text(receipt.fullName || "-", 48, 188);
    doc.fillColor("#4b5975").fontSize(12).font("Helvetica").text(receipt.phone || "-", 48, 218);

    doc.fillColor("#6b7a97").fontSize(11).font("Helvetica-Bold").text("YO'NALISH", 48, 262);
    doc.fillColor("#12213f").fontSize(16).font("Helvetica-Bold").text(receipt.courseTitle || "Kurs biriktirilmagan", 48, 280);

    doc.roundedRect(48, 332, 324, 96, 18).fill("#eef3ff");
    doc.fillColor("#66789a").fontSize(11).font("Helvetica-Bold").text("TO'LANGAN SUMMA", 72, 356);
    doc.fillColor("#183b84").fontSize(30).font("Helvetica-Bold").text(formatMoney(receipt.amount), 72, 378);

    doc.fillColor("#6b7a97").fontSize(11).font("Helvetica-Bold").text("TO'LOV USULI", 48, 464);
    doc.fillColor("#12213f").fontSize(15).font("Helvetica-Bold").text(receipt.method || "manual", 48, 482);

    doc.fillColor("#6b7a97").fontSize(11).font("Helvetica-Bold").text("IZOH", 48, 522);
    doc.fillColor("#42516e").fontSize(12).font("Helvetica").text(
      `${formatMonthLabel(receipt.paidAt)} oylik to'lovi qabul qilindi.`,
      48,
      540,
      { width: 300 }
    );

    doc.end();
  });
}

function getLinkState(telegramId) {
  return linkFlowState.get(String(telegramId)) || null;
}

function setLinkState(telegramId, payload) {
  linkFlowState.set(String(telegramId), payload);
}

function clearLinkState(telegramId) {
  linkFlowState.delete(String(telegramId));
}

async function ensureLinkedStudent(ctx) {
  const student = getStudentByTelegramId(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "🔐 Akkaunt bog'lanmagan. Telefon raqamingizni +998901234567 formatida yuboring.");
    return null;
  }
  return student;
}

async function sendStudentSummary(ctx, student) {
  await safeReplyWithKeyboard(
    ctx,
    `📘 Kurs: ${student.courseTitle || "Biriktirilmagan"}\n👨‍🏫 Ustoz: ${student.teacherName || "Biriktirilmagan"}\n🗓 Dars vaqti: ${student.schedule || "Biriktirilmagan"}`,
    buildStudentKeyboard(student)
  );
}

export async function sendTelegramCodeToStudent(telegramId, code, expiresAt) {
  if (!bot || !telegramId) return false;
  try {
    await bot.telegram.sendMessage(
      telegramId,
      `🔐 Tasdiqlash kodi: ${code}\n🕒 Amal qilish muddati: ${dayjs(expiresAt).format("HH:mm")}\n\nKod 5 daqiqa ichida ishlaydi.`
    );
    return true;
  } catch {
    return false;
  }
}

export async function sendTelegramPaymentReceipt(receipt) {
  if (!bot || !receipt?.telegramId) return false;
  try {
    const buffer = await buildPaymentReceiptPdf(receipt);
    await bot.telegram.sendDocument(
      receipt.telegramId,
      {
        source: buffer,
        filename: `receipt-${receipt.id}.pdf`
      },
      {
        caption: `🧾 ${formatMonthLabel(receipt.paidAt)} oylik to'lovi to'landi\n👤 ${receipt.fullName}\n💰 ${formatMoney(receipt.amount)}`
      }
    );
    return true;
  } catch {
    return false;
  }
}

export function startBot() {
  if (!config.telegramBotToken) {
    return null;
  }

  bot = new Telegraf(config.telegramBotToken);

  bot.start(async (ctx) => {
    clearLinkState(ctx.from.id);
    const linkedStudent = getStudentByTelegramId(ctx.from.id);

    if (linkedStudent) {
      await safeReplyWithKeyboard(
        ctx,
        `👋 Assalomu alaykum. Sizning akkauntingiz ${linkedStudent.fullName} bilan bog'langan.\n\nBu bot orqali siz to'lov, qarzdorlik va sinov muddati bo'yicha ogohlantirishlarni olasiz.\nAgar boshqa student akkauntini ulashni istasangiz, yangi telefon raqam yuboring.`,
        buildStudentKeyboard(linkedStudent)
      );
      await safeReplyWithInline(
        ctx,
        "Tezkor havolalar:",
        buildStudentInlineActions(linkedStudent, {
          payment: true,
          notifications: true,
          schedule: true
        })
      );
      return;
    }

    await safeReplyWithKeyboard(
      ctx,
      "👋 Assalomu alaykum. Intelligent botiga xush kelibsiz.\n\nBu bot orqali student akkauntingizga bog'lanib, to'lov va muhim ogohlantirishlarni olasiz.\n📱 Telefon raqamingizni +998901234567 formatida yuboring."
    );
  });

  bot.hears(/^\+998\d{9}$/, async (ctx) => {
    const phone = ctx.message.text.trim();
    const normalizedPhone = phone.replace(/\s+/g, "");
    const auth = getStudentAuthByPhone(normalizedPhone);

    if (!auth) {
      await safeReply(ctx, "❌ Bu raqam bo'yicha ro'yxatdan o'tgan student topilmadi. Avval saytda registratsiyani yakunlang.");
      return;
    }

    setLinkState(ctx.from.id, {
      step: "awaiting_password",
      phone: normalizedPhone,
      startedAt: dayjs().valueOf()
    });

    await safeReply(ctx, "📲 Telefon qabul qilindi. Endi saytda student sifatida kiradigan parolingizni yozing.");
  });

  bot.on("text", async (ctx, next) => {
    const message = ctx.message?.text?.trim() || "";
    if (!message || message.startsWith("/")) {
      return next();
    }

    const state = getLinkState(ctx.from.id);
    if (!state || state.step !== "awaiting_password") {
      return next();
    }

    const startedAt = state.startedAt ? dayjs(state.startedAt) : null;
    if (startedAt && dayjs().diff(startedAt, "minute") >= 10) {
      clearLinkState(ctx.from.id);
      await safeReply(ctx, "⌛ Bog'lash sessiyasi tugadi. Qaytadan /start bosing va telefon raqamingizni yuboring.");
      return;
    }

    const student = linkTelegramStudentByCredentials({
      phone: state.phone,
      password: message,
      telegramId: ctx.from.id
    });

    if (!student) {
      await safeReply(ctx, "❌ Parol noto'g'ri yoki bu telefon bo'yicha student topilmadi. Qaytadan urinib ko'ring.");
      return;
    }

    clearLinkState(ctx.from.id);
    await safeReplyWithKeyboard(
      ctx,
      `✅ Bog'lash muvaffaqiyatli. Telegram akkauntingiz ${student.fullName} student akkaunti bilan ulandi.\n\nEndi siz to'lov, qarzdorlik va sinov muddati bo'yicha ogohlantirishlarni shu yerda olasiz.`,
      buildStudentKeyboard(student)
    );
    await safeReplyWithInline(
      ctx,
      "Tezkor havolalar:",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true,
        schedule: true
      })
    );
  });

  bot.command("kurs", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await sendStudentSummary(ctx, student);
  });

  bot.command("balans", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `💰 Balans: ${formatMoney(student.balance)}\n📌 Status: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}`,
      buildStudentInlineActions(student, { payment: true })
    );
  });

  bot.command("tolov", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `💳 Oylik to'lov: ${formatMoney(student.monthlyFee)}\n🧾 Oxirgi to'lov: ${student.lastPaymentDate || "-"}\n💰 Balans: ${formatMoney(student.balance)}`,
      buildStudentInlineActions(student, { payment: true })
    );
  });

  bot.command("jadval", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `🗓 Haftalik jadval: ${student.schedule || "-"}`,
      buildStudentInlineActions(student, { schedule: true })
    );
  });

  bot.command("status", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithKeyboard(
      ctx,
      `📌 Holat: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}\n📘 Kurs: ${student.courseTitle || "-"}`,
      buildStudentKeyboard(student)
    );
  });

  bot.command("bildirishnomalar", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "🔔 Student bildirishnomalarini kabinet ichida ko'rishingiz mumkin.",
      buildStudentInlineActions(student, { notifications: true })
    );
  });

  bot.command("kabinet", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "🌐 Student kabinet uchun maxsus havola tayyor.",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true,
        schedule: true
      })
    );
  });

  bot.command("yordam", async (ctx) => {
    await safeReplyWithKeyboard(
      ctx,
      "🆘 Buyruqlar:\n/kurs\n/balans\n/tolov\n/jadval\n/status\n/bildirishnomalar\n/kabinet"
    );
  });

  bot.hears(["Kurs", "📘 Kurs"], async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await sendStudentSummary(ctx, student);
  });

  bot.hears(["Balans", "💰 Balans"], async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `💰 Balans: ${formatMoney(student.balance)}\n📌 Status: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}`,
      buildStudentInlineActions(student, { payment: true })
    );
  });

  bot.hears(["Jadval", "🗓 Jadval"], async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `🗓 Haftalik jadval: ${student.schedule || "-"}`,
      buildStudentInlineActions(student, { schedule: true })
    );
  });

  bot.hears(["Bildirishnomalar", "🔔 Bildirishnomalar"], async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "🔔 Student bildirishnomalarini kabinet ichida ko'rishingiz mumkin.",
      buildStudentInlineActions(student, { notifications: true })
    );
  });

  bot.hears(["Kabinet", "🌐 Web App"], async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "🌐 Student kabinet uchun maxsus havola tayyor.",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true,
        schedule: true
      })
    );
  });

  bot.hears(["Yordam", "🆘 Yordam"], async (ctx) => {
    await safeReplyWithKeyboard(
      ctx,
      "🆘 Buyruqlar:\n/kurs\n/balans\n/tolov\n/jadval\n/status\n/bildirishnomalar\n/kabinet"
    );
  });

  bot.launch();

  cron.schedule("0 9 * * *", async () => {
    if (!bot) return;

    const debtors = listDebtors().filter((item) => item.telegramId);
    for (const debtor of debtors) {
      await bot.telegram.sendMessage(
        debtor.telegramId,
        `⚠️ Qarzdorlik eslatmasi\n\n👤 ${debtor.fullName}\n📘 Kurs: ${debtor.courseTitle || "Biriktirilmagan"}\n💰 Joriy balans: ${formatMoney(debtor.balance)}\n💳 Oylik to'lov: ${formatMoney(debtor.monthlyFee)}\n\nIltimos, qarzingizni imkon qadar tezroq to'lang.`
      ).catch(() => null);
    }

    const upcoming = listUpcomingPayments(3);
    for (const item of upcoming) {
      await bot.telegram.sendMessage(
        item.telegramId,
        `⏰ To'lov muddati yaqinlashdi\n\n👤 ${item.fullName}\n📘 Kurs: ${item.courseTitle || "Biriktirilmagan"}\n📅 To'lov muddati: ${item.paymentDueDate || "-"}\n💳 Oylik summa: ${formatMoney(item.monthlyFee)}`
      ).catch(() => null);
    }

    const pending = listPendingTelegramNotifications();
    for (const item of pending) {
      const copy = buildNotificationCopy(item);
      const sent = await bot.telegram.sendMessage(
        item.telegramId,
        `${copy.title}\n\n${copy.body}`
      ).then(() => true).catch(() => false);

      if (sent) {
        markNotificationDelivered(item.id);
      }
    }
  });

  return bot;
}
