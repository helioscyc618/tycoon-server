const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 雲端記憶體資料庫結構
let cloudState = {
    partners: [
        { name: '王大亨', email: 'admin@tycoon.com', password: 'admin', rank: '業務經理', group: '菁英組', avatar: '👨‍💼', fyc: 150000, points: 100, totalPoints: 150, diceCount: 5, position: 0, buffs: [] }
    ],
    declarations: [],
    messages: [],
    rewardsList: [],
    settings: {
        tickerText: '🎉 賀！競賽大亨雲端同步版正式啟動！',
        tags: [
            { name: 'FYC', isFYC: true, points: 0 },
            { name: '活動邀約', isFYC: false, points: 10 },
            { name: '增員面談', isFYC: false, points: 20 },
            { name: '新夥伴報聘', isFYC: false, points: 50 }
        ],
        boardCells: Array(30).fill({ title: '活力充沛格', icon: '🚩', type: '獎勵', reward: '獲得 20 點積分！' })
    }
};

// 取得雲端狀態
app.get('/api/state', (req, res) => {
    res.json(cloudState);
});

// 更新雲端狀態（多裝置同步寫入）
app.post('/api/state', (req, res) => {
    const { partners, declarations, messages, rewardsList, settings } = req.body;
    if (partners) cloudState.partners = partners;
    if (declarations) cloudState.declarations = declarations;
    if (messages) cloudState.messages = messages;
    if (rewardsList) cloudState.rewardsList = rewardsList;
    if (settings) cloudState.settings = settings;
    res.json({ success: true, serverTime: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Competition Tycoon Server running on port ${PORT}`);
});