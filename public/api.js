import { CONFIG } from './config.js';

class ApiService {
  /**
 * 共用請求包裝器（含錯誤攔截與 Loading 狀態）
 */
  async request(endpoint, options = {}, fallbackData = null) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    this.toggleLoading(true);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`伺服器回應錯誤: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      this.showNotification('雲端同步失敗，目前處於離線快取模式', 'warning');
      
      // 平穩降級：返回預設的 fallback 數據，避免程式崩潰
      return fallbackData;
    } finally {
      this.toggleLoading(false);
    }
  }

  toggleLoading(isLoading) {
    const loader = document.getElementById('global-loading');
    if (loader) {
      loader.classList.toggle('active', isLoading);
    }
  }

  showNotification(message, type = 'info') {
    // 簡單的通知提示邏輯
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // 具體業務 API 方法
  async fetchUserData() {
    return this.request('/user/status', { method: 'GET' }, { success: false, data: null });
  }

  async syncGameData(payload) {
    return this.request('/game/sync', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, { success: false, cached: true });
  }
}

export const api = new ApiService();