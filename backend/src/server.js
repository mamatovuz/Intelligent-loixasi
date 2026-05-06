import { createApp } from "./app.js";
import { config } from "./config.js";
import { startBot } from "./bot.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Intelligent backend ishga tushdi: http://localhost:${config.port}`);
});

if (config.telegramBotEnabled) {
  startBot();
} else {
  console.log("Telegram bot o'chirilgan: TELEGRAM_BOT_ENABLED=false");
}
