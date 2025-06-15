const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('express').urlencoded;
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'Mew_Website';


app.use(bodyParser({ extended: false }));


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',          
  password: 'root',         
  database: 'CRUD',
  port:'8889'
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
  } else {
    console.log('✅ MySQL connected!');
  }
});

//static
app.use(express.static(path.join(__dirname,)));
app.use('/images', express.static(path.join(__dirname, 'Image/Goods')));




//page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front', 'HTML', 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front', 'HTML', 'index.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front', 'HTML', 'register.html'));
});

app.get('/userInfopage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front', 'HTML', 'userInfopage.html'));
});

app.get('/addGoodsPage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Front', 'HTML', 'addGoodsPage.html'));
});






//api route
// โหลดไฟล์ api.js แล้วเรียกใช้
const loginAuth = require('./Backend/loginAuth.js');
const registerUser = require('./Backend/register.js');
const updateUser = require('./Backend/updateUser.js');
const deleteUser = require('./Backend/deleteUser.js');
const getGoods = require('./Backend/Goods.js');





loginAuth(app, db, jwt, SECRET_KEY);
registerUser(app, db, jwt, SECRET_KEY);
updateUser(app, db, jwt, SECRET_KEY);
deleteUser(app, db, jwt, SECRET_KEY);
getGoods(app, db, jwt, SECRET_KEY);







//listen
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
