const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 允許跨來源資源共用 (支援 GitHub Pages 跨域呼叫)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// MongoDB 資料庫連線設定
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/competition_tycoon';

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('✅ You successfully connected to MongoDB!');
  })
  .catch(err => {
      console.error('❌ MongoDB 連線失敗：', err);
  });

// 1. 系統設定 Schema
const SettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Setting = mongoose.model('Setting', SettingSchema);

// 2. 夥伴 (Partner) Schema
const PartnerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rank: { type: String, default: '業務專員' },
    group: { type: String, default: 'OO組' },
    avatar: { type: String, default: '🐼' },
    fyc: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    diceCount: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    pushEnabled: { type: Boolean, default: true }
});
const Partner = mongoose.model('Partner', PartnerSchema);

// 3. 成績申報 Schema
const DeclarationSchema = new mongoose.Schema({
    userName: String,
    userEmail: String,
    tag: String,
    details: String,
    fyc: Number,
    points: Number,
    dice: Number,
    time: String,
    status: { type: String, default: '待審核' }
});
const Declaration = mongoose.model('Declaration', DeclarationSchema);

// 4. 留言板 Schema
const MessageSchema = new mongoose.Schema({
    title: String,
    content: String,
    isAnonymous: Boolean,
    author: String,
    time: String,
    likes: { type: Number, default: 0 },
    replies: [{ author: String, content: String, time: String }]
});
const Message = mongoose.model('Message', MessageSchema);

// 5. 獎勵統整 Schema
const RewardSchema = new mongoose.Schema({
    userName: String,
    reward: String,
    time: String,
    status: { type: String, default: '未發放' }
});
const Reward = mongoose.model('Reward', RewardSchema);

// 初始化預設設定
async function initSettings() {
    try {
        const period = await Setting.findOne({ key: 'eventPeriod' });
        if (!period) {
            await Setting.create({ key: 'eventPeriod', value: { startDate: '2026/12/14', endDate: '2027/06/02' } });
        }
        const yt = await Setting.findOne({ key: 'youtubeUrl' });
        if (!yt) {
            await Setting.create({ key: 'youtubeUrl', value: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' });
        }
        const board = await Setting.findOne({ key: 'boardCells' });
        if (!board) {
            const defaultCells = Array.from({length: 30}, (_, i) => ({
                icon: i === 0 ? '🚩' : (i % 4 === 1 ? '⭐' : i % 4 === 2 ? '🧠' : i % 4 === 3 ? '📈' : '🎁'),
                title: i === 0 ? '起點 / 活力充沛' : `第 ${i+1} 關挑戰`,
                type: i % 5 === 0 ? '傳送' : '普通',
                reward: '獲得隨機加碼獎勵與前進動能！'
            }));
            await Setting.create({ key: 'boardCells', value: defaultCells });
        }
    } catch (e) {
        console.error('初始化設定發生錯誤:', e);
    }
}
initSettings();

// ==========================================
// API 路由
// ==========================================

// 1. 取得所有全體遊戲資料 (夥伴、申報、留言、設定)
app.get('/api/data', async (req, res) => {
    try {
        const partners = await Partner.find({});
        const declarations = await Declaration.find({ status: '待審核' });
        const messages = await Message.find({}).sort({ _id: -1 });
        const rewardsList = await Reward.find({}).sort({ _id: -1 });
        
        const settingsList = await Setting.find({});
        const settingsObj = {};
        settingsList.forEach(s => { settingsObj[s.key] = s.value; });

        res.json({
            success: true,
            partners,
            declarations,
            messages,
            rewardsList,
            settings: {
                startDate: settingsObj.eventPeriod?.startDate || '2026/12/14',
                endDate: settingsObj.eventPeriod?.endDate || '2027/06/02',
                youtubeUrl: settingsObj.youtubeUrl || '',
                boardCells: settingsObj.boardCells || [],
                tags: settingsObj.tags || [
                    { name: 'FYC', isFYC: true, points: 0 },
                    { name: '拜訪', isFYC: false, points: 5 },
                    { name: '增員', isFYC: false, points: 20 },
                    { name: '成交', isFYC: false, points: 50 }
                ]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: '讀取資料失敗' });
    }
});

// 2. 夥伴註冊 API
app.post('/api/register', async (req, res) => {
    try {
        const existing = await Partner.findOne({ email: req.body.email });
        if (existing) {
            return res.status(400).json({ success: false, message: '此 Email 已經註冊過！' });
        }
        const newPartner = new Partner(req.body);
        await newPartner.save();
        res.json({ success: true, message: '註冊成功', user: newPartner });
    } catch (err) {
        res.status(500).json({ success: false, message: '註冊失敗', error: err.message });
    }
});

// 3. 夥伴登入 API
app.post('/api/login', async (req, res) => {
    try {
        const { account, password } = req.body;
        const user = await Partner.findOne({ $or: [{ email: account }, { name: account }] });
        if (user && user.password === password) {
            res.json({ success: true, user });
        } else {
            res.status(400).json({ success: false, message: '帳號或密碼錯誤！' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: '登入失敗' });
    }
});

// 4. 玩家更新狀態 API (如擲骰子移動位置、更新點數)
app.post('/api/user/update', async (req, res) => {
    try {
        const { email, position, points, totalPoints, diceCount, fyc } = req.body;
        const updated = await Partner.findOneAndUpdate(
            { email },
            { position, points, totalPoints, diceCount, fyc },
            { new: true }
        );
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新狀態失敗' });
    }
});

// 5. 提交成績申報 API
app.post('/api/declare', async (req, res) => {
    try {
        const decl = new Declaration(req.body);
        await decl.save();
        res.json({ success: true, message: '申報已送出' });
    } catch (err) {
        res.status(500).json({ success: false, message: '申報失敗' });
    }
});

// 6. 審核通過 API
app.post('/api/declare/approve', async (req, res) => {
    try {
        const { id } = req.body;
        const decl = await Declaration.findById(id);
        if (!decl) return res.status(404).json({ success: false, message: '找不到申報案件' });

        const targetUser = await Partner.findOne({ email: decl.userEmail });
        if (targetUser) {
            targetUser.points += decl.points;
            targetUser.totalPoints += decl.points;
            targetUser.diceCount += decl.dice;
            if (decl.tag === 'FYC') {
                targetUser.fyc = (targetUser.fyc || 0) + (decl.fyc || 0);
            }
            await targetUser.save();
        }
        await Declaration.findByIdAndDelete(id);
        res.json({ success: true, message: '審核通過' });
    } catch (err) {
        res.status(500).json({ success: false, message: '審核操作失敗' });
    }
});

// 7. 發布留言 API
app.post('/api/message', async (req, res) => {
    try {
        const msg = new Message(req.body);
        await msg.save();
        res.json({ success: true, message: '留言發布成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '發布失敗' });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 伺服器運行中：http://localhost:${PORT}`);
});