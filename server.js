const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

// ==========================================
// 1. 連線到 MongoDB 雲端資料庫（讀取 Render 環境變數 MONGO_URI）
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ 錯誤：未設定 MONGO_URI 環境變數！請至 Render 後台設定。');
}

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ 成功連線到 MongoDB 雲端資料庫！'))
.catch(err => console.error('❌ MongoDB 連線失敗：', err));

// 定義資料庫 Schema 與 Model
const tycoonSchema = new mongoose.Schema({
    id: { type: String, default: 'main_game_data' },
    partners: { type: Array, default: [] },
    declarations: { type: Array, default: [] },
    messages: { type: Array, default: [] },
    rewardsList: { type: Array, default: [] },
    settings: { type: Object, default: {} }
});

const TycoonModel = mongoose.model('TycoonData', tycoonSchema);

// 取得或初始化雲端資料庫資料
async function getCloudDataFromDB() {
    let data = await TycoonModel.findOne({ id: 'main_game_data' });
    if (!data) {
        data = new TycoonModel({
            id: 'main_game_data',
            settings: {
                startDate: '2026/12/14',
                endDate: '2027/06/02',
                primaryColor: '#f97316',
                headerColor: '#0f172a',
                bgColor: '#FAFAFA',
                newsTitle: '新一代競賽遊戲 🎮 雲端即時同步版！',
                newsContent: '《 競賽大亨 》已全面升級為 MongoDB 雲端同步！',
                ticker1: '🎉 賀！競賽大亨雲端版啟動！MongoDB 資料庫連線中！',
                ticker2: '🔥 歡迎所有夥伴熱血參與！',
                ticker3: '⭐ 隨時隨地跨裝置同步！',
                youtubeUrl: '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allowfullscreen></iframe>',
                youtubeMotto: '🔥 突破自我，創造極限！',
                tags: [
                    { name: 'FYC', isFYC: true, points: 0 },
                    { name: '拜訪', isFYC: false, points: 5 },
                    { name: '增員', isFYC: false, points: 20 },
                    { name: '成交', isFYC: false, points: 50 }
                ],
                boardCells: Array.from({length: 30}, (_, i) => ({
                    icon: i === 0 ? '🚩' : (i % 4 === 1 ? '⭐' : i % 4 === 2 ? '🧠' : i % 4 === 3 ? '📈' : '🎁'),
                    title: i === 0 ? '起點 / 活力充沛' : `第 ${i+1} 關挑戰`,
                    type: i % 5 === 0 ? '傳送' : '普通',
                    reward: '獲得隨機加碼獎勵與前進動能！'
                }))
            }
        });
        await data.save();
    }
    return data;
}

// ==========================================
// 2. 靜態檔案與前端自動注入同步橋接
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        const socketScript = `
            <script src="/socket.io/socket.io.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const socket = io();
                    
                    socket.on('sync_to_client', (serverData) => {
                        if (serverData) {
                            localStorage.setItem('competition_tycoon_data', JSON.stringify(serverData));
                            window.dispatchEvent(new Event('storage'));
                        }
                    });

                    const originalSetItem = localStorage.setItem;
                    localStorage.setItem = function(key, value) {
                        originalSetItem.apply(this, arguments);
                        if (key === 'competition_tycoon_data') {
                            try {
                                const parsedData = JSON.parse(value);
                                socket.emit('client_update_data', parsedData);
                            } catch(e) {}
                        }
                    };
                });
            </script>
        `;
        htmlContent = htmlContent.replace('</head>', socketScript + '</head>');
        res.send(htmlContent);
    } else {
        res.status(404).send('找不到 public/index.html 檔案！');
    }
});

// ==========================================
// 3. Socket.io 即時同步與 MongoDB 寫入
// ==========================================
io.on('connection', async (socket) => {
    let dbData = await getCloudDataFromDB();
    socket.emit('sync_to_client', {
        partners: dbData.partners,
        declarations: dbData.declarations,
        messages: dbData.messages,
        rewardsList: dbData.rewardsList,
        settings: dbData.settings
    });

    socket.on('client_update_data', async (newData) => {
        try {
            await TycoonModel.findOneAndUpdate(
                { id: 'main_game_data' },
                {
                    partners: newData.partners,
                    declarations: newData.declarations,
                    messages: newData.messages,
                    rewardsList: newData.rewardsList,
                    settings: newData.settings
                },
                { upsert: true }
            );

            io.emit('sync_to_client', newData);
        } catch (err) {
            console.error('❌ MongoDB 儲存失敗：', err);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 競賽大亨 MongoDB 雲端伺服器已在 port ${PORT} 啟動！`);
});