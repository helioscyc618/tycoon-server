const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 託管 public 資料夾中的靜態檔案（圖片、CSS、JS 等）
app.use(express.static(path.join(__dirname, 'public')));

// 雲端記憶體資料庫（儲存 60 位夥伴的所有資料、排行榜、點數、棋盤位置、審核等）
let cloudData = {
    partners: [],
    declarations: [],
    messages: [],
    rewardsList: [],
    settings: {}
};

// 覆寫根目錄請求：讀取 public/index.html 並自動注入 Socket.io 雲端同步腳本
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 自動在 </head> 前面注入 Socket.io 即時同步橋接程式碼
        const socketScript = `
            <script src="/socket.io/socket.io.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const socket = io();
                    
                    // 接收來自雲端的最新資料並更新本機與畫面
                    socket.on('sync_to_client', (serverData) => {
                        if (serverData && Object.keys(serverData).length > 0) {
                            localStorage.setItem('competition_tycoon_data', JSON.stringify(serverData));
                            // 如果你的 Alpine.js 實例有提供重新載入或同步的方法，可在此觸發
                            window.dispatchEvent(new Event('storage'));
                        }
                    });

                    // 攔截並取代你原本的 saveData，讓每次資料變動自動即時上傳到雲端伺服器
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
        res.status(404).send('找不到 public/index.html 檔案！請確認你的完整版 HTML 是否正確放在 public 資料夾內。');
    }
});

// Socket.io 雲端即時通訊
io.on('connection', (socket) => {
    // 當有新夥伴連線時，立刻發送目前的雲端資料
    socket.emit('sync_to_client', cloudData);

    // 接收客戶端的操作更新，並瞬間廣播同步給線上所有 60 個人
    socket.on('client_update_data', (newData) => {
        cloudData = newData;
        io.emit('sync_to_client', cloudData);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 競賽大亨雲端伺服器已在 port ${PORT} 啟動！`);
});