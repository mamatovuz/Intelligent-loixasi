import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { getDb } from "./db.js";

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token topilmadi" });
  }

  try {
    const token = header.replace("Bearer ", "");
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: "Token yaroqsiz" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Sizda ruxsat yo'q" });
    }
    next();
  };
}

export function getUserProfile(userId) {
  return getDb().prepare(`
    SELECT id, full_name as fullName, username, phone, role, telegram_id as telegramId, profile_image as profileImage
    FROM users
    WHERE id = ?
  `).get(userId);
}
