const jwt = require('jsonwebtoken');

module.exports = (app, db, jwt, SECRET_KEY) => {

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ message: 'ไม่ได้รับ token' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'token ไม่ถูกต้อง' });
    req.user = user; 
    next();
  });
}

app.post('/updateUser', authenticateToken, (req, res) => {
  const userIdFromToken = req.user.id; // id จาก token (ห้ามใช้จาก client!)
  const { name, lastname, phone } = req.body;

  const sql = 'UPDATE users SET name = ?, lastname = ?, phone = ? WHERE id = ?';
  db.query(sql, [name, lastname, phone, userIdFromToken], (err, result) => {
    if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    res.json({ message: 'อัปเดตข้อมูลเรียบร้อย' });
  });
});

}