// ==========================================
// API 基礎網址自動切換設定
// ==========================================
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://competition-tycoon.onrender.com';

// ==========================================
// 從雲端資料庫讀取整體狀態
// ==========================================
async function loadServerState() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/state`);
        const result = await response.json();
        
        if (result && result.partners) {
            console.log("成功從雲端載入競賽大亨資料！");
            return result; // 回傳雲端的完整 state 物件
        }
    } catch (error) {
        console.error("無法連線至雲端後端，請檢查網路或 Render 狀態:", error);
    }
    return null;
}

// ==========================================
// 將整體狀態同步儲存至雲端資料庫
// ==========================================
async function saveServerState(stateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/state`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stateData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log("資料已成功同步至 MongoDB 雲端！");
            return true;
        } else {
            console.error("雲端儲存失敗:", result.message);
        }
    } catch (error) {
        console.error("發送同步請求發生錯誤:", error);
    }
    return false;
}