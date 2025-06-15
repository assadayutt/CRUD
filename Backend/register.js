const bcrypt = require('bcrypt');

module.exports = (app, db, jwt, SECRET_KEY) => {
  // สร้าง id สุ่ม 10 หลัก
  function generateRandomId() {
    return Math.floor(1000000000 + Math.random() * 9000000000);
  }

  // ตรวจสอบว่า id นี้ว่างไหม (กันการชนกันในฐานข้อมูล)
  function getUniqueUserId(callback) {
    const tryGenerate = () => {
      const id = generateRandomId();
      db.query('SELECT id FROM users WHERE id = ?', [id], (err, results) => {
        if (err) return callback(err);
        if (results.length > 0) {
          // ถ้ามี id นี้อยู่แล้ว ลองใหม่
          tryGenerate();
        } else {
          callback(null, id);
        }
      });
    };
    tryGenerate();
  }

  app.post('/register', async (req, res) => {
    const { username, password, name, lastname, phone } = req.body;

    // ตรวจสอบข้อมูล
    if (!username || !password || !name || !lastname || !phone) {
      return res.status(400).json({ message: 'กรอกข้อมูลให้ครบถ้วน' });
    }

    // ตรวจสอบ username ซ้ำ
    const checkUserSql = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserSql, [username], async (err, results) => {
      if (err) return res.status(500).json({ message: 'ระบบผิดพลาด' });
      if (results.length > 0) {
        return res.status(400).json({ message: 'Username นี้ถูกใช้แล้ว' });
      }

      try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้าง id ที่ไม่ซ้ำ
        getUniqueUserId((err, userId) => {
          if (err) return res.status(500).json({ message: 'ระบบผิดพลาดในการสร้าง ID' });

          const insertSql = 'INSERT INTO users (id, username, password, name, lastname, phone) VALUES (?, ?, ?, ?, ?, ?)';
          db.query(insertSql, [userId, username, hashedPassword, name, lastname, phone], (err, result) => {
            if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดขณะบันทึก' });

            const newUser = {
              id: userId,
              username
            };
            const token = jwt.sign(newUser, SECRET_KEY, { expiresIn: '1h' });

            res.status(201).json({ message: 'สมัครสำเร็จ', token });
          });
        });
      } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้ารหัสรหัสผ่าน' });
      }
    });
  });
};
