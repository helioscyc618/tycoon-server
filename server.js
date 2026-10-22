const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 請求主體
app.use(express.json());

// 將 public 資料夾設定為靜態資源根目錄
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// MongoDB 資料庫連線設定
// ==========================================
// 請確保在 Render 的 Environment 變數中設定 MONGO_URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/competition_tycoon';

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('✅ You successfully connected to MongoDB!');
  })
  .catch(err => {
      console.error('❌ MongoDB 連線失敗：', err);
  });

// 定義系統設定 Schema 與 Model（用來持久化儲存後台設定）
const SettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Setting = mongoose.model('Setting', SettingSchema);

// 初始化預設設定（若資料庫中尚無資料）
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
    } catch (e) {
        console.error('初始化設定發生錯誤:', e);
    }
}
initSettings();

// ==========================================
// API 路由
// ==========================================

// 1. 取得使用者與遊戲狀態 API
app.get('/v1/user/status', (req, res) => {
  res.json({
    success: true,
    data: {
      fyc: 0,
      availablePoints: 100,
      diceCount: 3,
      currentPosition: 1
    }
  });
});

// 2. 同步遊戲狀態 API
app.post('/v1/game/sync', (req, res) => {
  const clientData = req.body;
  console.log('收到前端同步資料:', clientData);

  res.json({
    success: true,
    message: '雲端同步成功',
    data: clientData
  });
});

// 3. 儲存競賽期間設定 API (寫入 MongoDB)
app.post('/v1/settings/period', async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
      await Setting.findOneAndUpdate(
          { key: 'eventPeriod' },
          { value: { startDate, endDate } },
          { upsert: true, new: true }
      );
      console.log('更新競賽期間並已寫入資料庫:', startDate, endDate);
      res.json({ 
        success: true, 
        message: '競賽期間更新成功',
        data: { startDate, endDate }
      });
  } catch (err) {
      console.error('儲存競賽期間失敗:', err);
      res.status(500).json({ success: false, message: '儲存失敗' });
  }
});

// 4. 取得激勵影片設定 API (從 MongoDB 讀取)
app.get('/v1/settings/youtube', async (req, res) => {
  try {
      const ytSetting = await Setting.findOne({ key: 'youtubeUrl' });
      res.json({ 
        success: true, 
        url: ytSetting ? ytSetting.value : '' 
      });
  } catch (err) {
      res.status(500).json({ success: false, message: '讀取失敗' });
  }
});

// 5. 儲存激勵影片設定 API (寫入 MongoDB)
app.post('/v1/settings/youtube', async (req, res) => {
  const { url } = req.body;
  try {
      await Setting.findOneAndUpdate(
          { key: 'youtubeUrl' },
          { value: url },
          { upsert: true, new: true }
      );
      console.log('更新激勵影片網址並已寫入資料庫:', url);
      res.json({ 
        success: true, 
        message: '激勵影片設定儲存成功' 
      });
  } catch (err) {
      console.error('儲存激勵影片失敗:', err);
      res.status(500).json({ success: false, message: '儲存失敗' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行中：http://localhost:${PORT}`);
});