import cron from "node-cron";
import { Telegraf } from "telegraf";
import { config } from "./config.js";
import { consumeTelegramCode, createTelegramLinkCode, getStudentByPhone, getStudentByTelegramId, listDebtors, listUpcomingPayments } from "./services.js";
import { signToken } from "./auth.js";

let bot = null;

async function safeReply(ctx, message) {
  try {
    await ctx.reply(message);
  } catch {
    return null;
  }
}

export function startBot() {
  if (!config.telegramBotToken) {
    return null;
  }

  bot = new Telegraf(config.telegramBotToken);

  bot.start(async (ctx) => {
    await safeReply(
      ctx,
      "Assalomu alaykum. Intelligent botiga xush kelibsiz.\n\nTelefon raqamingizni +998901234567 formatida yuboring."
    );
  });

  bot.hears(/^\+998\d{9}$/, async (ctx) => {
    const phone = ctx.message.text.trim();
    const data = createTelegramLinkCode(phone);

    if (!data) {
      await safeReply(ctx, "Bu raqam bo'yicha student topilmadi. Qabulxona bilan bog'laning.");
      return;
    }

    await safeReply(
      ctx,
      `Tasdiqlash kodi: ${data.code}\n\nWeb saytga shu kodni kiriting yoki shu yerga yuboring.`
    );
  });

  bot.hears(/^\d{6}$/, async (ctx) => {
    const code = ctx.message.text.trim();
    const student = consumeTelegramCode(code, ctx.from.id);

    if (!student) {
      await safeReply(ctx, "Kod topilmadi yoki avval ishlatilgan.");
      return;
    }

    const token = signToken({ id: student.userId, role: "student", fullName: student.fullName });
    const link = `${config.webUrl}/?studentToken=${token}`;
    await safeReply(ctx, `Bog'lash muvaffaqiyatli. Student kabineti: ${link}`);
  });

  bot.command("kurs", async (ctx) => {
    const student = getStudentByTelegramId(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "Avval telefon raqamingizni yuborib akkauntni bog'lang.");
      return;
    }

    await safeReply(
      ctx,
      `Kurs: ${student.courseTitle}\nUstoz: ${student.teacherName}\nDars vaqti: ${student.schedule}`
    );
  });

  bot.command("balans", async (ctx) => {
    const student = getStudentByTelegramId(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
      return;
    }

    await safeReply(ctx, `Balans: ${Number(student.balance).toLocaleString("ru-RU")} so'm\nStatus: ${student.status === "active" ? "Aktiv" : "Qarzdor"}`);
  });

  bot.command("tolov", async (ctx) => {
    const student = getStudentByTelegramId(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
      return;
    }

    await safeReply(ctx, `Oylik to'lov: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm\nOxirgi to'lov: ${student.lastPaymentDate || "-"}`);
  });

  bot.command("kabinet", async (ctx) => {
    const student = getStudentByTelegramId(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
      return;
    }

    const token = signToken({ id: student.userId, role: "student", fullName: student.fullName });
    await safeReply(ctx, `Kabinet uchun maxsus havola: ${config.webUrl}/?studentToken=${token}`);
  });

  bot.launch();

  cron.schedule("0 9 * * *", async () => {
    if (!bot) {
      return;
    }

    const debtors = listDebtors().filter((item) => item.telegramId);
    for (const debtor of debtors) {
      await bot.telegram.sendMessage(
        debtor.telegramId,
        `To'lov eslatmasi: ${debtor.courseTitle} uchun balansingiz ${debtor.balance.toLocaleString("ru-RU")} so'm. Oylik to'lov ${debtor.monthlyFee.toLocaleString("ru-RU")} so'm.`
      ).catch(() => null);
    }

    const upcoming = listUpcomingPayments(3);
    for (const item of upcoming) {
      await bot.telegram.sendMessage(
        item.telegramId,
        `Eslatma: ${item.courseTitle} kursi uchun oylik to'lov vaqti yaqinlashdi. Oylik summa ${Number(item.monthlyFee || 0).toLocaleString("ru-RU")} so'm.`
      ).catch(() => null);
    }
  });

  return bot;
}
