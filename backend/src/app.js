import cors from "cors";
import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { migrate, seed } from "./db.js";
import router from "./routes.js";

export function createApp() {
  migrate();
  if (config.allowDemoSeed) {
    seed();
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));
  app.use(
    "/uploads",
    express.static(
      config.storagePath
        ? path.resolve(config.storagePath, "uploads")
        : path.resolve("uploads")
    )
  );
  app.use("/api", router);
  return app;
}
