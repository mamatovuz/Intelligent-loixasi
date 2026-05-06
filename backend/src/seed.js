import { migrate, seed } from "./db.js";

migrate();
seed();

console.log("Seed yakunlandi. Bu script faqat lokal development/demo uchun ishlatiladi.");
