import { CONFIG } from './config.js';
import { api } from './api.js';
import { debounce, throttle } from './utils.js';

class CompetitionGame {
  constructor() {
    this.state = {
      fyc: 0,
      availablePoints: 0,
      totalPoints: 0,
      diceCount: 0,
      currentPosition: 1
    };
    
    this.init();
  }

  async init() {
    // 1. 非同步取得遠端資料（帶有 Fallback 保護）
    const response = await api.fetchUserData();
    if (response?.data) {
      this.state = { ...this.state, ...response.data };
    }

    this.renderBoard();
    this.renderUserInfo();
    this.bindEvents();

    // 2. 初始化載入指揮中心的相關設定與激勵影片
    this.loadEventPeriodSettings();
    this.loadMotivationVideo();
  }

  /**
   * DOM 操作最佳化：使用 DocumentFragment 批次生成棋盤格子
   */
  renderBoard() {
    const boardContainer = document.getElementById('game-board');
    if (!boardContainer) return;

    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= CONFIG.TOTAL_GRIDS; i++) {
      const cell = document.createElement('div');
      const isCurrent = i === this.state.currentPosition;
      
      cell.className = `grid-cell ${isCurrent ? 'current-position' : ''}`;
      cell.textContent = CONFIG.REWARD_TABLE[i]?.label || `第 ${i} 格`;
      
      fragment.appendChild(cell);
    }

    // 清空後一次性寫入 DOM，降低 Reflow / Repaint 成本
    boardContainer.innerHTML = '';
    boardContainer.appendChild(fragment);
  }

  renderUserInfo() {
    // 現代語法解構與安全取值
    const { fyc = 0, availablePoints = 0, diceCount = 0 } = this.state;
    
    const fycEl = document.getElementById('fyc-total');
    const pointsEl = document.getElementById('points-available');
    const diceEl = document.getElementById('dice-count');

    if (fycEl) fycEl.textContent = `$${fyc.toLocaleString()}`;
    if (pointsEl) pointsEl.textContent = availablePoints;
    if (diceEl) diceEl.textContent = diceCount;
  }

  bindEvents() {
    const rollButton = document.getElementById('roll-dice-btn');
    if (rollButton) {
      // 結合節流機制，防止玩家快速連擊按鈕
      rollButton.addEventListener('click', throttle(async () => {
        await this.handleRollDice();
      }, 1000));
    }

    // 綁定「儲存競賽期間」按鈕事件
    const savePeriodBtn = document.getElementById('save-event-period-btn');
    if (savePeriodBtn) {
      savePeriodBtn.addEventListener('click', async () => {
        await this.handleSaveEventPeriod();
      });
    }

    // 綁定「儲存激勵影片」按鈕事件
    const saveYoutubeBtn = document.getElementById('save-youtube-btn');
    if (saveYoutubeBtn) {
      saveYoutubeBtn.addEventListener('click', async () => {
        await this.handleSaveYoutubeVideo();
      });
    }

    // 結合防抖機制，優化視窗縮放效能
    window.addEventListener('resize', debounce(() => {
      this.handleWindowResize();
    }, 300));
  }

  async handleRollDice() {
    try {
      // 模擬擲骰子與更新狀態
      this.state.diceCount = (this.state.diceCount ?? 0) + 1;
      this.state.currentPosition = (this.state.currentPosition % CONFIG.TOTAL_GRIDS) + 1;

      this.renderBoard();
      this.renderUserInfo();

      // 非同步同步至雲端
      const syncResult = await api.syncGameData(this.state);
      if (syncResult?.cached) {
        console.warn('資料已暫存於本地，等待網路恢復後同步');
      }
    } catch (error) {
      console.error('擲骰子流程發生預期外的錯誤:', error);
    }
  }

  /**
   * 儲存競賽期間設定
   */
  async handleSaveEventPeriod() {
    const startDate = document.getElementById('event-start-date')?.value;
    const endDate = document.getElementById('event-end-date')?.value;

    if (!startDate || !endDate) {
      alert('請完整填寫開始與結束日期');
      return;
    }

    try {
      const response = await fetch('/v1/settings/period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate })
      });
      const result = await response.json();
      alert(result.message || '競賽期間儲存成功');
    } catch (error) {
      console.error('儲存競賽期間失敗:', error);
      alert('儲存失敗，請檢查網路連線');
    }
  }

  /**
   * 載入競賽期間設定
   */
  async loadEventPeriodSettings() {
    // 之後若有對應的 GET 路由可在此擴充，目前維持表單預設
  }

  /**
   * 將一般 YouTube 網址轉為 Embed 嵌入格式
   */
  getEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }

  /**
   * 儲存 YouTube 激勵影片設定
   */
  async handleSaveYoutubeVideo() {
    const urlInput = document.getElementById('youtube-url-input');
    const url = urlInput ? urlInput.value.trim() : '';

    try {
      const response = await fetch('/v1/settings/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const result = await response.json();
      alert(result.message || '激勵影片設定儲存成功');
      this.loadMotivationVideo();
    } catch (error) {
      console.error('儲存激勵影片失敗:', error);
      alert('儲存失敗，請檢查網路連線');
    }
  }

  /**
   * 載入並渲染 YouTube 激勵影片
   */
  async loadMotivationVideo() {
    try {
      const response = await fetch('/v1/settings/youtube');
      const data = await response.json();
      const embedBox = document.getElementById('video-embed-box');
      const urlInput = document.getElementById('youtube-url-input');

      if (data.url && urlInput) {
        urlInput.value = data.url;
      }

      if (embedBox) {
        if (data.url) {
          const embedUrl = this.getEmbedUrl(data.url);
          if (embedUrl) {
            embedBox.innerHTML = `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allowfullscreen style="max-width: 560px; border-radius: 6px;"></iframe>`;
          } else {
            embedBox.innerHTML = '<p style="color: #e53935;">無效的 YouTube 網址格式</p>';
          }
        } else {
          embedBox.innerHTML = '<p style="color: #888;">尚無設定激勵影片</p>';
        }
      }
    } catch (error) {
      console.error('載入激勵影片失敗:', error);
    }
  }

  handleWindowResize() {
    console.log('視窗大小已調整，執行響應式排版修正...');
  }
}

// 當 DOM 載入完成後啟動遊戲主程式
document.addEventListener('DOMContentLoaded', () => {
  new CompetitionGame();
});