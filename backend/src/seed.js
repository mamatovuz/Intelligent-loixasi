import { migrate, seed } from "./db.js";

migrate();
seed();

console.log("Demo ma'lumotlar yaratildi.");
