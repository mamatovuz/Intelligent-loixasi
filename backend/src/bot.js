import cron from "node-cron";
import dayjs from "dayjs";
import { Markup, Telegraf } from "telegraf";
import { config } from "./config.js";
import {
  consumeTelegramCode,
  createTelegramLinkCode,
  getStudentByTelegramId,
  listDebtors,
  listPendingTelegramNotifications,
  listUpcomingPayments,
  markNotificationDelivered
} from "./services.js";
import { signToken } from "./auth.js";

let bot = null;

const studentKeyboard = Markup.keyboard([
  ["Kurs", "Balans"],
  ["Jadval", "Bildirishnomalar"],
  ["Kabinet", "Yordam"]
]).resize();

async function safeReply(ctx, message) {
  try {
    await ctx.reply(message);
  } catch {
    return null;
  }
}

async function safeReplyWithKeyboard(ctx, message) {
  try {
    await ctx.reply(message, studentKeyboard);
  } catch {
    return null;
  }
}

async function safeReplyWithInline(ctx, message, markup) {
  try {
    await ctx.reply(message, markup);
  } catch {
    return null;
  }
}

function buildStudentPortalLink(student, nextPath = "/student/dashboard") {
  const token = signToken({ id: student.userId, role: "student", fullName: student.fullName });
  const query = new URLSearchParams({ studentToken: token });
  if (nextPath && nextPath !== "/student/dashboard") {
    query.set("next", nextPath);
  }
  return `${config.webUrl}/?${query.toString()}`;
}

function buildStudentInlineActions(student, options = {}) {
  const rows = [];

  if (options.payment) {
    rows.push([
      Markup.button.url("To'lov qilish", buildStudentPortalLink(student, "/student/payments"))
    ]);
  }

  if (options.notifications || options.schedule) {
    const row = [];
    if (options.notifications) {
      row.push(
        Markup.button.url(
          "Bildirishnomalar",
          buildStudentPortalLink(student, "/student/notifications")
        )
      );
    }
    if (options.schedule) {
      row.push(
        Markup.button.url("Jadval", buildStudentPortalLink(student, "/student/schedule"))
      );
    }
    rows.push(row);
  }

  rows.push([Markup.button.url("Kabinet", buildStudentPortalLink(student, "/student/dashboard"))]);
  return Markup.inlineKeyboard(rows);
}

async function ensureLinkedStudent(ctx) {
  const student = getStudentByTelegramId(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "Akkaunt bog'lanmagan. Telefon raqamingizni +998901234567 formatida yuboring.");
    return null;
  }
  return student;
}

async function sendStudentSummary(ctx, student) {
  await safeReplyWithKeyboard(
    ctx,
    `Kurs: ${student.courseTitle || "-"}\nUstoz: ${student.teacherName || "-"}\nDars vaqti: ${student.schedule || "-"}`
  );
}

