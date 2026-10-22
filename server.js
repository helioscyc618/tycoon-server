const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 請求主體
app.use(express.json());

// 將 public 資料夾設定為靜態資源根目錄
app.use(express.static(path.join(__dirname, 'public')));

// 記憶體中暫存的動態設定（後續可改為從 tycoon.db 讀寫）
let currentEventPeriod = { startDate: '', endDate: '' };
let currentYoutubeUrl = '';

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

// 3. 儲存競賽期間設定 API
app.post('/v1/settings/period', (req, res) => {
  const { startDate, endDate } = req.body;
  currentEventPeriod = { startDate, endDate };
  console.log('更新競賽期間:', startDate, endDate);
  
  res.json({ 
    success: true, 
    message: '競賽期間更新成功',
    data: currentEventPeriod
  });
});

// 4. 取得激勵影片設定 API
app.get('/v1/settings/youtube', (req, res) => {
  res.json({ 
    success: true, 
    url: currentYoutubeUrl 
  });
});

// 5. 儲存激勵影片設定 API
app.post('/v1/settings/youtube', (req, res) => {
  const { url } = req.body;
  currentYoutubeUrl = url;
  console.log('更新激勵影片網址:', url);

  res.json({ 
    success: true, 
    message: '激勵影片設定儲存成功' 
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行中：http://localhost:${PORT}`);
});