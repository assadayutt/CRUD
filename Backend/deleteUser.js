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

  // DELETE user API
  app.delete('/deleteUser', authenticateToken, (req, res) => {
    const userIdFromToken = req.user.id;

    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [userIdFromToken], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ต้องการลบ' });
      }

      res.json({ message: 'ลบผู้ใช้เรียบร้อยแล้ว' });
    });
  });

}
 