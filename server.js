const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 靜態檔案託管 (若您的前端 HTML/JS 放在 public 資料夾下)
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------
// 資料讀寫防護機制 (避免併發寫入造成資料毀損或被初始檔覆寫)
// -----------------------------------------------------------------
function readDB() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            // 初始化預設資料庫結構
            const initialData = {
                users: [
                    { 
                        name: '王大明', 
                        email: 'ming@mail.com', 
                        password: '123', 
                        rank: '業務經理', 
                        group: '第一組', 
                        avatar: '🦁', 
                        points: 120, 
                        totalPoints: 200, 
                        diceCount: 5, 
                        position: 0, 
                        fyc: 150000, 
                        iosPush: true, 
                        androidPush: false 
                    }
                ],
                declarations: [],
                messages: [
                    { 
                        title: '歡迎加入競賽大亨！', 
                        content: '各位夥伴好，新賽季已經展開，後端資料庫已成功啟動並支援多裝置即時同步！', 
                        author: '系統管理員', 
                        time: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }), 
                        isAnonymous: false, 
                        likes: 5, 
                        replies: [] 
                    }
                ],
                settings: {
                    primaryColor: '#f97316',
                    headerColor: '#0f172a',
                    bgColor: '#FAFAFA',
                    startDate: '2026/12/14',
                    endDate: '2027/06/02'
                }
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
            return initialData;
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('讀取資料庫發生錯誤:', err);
        return { users: [], declarations: [], messages: [], settings: {} };
    }
}

function writeDB(data) {
    try {
        // 採用同步寫入確保多裝置請求不會同時覆寫造成 Race Condition
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('寫入資料庫發生錯誤:', err);
        return false;
    }
}

// -----------------------------------------------------------------
// API 路由
// -----------------------------------------------------------------

// 1. 取得完整資料 (供前端初始化同步)
app.get('/api/data', (req, res) => {
    const db = readDB();
    res.json({ success: true, data: db });
});

// 2. 更新或同步整體資料 (防覆寫寫入)
app.post('/api/sync', (req, res) => {
    const { users, declarations, messages, settings } = req.body;
    const db = readDB();

    if (users) db.users = users;
    if (declarations) db.declarations = declarations;
    if (messages) db.messages = messages;
    if (settings) db.settings = settings;

    const success = writeDB(db);
    if (success) {
        res.json({ success: true, message: '資料已成功同步至伺服器端！', data: db });
    } else {
        res.status(500).json({ success: false, message: '伺服器寫入失敗' });
    }
});

// 3. 會員登入 API
app.post('/api/login', (req, res) => {
    const { account, password } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => (u.email === account || u.name === account) && u.password === password);
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }
});

// 4. 會員註冊 API
app.post('/api/register', (req, res) => {
    const newUser = req.body;
    const db = readDB();

    if (db.users.some(u => u.email === newUser.email)) {
        return res.status(400).json({ success: false, message: '此 Email 已經被註冊過了！' });
    }

    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, user: newUser });
});

// -----------------------------------------------------------------
// 啟動伺服器
// -----------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 競賽大亨後端伺服器已在 http://localhost:${PORT} 啟動`);
});