const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 設定靜態檔案資料夾
app.use(express.static(path.join(__dirname)));

// 明確指定根目錄回傳 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});