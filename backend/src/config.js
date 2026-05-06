import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const storagePath = process.env.STORAGE_PATH || "";
const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";

if (isProduction && !storagePath) {
  throw new Error("Production uchun STORAGE_PATH majburiy. Persistent volume ulang.");
}

export const config = {
  port: Number(process.env.PORT || 4000),
  isProduction,
  jwtSecret: process.env.JWT_SECRET || "change_me",
  webUrl: process.env.WEB_URL || "http://localhost:5173",
  appUrl:
    process.env.APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${process.env.PORT || 4000}`),
  storagePath,
  allowDemoSeed,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "@Intelligent_uz_bot"
};
