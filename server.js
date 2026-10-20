const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 強制明確指定靜態資料夾
app.use(express.static(path.join(__dirname, 'public')));

// 路由明確指向 public 內的 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});