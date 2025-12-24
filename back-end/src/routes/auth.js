import { Router } from "express";
import { pool } from "../db.js";
import { signJwt, verifyJwt } from "../utils/jwt.js";

const router = Router();
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";

router.post("/auth/login", async (req, res) => {
  const { name, phone, studentId } = req.body || {};
  const phoneSafe = String(phone || "").trim();
  if (!phoneSafe) {
    return res.status(400).json({ error: "phone is required" });
  }

  const fullName = String(name || "Зочин хэрэглэгч").trim() || "Зочин хэрэглэгч";
  const studentSafe = String(studentId || "").trim();

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE phone = $1 LIMIT 1",
      [phoneSafe]
    );

    let userRow;
    if (existing.rows.length) {
      const userId = existing.rows[0].id;
      await pool.query(
        `UPDATE users
           SET full_name = $2,
               student_id = CASE WHEN $3 <> '' THEN $3 ELSE student_id END
         WHERE id = $1`,
        [userId, fullName, studentSafe]
      );
      const updated = await pool.query(
        `SELECT id, full_name AS name, phone, student_id, role
           FROM users
          WHERE id = $1`,
        [userId]
      );
      userRow = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO users (full_name, phone, student_id, role)
         VALUES ($1, $2, $3, 'customer')
         RETURNING id, full_name AS name, phone, student_id, role`,
        [fullName, phoneSafe, studentSafe]
      );
      userRow = inserted.rows[0];
    }

    const token = signJwt(
      { sub: userRow.id, name: userRow.name, phone: userRow.phone, role: userRow.role },
      jwtSecret
    );

    res.json({ token, user: userRow });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/auth/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    const payload = verifyJwt(token, jwtSecret);
    res.json({ user: payload });
  } catch (e) {
    res.status(401).json({ error: e.message || "Unauthorized" });
  }
});

export default router;
