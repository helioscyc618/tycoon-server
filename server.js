const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 資料持久化儲存檔案路徑
const DB_FILE = path.join(__dirname, 'database.json');

// 初始化載入或預設資料結構
let cloudState = {
    partners: [
        { name: '王大亨', email: 'admin@tycoon.com', password: 'admin', rank: '業務經理', group: '菁英組', avatar: '👨‍💼', fyc: 150000, points: 100, totalPoints: 150, diceCount: 5, position: 0, buffs: [] }
    ],
    declarations: [],
    messages: [],
    rewardsList: [],
    settings: {
        newsTitle: '🏆 競賽大亨正式開跑！',
        newsContent: '歡迎各位夥伴！',
        ticker1: '🎉 賀！競賽大亨雲端永久同步版正式啟動！',
        ticker2: '🔥 團隊夥伴衝刺中，資料已安全永久儲存！',
        ticker3: '⭐ 祝各位挑戰機會命運大富翁棋盤大獎！',
        primaryColor: '#f97316',
        headerColor: '#0f172a',
        bgColor: '#FAFAFA',
        adminPassword: 'admin',
        tags: [
            { name: 'FYC', isFYC: true, points: 0 },
            { name: '活動邀約', isFYC: false, points: 10 },
            { name: '增員面談', isFYC: false, points: 20 },
            { name: '新夥伴報聘', isFYC: false, points: 50 }
        ],
        boardCells: Array(30).fill({ title: '活力充沛格', icon: '🚩', type: '獎勵', reward: '獲得 20 點積分！' })
    }
};

// 伺服器啟動時，若存在備份檔案則讀取進來，確保重啟不歸零
if (fs.existsSync(DB_FILE)) {
    try {
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        const savedData = JSON.parse(rawData);
        if (savedData && savedData.partners) {
            cloudState = savedData;
            console.log('成功從永久檔案載入歷史資料！');
        }
    } catch (e) {
        console.log('讀取永久資料庫檔案失敗，使用預設結構。');
    }
}

// 取得雲端狀態
app.get('/api/state', (req, res) => {
    res.json(cloudState);
});

// 更新雲端狀態（多裝置同步寫入並立即寫入硬碟檔案）
app.post('/api/state', (req, res) => {
    const { partners, declarations, messages, rewardsList, settings } = req.body;
    if (partners) cloudState.partners = partners;
    if (declarations) cloudState.declarations = declarations;
    if (messages) cloudState.messages = messages;
    if (rewardsList) cloudState.rewardsList = rewardsList;
    if (settings) cloudState.settings = settings;

    // 立即將最新狀態寫入持久化檔案
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(cloudState, null, 2), 'utf8');
    } catch (e) {
        console.error('寫入永久檔案失敗：', e);
    }

    res.json({ success: true, serverTime: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Competition Tycoon Server running on port ${PORT}`);
});