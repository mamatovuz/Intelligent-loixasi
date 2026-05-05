import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

const db = new Database(
  config.storagePath
    ? path.resolve(config.storagePath, "data", "intelligent.db")
    : path.resolve("data", "intelligent.db")
);

const username = process.argv[2];
const password = process.argv[3] || "12345678";

if (!username) {
  console.error("Usage: node src/reset-user-password.js <username> [password]");
  process.exit(1);
}

const user = db.prepare(`
  SELECT id, username, role
  FROM users
  WHERE username = ?
`).get(username);

if (!user) {
  console.error(`User not found: ${username}`);
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);

db.prepare(`
  UPDATE users
  SET password_hash = ?
  WHERE id = ?
`).run(passwordHash, user.id);

console.log(JSON.stringify({
  success: true,
  username: user.username,
  role: user.role,
  password
}, null, 2));
