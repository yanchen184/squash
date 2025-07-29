# 計分賽程競技系統

一個基於 React + Firebase 的賽事管理平台，專為 4 人固定順序賽制設計。

## 🎯 功能特色

### 核心功能
- **固定順序賽制 (4人專用)**: AB → CD → CA → BD → BC → AD
- **自定義玩家名字**: 創建房間時可設定 4 位玩家名字，告別 A/B/C/D 標籤
- **歷史記錄系統**: 自動保存比賽歷史，支持詳細戰績查看和統計分析
- **即時資料庫同步**: Firebase 即時數據同步，多設備協同
- **房間管理**: 6位房間代碼，24小時有效期
- **即時積分統計**: 實時更新積分排行榜
- **多輪比賽**: 支持無限輪次，靈活結束

### 系統特性
- **即時性**: Firebase 即時數據同步，多設備協同
- **可擴展性**: 模組化架構，易於擴展新功能
- **用戶友好**: 直觀的操作界面，點擊即可記錄勝利
- **響應式設計**: 支持桌面和移動端設備

## 🏗️ 技術架構

- **前端**: React 18, React Router DOM
- **後端**: Firebase Realtime Database
- **樣式**: 原生 CSS，響應式設計
- **部署**: GitHub Pages + GitHub Actions

## 📋 使用說明

### 房間管理
1. **創建房間**: 輸入主持人名稱，系統自動生成 6 位房間代碼
2. **加入房間**: 通過房間代碼或房間列表加入
3. **房間狀態**: 等待中 → 進行中 → 已完成

### 比賽流程
1. **玩家設定**: 系統自動分配 A、B、C、D 標籤
2. **對戰順序**: 固定 6 場比賽循環
3. **記錄勝利**: 點擊獲勝玩家記錄結果
4. **即時積分**: 實時更新排行榜
5. **結束比賽**: 手動結束並查看最終結果

### 系統設定
- 可自定義預設玩家名稱
- 設定數據保存至 Firebase
- 多房間共享設定

## 🚀 部署說明

### 在線演示
- **網站**: https://yanchen184.github.io/squash
- **版本**: v1.6.0

### 本地開發
```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm start

# 構建生產版本
npm run build
```

### GitHub Pages 部署
項目配置了 GitHub Actions 自動部署：
- 推送到 `master` 分支自動觸發部署
- 構建產物部署到 `gh-pages` 分支
- 支持 CI=false 環境變量避免警告錯誤

## 🔧 Firebase 配置

系統使用 Firebase Realtime Database 進行數據同步：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCigfC9SYs8RGwRmF4dAnNJ_qyCu_bFSig",
  authDomain: "squash-72502.firebaseapp.com",
  databaseURL: "https://squash-72502-default-rtdb.firebaseio.com",
  projectId: "squash-72502",
  // ... 其他配置
};
```

## 📱 響應式設計

- **桌面端**: 雙欄佈局，完整功能展示
- **移動端**: 單欄佈局，觸控友好
- **平板端**: 自適應佈局

## 🎮 遊戲規則

### 固定對戰順序
1. A vs B
2. C vs D  
3. C vs A
4. B vs D
5. B vs C
6. A vs D

### 積分系統
- 每場勝利得 1 分
- 按積分排序產生排行榜
- 支持多輪比賽累計積分

### 房間管理
- 房間代碼: 6 位隨機數字
- 有效期: 24 小時
- 狀態: 等待中 / 進行中 / 已完成

## 🛠️ 項目結構

```
squash/
├── src/
│   ├── components/          # React 組件
│   │   ├── Home.js         # 首頁
│   │   ├── GameRoom.js     # 遊戲房間
│   │   ├── GameBoard.js    # 遊戲面板
│   │   ├── Leaderboard.js  # 排行榜
│   │   ├── Settings.js     # 設定
│   │   └── ...
│   ├── services/           # 服務層
│   │   ├── firebase.js     # Firebase 配置
│   │   └── database.js     # 數據庫操作
│   ├── utils/              # 工具函數
│   │   └── gameLogic.js    # 遊戲邏輯
│   ├── App.js             # 主應用
│   └── index.js           # 入口文件
├── public/                 # 靜態資源
├── .github/workflows/      # GitHub Actions
└── package.json           # 項目配置
```

## 🔮 未來規劃

- [x] ~~歷史記錄查詢~~ ✅ v1.6.0 已實現
- [x] ~~統計數據分析~~ ✅ v1.6.0 已實現
- [x] ~~玩家名字自定義~~ ✅ v1.6.0 已實現
- [ ] 跨房間個人統計
- [ ] 用戶註冊系統
- [ ] 錦標賽模式
- [ ] 自定義賽制
- [ ] 音效提示

## 📄 許可證

MIT License

## 👥 貢獻

歡迎提交 Issue 和 Pull Request！

---

**版本**: v1.6.0  
**作者**: White/Claude  
**最後更新**: 2025-07-29  
**原始開發**: yanchen184