export async function sendTelegramCodeToStudent(telegramId, code, expiresAt) {
  if (!bot || !telegramId) return false;
  try {
    await bot.telegram.sendMessage(
      telegramId,
      `Tasdiqlash kodi: ${code}\nAmal qilish muddati: ${dayjs(expiresAt).format("HH:mm")}\n\nKod 5 daqiqa ichida ishlaydi.`
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
    await safeReplyWithKeyboard(
      ctx,
      "Assalomu alaykum. Intelligent botiga xush kelibsiz.\n\nTelefon raqamingizni +998901234567 formatida yuboring yoki menyudan foydalaning."
    );
  });

  bot.hears(/^\+998\d{9}$/, async (ctx) => {
    const phone = ctx.message.text.trim();
    const data = createTelegramLinkCode(phone);

    if (!data) {
      await safeReply(ctx, "Bu raqam bo'yicha student topilmadi. Qabulxona bilan bog'laning.");
      return;
    }

    const delivered = await sendTelegramCodeToStudent(ctx.from.id, data.code, data.expiresAt);
    if (!delivered) {
      await safeReplyWithKeyboard(
        ctx,
        `Tasdiqlash kodi: ${data.code}\nAmal qilish muddati: ${dayjs(data.expiresAt).format("HH:mm")}\n\nKod 5 daqiqa ichida ishlaydi.`
      );
      return;
    }

    await safeReplyWithKeyboard(ctx, "Tasdiqlash kodi yuborildi. Uni shu yerga yoki web saytga kiriting.");
  });

  bot.hears(/^\d{6}$/, async (ctx) => {
    const code = ctx.message.text.trim();
    const student = consumeTelegramCode(code, ctx.from.id);

    if (!student) {
      await safeReply(ctx, "Kod noto'g'ri, muddati tugagan yoki allaqachon ishlatilgan.");
      return;
    }

    await safeReplyWithKeyboard(
      ctx,
      "Bog'lash muvaffaqiyatli. Endi menyudan foydalanishingiz yoki kabinetni ochishingiz mumkin."
    );
    await safeReplyWithInline(
      ctx,
      "Tezkor havolalar:",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true
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
      `Balans: ${Number(student.balance).toLocaleString("ru-RU")} so'm\nStatus: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}`,
      buildStudentInlineActions(student, {
        payment: true
      })
    );
  });

  bot.command("tolov", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `Oylik to'lov: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm\nOxirgi to'lov: ${student.lastPaymentDate || "-"}\nBalans: ${Number(student.balance || 0).toLocaleString("ru-RU")} so'm`,
      buildStudentInlineActions(student, {
        payment: true
      })
    );
  });

  bot.command("jadval", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `Haftalik jadval: ${student.schedule || "-"}`,
      buildStudentInlineActions(student, {
        schedule: true
      })
    );
  });

  bot.command("status", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithKeyboard(
      ctx,
      `Holat: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}\nKurs: ${student.courseTitle || "-"}`
    );
  });

  bot.command("bildirishnomalar", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "Student bildirishnomalarini kabinet ichida ko'rishingiz mumkin.",
      buildStudentInlineActions(student, {
        notifications: true
      })
    );
  });

  bot.command("kabinet", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "Student kabinet uchun maxsus havola tayyor.",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true
      })
    );
  });

  bot.command("yordam", async (ctx) => {
    await safeReplyWithKeyboard(
      ctx,
      "Buyruqlar:\n/kurs\n/balans\n/tolov\n/jadval\n/status\n/bildirishnomalar\n/kabinet"
    );
  });

  bot.hears("Kurs", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await sendStudentSummary(ctx, student);
  });

  bot.hears("Balans", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `Balans: ${Number(student.balance).toLocaleString("ru-RU")} so'm\nStatus: ${student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor"}`,
      buildStudentInlineActions(student, {
        payment: true
      })
    );
  });

  bot.hears("Jadval", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      `Haftalik jadval: ${student.schedule || "-"}`,
      buildStudentInlineActions(student, {
        schedule: true
      })
    );
  });

  bot.hears("Bildirishnomalar", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "Student bildirishnomalarini kabinet ichida ko'rishingiz mumkin.",
      buildStudentInlineActions(student, {
        notifications: true
      })
    );
  });

  bot.hears("Kabinet", async (ctx) => {
    const student = await ensureLinkedStudent(ctx);
    if (!student) return;
    await safeReplyWithInline(
      ctx,
      "Student kabinet uchun maxsus havola tayyor.",
      buildStudentInlineActions(student, {
        payment: true,
        notifications: true
      })
    );
  });

  bot.hears("Yordam", async (ctx) => {
    await safeReplyWithKeyboard(
      ctx,
      "Buyruqlar:\n/kurs\n/balans\n/tolov\n/jadval\n/status\n/bildirishnomalar\n/kabinet"
    );
  });

  bot.launch();

  cron.schedule("0 9 * * *", async () => {
    if (!bot) return;

    const debtors = listDebtors().filter(item => item.telegramId);
    for (const debtor of debtors) {
      await bot.telegram.sendMessage(
        debtor.telegramId,
        `To'lov eslatmasi: ${debtor.courseTitle} uchun balansingiz ${Number(debtor.balance || 0).toLocaleString("ru-RU")} so'm. Oylik to'lov ${Number(debtor.monthlyFee || 0).toLocaleString("ru-RU")} so'm.`
      ).catch(() => null);
    }

    const upcoming = listUpcomingPayments(3);
    for (const item of upcoming) {
      await bot.telegram.sendMessage(
        item.telegramId,
        `Eslatma: ${item.courseTitle} kursi uchun oylik to'lov vaqti yaqinlashdi. Oylik summa ${Number(item.monthlyFee || 0).toLocaleString("ru-RU")} so'm.`
      ).catch(() => null);
    }

    const pending = listPendingTelegramNotifications();
    for (const item of pending) {
      const sent = await bot.telegram.sendMessage(
        item.telegramId,
        `${item.title}\n${item.message}`
      ).then(() => true).catch(() => false);
      if (sent) {
        markNotificationDelivered(item.id);
      }
    }
  });

  return bot;
}
