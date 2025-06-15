const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = (app, db, jwt, SECRET_KEY) => {
  // 📁 สร้างโฟลเดอร์ถ้ายังไม่มี
  const uploadDir = path.join(__dirname, "..", "Image", "Goods");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 📦 ตั้งค่า multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir); // เก็บใน /Image/Goods/
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname;
      cb(null, uniqueName);
    },
  });

  const upload = multer({ storage });

  // 📤 API เพิ่มสินค้า
app.post("/addGoods", upload.single("goods_pic"), (req, res) => {
  const { goods_name, goods_price, goods_stock } = req.body;

  if (!req.file) {
    return res.status(400).send("❌ กรุณาอัปโหลดรูปภาพ");
  }

  const goods_pic = "/Image/Goods/" + req.file.filename;

  function generateGoodsId() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  function checkAndInsert() {
    const goods_id = generateGoodsId();

    // เช็คว่ามี goods_id นี้ใน DB หรือยัง
    const checkSql = "SELECT COUNT(*) AS count FROM goods WHERE goods_id = ?";
    db.query(checkSql, [goods_id], (err, results) => {
      if (err) {
        console.error("❌ Check ID error:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
      }

      if (results[0].count > 0) {
        // ถ้าเจอซ้ำ ให้สุ่มใหม่อีกครั้ง (เรียกตัวเองใหม่)
        return checkAndInsert();
      } else {
        // ไม่ซ้ำ ให้ insert ได้เลย
        const insertSql = `
          INSERT INTO goods (goods_id, goods_name, goods_price, goods_stock, goods_pic)
          VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
          insertSql,
          [goods_id, goods_name, goods_price, goods_stock, goods_pic],
          (err) => {
            if (err) {
              console.error("❌ Insert error:", err);
              return res.status(500).send("เพิ่มสินค้าไม่สำเร็จ");
            }
            res.send("✅ เพิ่มสินค้าสำเร็จ");
          }
        );
      }
    });
  }

  checkAndInsert();
});



  // 📦 API ดึงข้อมูลสินค้า
  app.get("/goods", (req, res) => {
    const sql = `
      SELECT goods_id, goods_name, goods_price, goods_stock, goods_pic FROM goods
    `;
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Query error:", err);
        return res.status(500).send("เกิดข้อผิดพลาดในระบบ");
      }
      res.json(results);
    });
  });


// middleware ตรวจสอบ token และดึง user_id
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: 'ไม่มี token' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'token ไม่ถูกต้อง' });
    req.user = user; 
    next();
  });
}

app.post('/addTocart', authenticateToken, (req, res) => {
  const userId = req.user.id; // สมมติ token payload มี id
  const { goods_id, quantity } = req.body;

  if (!goods_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบหรือจำนวนไม่ถูกต้อง' });
  }

  db.query('SELECT goods_stock FROM goods WHERE goods_id = ?', [goods_id], (err, goodsRows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }

    if (goodsRows.length === 0) {
      return res.status(404).json({ error: 'สินค้าไม่พบ' });
    }

    if (goodsRows[0].goods_stock < quantity) {
      return res.status(400).json({ error: 'จำนวนสินค้ามากกว่าคงเหลือ' });
    }

    db.query(
      'SELECT quantity FROM cart WHERE user_id = ? AND goods_id = ?',
      [userId, goods_id],
      (err, cartRows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
        }

        if (cartRows.length > 0) {
          // update quantity
          const newQuantity = cartRows[0].quantity + quantity;
          db.query(
            'UPDATE cart SET quantity = ? WHERE user_id = ? AND goods_id = ?',
            [newQuantity, userId, goods_id],
            (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตตะกร้า' });
              }
              return res.json({ message: 'เพิ่มสินค้าลงตะกร้าเรียบร้อย (อัปเดตจำนวน)' });
            }
          );
        } else {
          // insert ใหม่
          db.query(
            'INSERT INTO cart (user_id, goods_id, quantity) VALUES (?, ?, ?)',
            [userId, goods_id, quantity],
            (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มตะกร้า' });
              }
              return res.json({ message: 'เพิ่มสินค้าลงตะกร้าเรียบร้อย' });
            }
          );
        }
      }
    );
  });
});


};
