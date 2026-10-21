const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// 設定跨域與較大的資料傳輸限制（以支援大型 HTML 原始碼與 JSON 備份）
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 靜態檔案託管
app.use(express.static(path.join(__dirname, 'public')));

// 預設記憶體狀態儲存
let appState = {
    partners: [],
    declarations: [],
    messages: [],
    rewardsList: [],
    settings: {
        newsTitle: '🏆 競賽大亨正式開跑！',
        newsContent: '歡迎各位頂尖業務菁英加入競賽大亨！請透過每日拜訪、增員與 FYC 申報賺取點數，解鎖 30 格大富翁棋盤豐富獎勵！',
        startDate: '2026/12/14',
        endDate: '2027/06/02',
        ticker1: '🎉 賀！競賽大亨雙軌競賽熱血啟動！所有申報請確實填寫任務說明！',
        ticker2: '🔥 團隊夥伴衝刺中，每日拜訪與增員點數即時同步雲端！',
        ticker3: '⭐ 恭喜各組菁英挑戰機會命運大富翁棋盤豐富大獎！',
        primaryColor: '#f97316',
        headerColor: '#0f172a',
        bgColor: '#FAFAFA',
        tags: [
            { name: 'FYC', isFYC: true, points: 0 },
            { name: '活動邀約', isFYC: false, points: 10 },
            { name: '增員面談', isFYC: false, points: 20 },
            { name: '新夥伴公司考', isFYC: false, points: 30 },
            { name: '新夥伴外部考', isFYC: false, points: 30 },
            { name: '新夥伴報聘', isFYC: false, points: 50 }
        ],
        boardCells: []
    }
};

// 1. 取得全系統狀態 API
app.get('/api/state', (req, res) => {
    res.json(appState);
});

// 2. 更新全系統狀態 API
app.post('/api/state', (req, res) => {
    if (req.body) {
        appState = req.body;
    }
    res.json({ success: true });
});

// 3. 後台動態更新前端編碼 API (寫入 root 與 public/index.html)
app.post('/api/update-code', (req, res) => {
    const { htmlCode } = req.body;
    if (!htmlCode) return res.status(400).json({ error: '缺少編碼內容' });
    try {
        // 寫入根目錄 index.html
        fs.writeFileSync(path.join(__dirname, 'index.html'), htmlCode, 'utf8');
        
        // 寫入 public/index.html
        const publicPath = path.join(__dirname, 'public');
        if (!fs.existsSync(publicPath)) {
            fs.mkdirSync(publicPath, { recursive: true });
        }
        fs.writeFileSync(path.join(publicPath, 'index.html'), htmlCode, 'utf8');

        res.json({ success: true, message: '前端編碼已成功更新並寫入伺服器！' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. JSON 指令即時匯入與雲端同步 API
app.post('/api/restore-json', (req, res) => {
    const { jsonData } = req.body;
    try {
        const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        appState = parsed;
        res.json({ success: true, message: 'JSON 指令已成功執行並同步至雲端！' });
    } catch (e) {
        res.status(400).json({ error: 'JSON 格式錯誤，無法解析' });
    }
});

// 根目錄路由
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Competition Tycoon Server is Running.');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Competition Tycoon server running on port ${PORT}`);
});