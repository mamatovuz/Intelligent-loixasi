import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  webUrl: process.env.WEB_URL || "http://localhost:5173",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "@Intelligent_uz_bot"
};
