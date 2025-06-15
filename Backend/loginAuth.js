const express = require('express');
const bcrypt = require('bcrypt');

module.exports = function (app, db, jwt, SECRET_KEY) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ LOGIN
  app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, results) => {
      if (err) {
        console.error("❌ Query error:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในระบบ");
      }

      if (results.length === 0) {
        return res.status(401).send("❌ ไม่พบผู้ใช้นี้");
      }

      const user = results[0];

      // ✅ เปรียบเทียบ password กับ hashed password ที่เก็บไว้
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).send("❌ รหัสผ่านไม่ถูกต้อง");
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      res.json({
        message: "✅ เข้าสู่ระบบสำเร็จ",
        token: token,
      });
    });
  });

  // ✅ Middleware ตรวจสอบ Token
  function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) return res.status(401).send("❌ ไม่มี Token");

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.status(403).send("❌ Token หมดอายุหรือไม่ถูกต้อง");
      req.user = user;
      next();
    });
  }

  // ✅ ดึงข้อมูลผู้ใช้
  app.get("/api/userinfo", authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = "SELECT id, username, name, lastname, phone FROM users WHERE id = ?";
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error("❌ Query error:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในระบบ");
      }

      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).send("ไม่พบข้อมูลผู้ใช้");
      }
    });
  });
};
