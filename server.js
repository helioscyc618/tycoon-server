const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 設定靜態檔案資料階層
app.use(express.static(path.join(__dirname)));

// 路由設定：根目錄指向 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});