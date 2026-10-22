const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// 從 Render 的環境變數讀取 MongoDB 連線字串
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db, statesCollection;

async function startServer() {
    try {
        await client.connect();
        db = client.db('competition_tycoon'); // 資料庫名稱
        statesCollection = db.collection('states'); // 集合名稱
        console.log("✅ You successfully connected to MongoDB!");
    } catch (err) {
        console.error("❌ MongoDB 連線失敗:", err);
    }

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
        console.log(`🚀 競賽大亨後端伺服器已在 http://localhost:${PORT} 啟動`);
    });
}

startServer();

// ==========================================
// API 路由設定
// ==========================================

// 1. 取得遊戲狀態 (GET)
app.get('/api/state', async (req, res) => {
    try {
        const state = await statesCollection.findOne({ type: 'global_state' });
        res.json(state ? state.data : { partners: [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. 儲存/更新遊戲狀態 (POST)
app.post('/api/state', async (req, res) => {
    try {
        const newData = req.body;
        await statesCollection.updateOne(
            { type: 'global_state' },
            { $set: { data: newData } },
            { upsert: true }
        );
        res.json({ success: true, message: '資料已成功儲存至雲端' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});