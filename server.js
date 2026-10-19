const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./tycoon.db', (err) => {
    if (err) console.error('資料庫連接失敗', err.message);
    else console.log('已成功連線至 SQLite 資料庫');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        account TEXT UNIQUE,
        password TEXT,
        name TEXT,
        rank TEXT,
        groupName TEXT,
        email TEXT,
        fyc INTEGER DEFAULT 0,
        points INTEGER DEFAULT 20,
        diceCount INTEGER DEFAULT 3,
        boardPosition INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        partnerId TEXT,
        tag TEXT,
        amount INTEGER,
        leadCount INTEGER,
        note TEXT,
        status TEXT,
        date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        partnerId TEXT,
        partnerName TEXT,
        reward TEXT,
        date TEXT,
        status TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS system (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});

app.get('/api/data', (req, res) => {
    db.all(`SELECT * FROM partners`, [], (err, partners) => {
        db.all(`SELECT * FROM claims`, [], (err2, claims) => {
            db.all(`SELECT * FROM rewards`, [], (err3, rewards) => {
                db.all(`SELECT * FROM system`, [], (err4, systemRows) => {
                    let system = {};
                    systemRows.forEach(row => { system[row.key] = JSON.parse(row.value); });
                    res.json({ partners, claims, rewards, system });
                });
            });
        });
    });
});

app.post('/api/register', (req, res) => {
    const { id, account, password, name, rank, groupName, email, fyc, points, diceCount, boardPosition } = req.body;
    const query = `INSERT INTO partners (id, account, password, name, rank, groupName, email, fyc, points, diceCount, boardPosition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [id, account, password, name, rank, groupName, email, fyc, points, diceCount, boardPosition], function(err) {
        if (err) return res.status(400).json({ success: false, message: '帳號已被註冊' });
        res.json({ success: true });
    });
});

app.put('/api/partners/:id', (req, res) => {
    const { name, groupName, fyc, points, password, email } = req.body;
    let fields = [];
    let values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (groupName !== undefined) { fields.push('groupName = ?'); values.push(groupName); }
    if (fyc !== undefined) { fields.push('fyc = ?'); values.push(fyc); }
    if (points !== undefined) { fields.push('points = ?'); values.push(points); }
    if (password !== undefined) { fields.push('password = ?'); values.push(password); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    
    values.push(req.params.id);
    const query = `UPDATE partners SET ${fields.join(', ')} WHERE id = ?`;
    db.run(query, values, function(err) {
        if (err) return res.status(400).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/partners/:id', (req, res) => {
    db.run(`DELETE FROM partners WHERE id = ?`, [req.params.id], function(err) {
        res.json({ success: true });
    });
});

app.post('/api/forgot-password', (req, res) => {
    const { account, email } = req.body;
    db.get(`SELECT * FROM partners WHERE account = ? AND email = ?`, [account, email], (err, row) => {
        if (!row) return res.status(404).json({ success: false, message: '找不到相符的帳號與電子信箱' });

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: '【競賽大亨】密碼查詢通知',
            text: `您好 ${row.name}：\n\n您的競賽大亨帳號密碼為：${row.password}\n請妥善保管您的密碼。`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) return res.status(500).json({ success: false, message: '郵件發送失敗' });
            res.json({ success: true, message: '密碼已成功寄至您的信箱！' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`伺服器已在 http://localhost:${PORT} 啟動`);
});