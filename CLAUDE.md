# 計分賽程競技系統 - 產品需求文檔

## 📋 專案概述

**專案名稱**：計分賽程競技系統  
**目標**：為 4 人固定順序賽制提供完整的賽事管理平台  
**技術棧**：React 18 + Firebase Realtime Database  
**版本**：v1.7.0（完整玩家名字系統和全局歷史記錄功能）

---

## 🎯 核心功能現況

### 已實現功能
- **固定順序賽制**：AB → CD → CA → BD → BC → AD（6場循環）
- **位置輪動系統**：第二輪開始，玩家位置按 A→B→C→D→A 規則輪動
- **即時數據同步**：Firebase 即時數據庫同步，多設備協同
- **房間管理**：6位房間代碼，24小時有效期
- **即時積分統計**：實時更新積分排行榜
- **TBC 顯示邏輯**：動態對戰者確認機制
- **響應式設計**：支持桌面和移動端設備

### 當前限制
- 玩家標識使用 A/B/C/D 標籤，缺乏個人化
- 比賽結束後無法查看歷史戰績
- 無法追蹤長期表現和統計數據

---

## 🚀 新功能需求

### 需求 1：玩家名字替換標籤系統
**優先級**：🔴 高  
**目標**：將 A/B/C/D 標籤替換為真實玩家名字，提升個人化體驗

#### 功能描述
- 房間創建時要求輸入 4 位玩家名字
- 所有 UI 界面顯示玩家名字而非字母標籤
- 保持底層 A/B/C/D 邏輯不變，確保現有功能正常運作
- 在位置輪動系統中，名字正確跟隨位置變化

#### 技術實現方案
```javascript
// 建議的數據結構
const playerMapping = {
  A: { id: 'A', name: '張三', originalPosition: 'A' },
  B: { id: 'B', name: '李四', originalPosition: 'B' },
  C: { id: 'C', name: '王五', originalPosition: 'C' },
  D: { id: 'D', name: '趙六', originalPosition: 'D' }
};
```

#### 用戶體驗要求
- 名字長度限制：2-8 個中文字符或 4-12 個英文字符
- 提供預設名字選項（玩家1、玩家2等）
- 在所有對戰界面確保名字清晰可讀
- 支持名字重複但添加位置標識符以區分

#### 影響範圍
- `GameRoom.js`：玩家設定界面
- `GameBoard.js`：對戰顯示
- `MatchSchedule.js`：賽程表顯示
- `Leaderboard.js`：排行榜顯示
- Firebase 數據結構擴展

---

### 需求 2：歷史記錄功能
**優先級**：🟡 中高  
**目標**：提供比賽歷史記錄的儲存和查看功能，增強用戶參與度

#### 功能描述
**Phase 1：基礎歷史記錄**
- 自動儲存每場比賽結果（對戰者、勝者、時間戳）
- 儲存每輪積分變化
- 比賽結束後顯示完整戰績總覽

**Phase 2：進階歷史功能**
- 個人對戰矩陣（A vs B 的歷史勝負記錄）
- 個人統計數據（總比賽數、勝率、最佳表現）
- 房間歷史記錄頁面

#### 技術實現方案
```javascript
// Firebase 數據結構擴展
const historySchema = {
  roomId: 'string',
  roomName: 'string',
  players: {
    A: { name: 'string', finalScore: 'number' },
    B: { name: 'string', finalScore: 'number' },
    C: { name: 'string', finalScore: 'number' },
    D: { name: 'string', finalScore: 'number' }
  },
  matches: [
    {
      round: 'number',
      matchNumber: 'number',
      player1: { id: 'string', name: 'string' },
      player2: { id: 'string', name: 'string' },
      winner: { id: 'string', name: 'string' },
      timestamp: 'timestamp'
    }
  ],
  gameEndTime: 'timestamp',
  totalRounds: 'number'
};
```

#### 用戶界面設計
- **歷史總覽頁**：顯示最終積分排行和基本統計
- **詳細戰績頁**：按輪次展示每場比賽結果
- **個人統計頁**：顯示個人勝率和對戰記錄
- **快速存取**：比賽結束後一鍵查看歷史

#### 數據管理策略
- 歷史記錄保存 30 天後自動清理（成本控制）
- 重要統計數據永久保存
- 支援歷史數據匯出（JSON 格式）

---

## 🔧 技術實現計畫

### 開發階段規劃

**Stage 1：玩家名字功能（Week 1-2）**
1. 修改房間創建流程，添加玩家名字輸入
2. 更新所有顯示組件，替換 A/B/C/D 為玩家名字
3. 確保位置輪動邏輯正確處理名字顯示
4. 進行全面測試，確保向後兼容

**Stage 2：歷史記錄基礎功能（Week 3-4）**
1. 擴展 Firebase 數據結構
2. 實現比賽過程中的歷史數據收集
3. 創建歷史記錄查看組件
4. 添加比賽結束後的歷史總覽

**Stage 3：歷史記錄進階功能（Week 5-6）**
1. 實現個人統計和對戰矩陣
2. 添加歷史數據管理（清理、匯出）
3. 優化用戶界面和用戶體驗
4. 完整測試和性能優化

### 檔案結構變更
```
src/
├── components/
│   ├── History/              # 新增：歷史記錄組件
│   │   ├── HistoryOverview.js
│   │   ├── MatchDetails.js
│   │   └── PlayerStats.js
│   ├── GameRoom.js           # 修改：添加玩家名字設定
│   ├── GameBoard.js          # 修改：顯示玩家名字
│   ├── MatchSchedule.js      # 修改：顯示玩家名字
│   └── Leaderboard.js        # 修改：顯示玩家名字
├── services/
│   ├── historyService.js     # 新增：歷史記錄服務
│   └── database.js           # 修改：擴展數據操作
└── utils/
    └── gameLogic.js          # 修改：支持玩家名字邏輯
```

---

## 📊 成功指標與測試

### 關鍵績效指標（KPI）
- **功能使用率**：80% 的房間使用自定義玩家名字
- **歷史查看率**：60% 的完成比賽會查看歷史記錄
- **用戶滿意度**：透過功能使用頻率評估
- **系統穩定性**：新功能不影響現有功能表現

### 測試場景
**玩家名字功能測試：**
- 創建房間時輸入各種長度和字符的名字
- 驗證輪動系統中名字顯示正確性
- 測試重複名字的處理機制
- 確保響應式設計在不同螢幕尺寸下正常

**歷史記錄功能測試：**
- 完整比賽流程的數據記錄準確性
- 多輪比賽的歷史數據累積
- 歷史查看界面的用戶體驗
- Firebase 數據一致性和性能測試

---

## 🎮 用戶體驗考量

### 設計原則
- **簡潔性**：保持現有界面的簡潔風格
- **一致性**：新功能與現有設計語言統一
- **直觀性**：功能操作符合用戶直覺
- **性能**：新功能不影響系統反應速度

### 用戶引導
- 首次使用時提供玩家名字設定引導
- 歷史記錄功能的使用說明和入口提示
- 保持學習成本最低，避免複雜操作

---

## 🔮 未來擴展規劃

### 短期規劃（v1.3.0）
- 優化歷史記錄界面設計
- 添加數據匯出功能
- 實現跨房間個人統計

### 中期規劃（v1.4.0）
- 用戶註冊系統
- 全平台個人歷史追蹤
- 社群功能和分享機制

### 長期規劃（v2.0.0）
- 錦標賽模式
- 進階數據分析和視覺化
- 多平台同步和備份

---

## 📝 備註

**開發優先順序**：
1. 🔴 玩家名字替換功能（影響核心用戶體驗）
2. 🟡 基礎歷史記錄功能（增加產品價值）
3. 🟢 進階歷史統計功能（提升用戶黏性）

**風險管控**：
- 保持向後相容性，確保現有房間正常運作
- Firebase 成本控制，實施合理的數據清理策略
- 漸進式部署，避免影響線上服務穩定性

**技術債務**：
- 考慮重構部分組件以提高代碼可維護性
- 添加適當的錯誤處理和用戶反饋機制
- 建立完整的測試覆蓋率

---

## 🔄 開發異動記錄

### v1.7.0 更新記錄 (2025-07-29)

#### ✅ 已完成功能

**1. 玩家名字系統**
- **RoomCreator.js**：
  - 新增玩家名字輸入界面，支持創建房間時設定 4 位玩家名字
  - 字數限制：最多 8 個字符
  - 提供預設名字機制（留空自動使用「玩家 A」等）
  - 實時驗證和用戶友好的輸入體驗

- **GameBoard.js**：
  - 修改顯示邏輯：玩家名字為主要顯示，A/B/C/D 標籤為輔助標識
  - 桌面版和手機版界面統一更新
  - 保持底層 A/B/C/D 邏輯不變，確保現有功能正常運作

- **GameRoom.js**：
  - 更新手機版對戰界面的玩家名字顯示
  - 統一使用 `.main-name` 和 `.secondary` 樣式類

- **CSS 樣式**：
  - 新增 `.player-name.main-name` 樣式：24px 字體，藍色主題色
  - 新增 `.player-label.secondary` 樣式：14px 字體，灰色輔助顯示
  - 完整的響應式設計支援

**2. 歷史記錄系統**
- **database.js**：
  - 擴展 `finishTournament` 函數，自動保存比賽歷史記錄
  - 新增歷史記錄數據結構：包含玩家名字、最終積分、比賽過程等
  - 實現歷史數據清理機制（30天自動清理）

- **HistoryModal.js**：
  - 創建完整的歷史記錄查看界面
  - 三個標籤頁：總覽、比賽記錄、統計數據
  - 總覽頁：比賽基本信息、最終排名
  - 比賽記錄頁：每場比賽的詳細結果和時間戳
  - 統計數據頁：個人勝率、對戰矩陣

- **ResultsModal.js**：
  - 在比賽結果模態窗口中新增「查看歷史記錄」按鈕
  - 實現歷史記錄和結果頁面的無縫切換

- **CSS 樣式**：
  - 完整的歷史記錄模態窗口樣式設計
  - 標籤頁切換動效和響應式布局
  - 勝利者高亮、勝負狀態顯示等視覺效果

#### 🔧 技術修復

**Bug 修復**：
- 修復玩家名字顯示問題：從 A/B/C/D 標籤改為以玩家名字為主要顯示
- 修復歷史記錄功能：簡化歷史數據的對戰組合邏輯，確保歷史記錄正確顯示
- 清理未使用的變數和 import，通過構建檢查

**代碼優化**：
- 移除 `getCurrentMatchOrder` 和 `getPlayerRotationInfo` 等未使用的函數引用
- 優化歷史記錄的數據處理邏輯
- 改進響應式設計的手機版適配

#### 📊 功能驗證

**構建測試**：
- ✅ npm install 成功
- ✅ npm run build 成功（無警告）
- ✅ 所有新功能通過構建檢查

**功能完整性**：
- ✅ 玩家名字創建和顯示功能正常
- ✅ 歷史記錄保存和查看功能正常
- ✅ 響應式設計在不同設備上正常運作

#### 🆕 v1.7.0 新增功能

**3. 玩家名字系統優化**
- **預設名字更新**：white, bob, jimmy, dada
- **顯示邏輯改進**：優先顯示玩家名字，標籤作為後備
- **動態對戰順序優化**：移除 A(user1) 格式，直接顯示玩家名字
- **當前對戰界面簡化**：移除底下的標籤顯示

**4. 全局歷史記錄系統**
- **GlobalHistoryModal.js**：
  - 創建大廳頁面歷史記錄查看功能
  - 顯示所有已完成比賽的列表
  - 支持點擊查看詳細比賽過程和比分
  - 完整的歷史數據展示和統計

- **Home.js**：
  - 新增「📊 歷史記錄」按鈕
  - 與現有創建房間按鈕並列顯示
  - 完整的模態窗口整合

**5. 版本號同步系統**
- 統一更新遊戲內所有版本號顯示
- Home.js、GameRoom.js、database.js 版本號同步
- README.md 和 CLAUDE.md 文檔版本號同步

#### 🎯 下一步計劃

1. **用戶測試**：收集用戶對新功能的反饋
2. **性能優化**：監控 Firebase 數據使用量，優化查詢效率
3. **功能擴展**：考慮實現跨房間個人統計功能

---

## 🔧 程式碼優化分析與改進計畫

### 📊 優化分析總覽 (2025-08-05)

透過 Gemini 深度分析，識別出當前專案從 MVP 到生產就緒應用的關鍵優化點。分析涵蓋架構設計、效能優化、安全性、程式碼品質、用戶體驗和擴展性六大面向。

### 🔴 最高優先級改進項目

#### 1. 專案結構整理
**問題**：混合 CRA 和 Vite 慣例導致構建配置不一致
- `App.jsx`：Vite 預設模板檔案（需刪除）
- `main.jsx`：實際入口點但不符合 CRA 慣例
- `App.js`：真正的應用邏輯檔案

**解決方案**：
- 刪除 `src/App.jsx`（Vite 殘留）
- 重新命名 `src/main.jsx` → `src/index.jsx` 
- 重新命名 `src/App.js` → `src/App.jsx`
- 統一採用 CRA 標準結構

#### 2. Firebase 安全性強化
**問題**：API 金鑰直接暴露在程式碼中
- `firebase.js` 中硬編碼配置資訊
- 缺乏應用程式驗證機制
- 可能存在安全規則漏洞

**解決方案**：
```javascript
// .env.local
REACT_APP_API_KEY="AIzaSyC..."
REACT_APP_AUTH_DOMAIN="squash-72502.firebaseapp.com"
REACT_APP_DATABASE_URL="https://squash-72502-default-rtdb.firebaseio.com"
// ... 其他配置

// firebase.js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  // ...
};
```

**進階安全措施**：
- 實作 Firebase Security Rules 細粒度權限控制
- 導入 Firebase App Check + reCAPTCHA v3 防止濫用
- 成本效益：免費且零用戶體驗影響

#### 3. 路由架構重構
**問題**：刷新頁面會丟失房間狀態
- 使用 `useState` 進行頁面切換而非真實路由
- 無法分享房間連結
- 用戶體驗不佳

**解決方案**：
```javascript
// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter basename="/squash">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomCode" element={<GameRoom />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**邊緣情況處理**：
- 不存在的房間：顯示錯誤並導向首頁
- 過期房間：檢查 24 小時有效期
- 權限錯誤：優雅的錯誤處理
- 多標籤頁：Firebase 自動同步狀態

### 🟡 中高優先級改進項目

#### 4. 效能優化 - 細粒度監聽
**問題**：監聽整個房間物件導致不必要的重新渲染
```javascript
// 現況：任何變更都會觸發全組件重新渲染
subscribeToRoom(roomCode, callback) // 監聽整個 rooms/{roomCode}
```

**優化方案**：使用選擇器模式
```javascript
// 新架構：使用 useSyncExternalStore
function createGameStore(roomCode) {
  let state = {};
  const listeners = new Set();

  const unsubscribes = [
    onValue(ref(db, `rooms/${roomCode}/players`), (snap) => {
      state = { ...state, players: snap.val() };
      listeners.forEach((l) => l());
    }),
    onValue(ref(db, `rooms/${roomCode}/matches`), (snap) => {
      state = { ...state, matches: snap.val() };
      listeners.forEach((l) => l());
    }),
  ];

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() { return state; },
    cleanup() { unsubscribes.forEach(unsub => unsub()); }
  };
}

// 組件中使用
const players = useGameStore((state) => state.players);
```

**效益**：
- 只有相關組件在數據變更時重新渲染
- Firebase SDK 在單一 WebSocket 上多工處理
- 大幅提升複雜互動場景的效能

#### 5. 元件架構重構
**問題**：GameRoom.js 成為 "God Component"（315行）
- 管理過多職責：數據獲取、狀態更新、UI 邏輯、響應式處理
- 難以維護和測試
- Prop drilling 問題嚴重

**解決方案**：
- 建立 `RoomContext` 提供狀態管理
- 拆分為 `GameRoomMobileView` 和 `GameRoomDesktopView`
- 子組件直接使用 `useContext` 取得數據
- 採用 CSS Modules 避免樣式衝突

### 🟢 中等優先級改進項目

#### 6. 程式碼品質提升
**重複邏輯提取**：
```javascript
// 自定義 Hook 範例
export const useMatchScoreInfo = (scores, player1, player2, playerNames) => {
  return useMemo(() => {
    const p1Score = scores?.[player1] || 0;
    const p2Score = scores?.[player2] || 0;
    const difference = Math.abs(p1Score - p2Score);
    const leadingPlayer = p1Score > p2Score ? (playerNames?.[player1] || player1) : 
                          p2Score > p1Score ? (playerNames?.[player2] || player2) : null;
    return { p1Score, p2Score, difference, leadingPlayer };
  }, [scores, player1, player2, playerNames]);
};
```

**測試策略**：
- 從 `utils/gameLogic.js` 開始建立單元測試
- 將 `rotationTest.js` 改寫為 Jest 測試用例
- 逐步擴展到組件整合測試

#### 7. 用戶體驗改善
**統一通知系統**：
- 引入輕量級 toast 通知（如 `react-hot-toast`）
- 取代侵入性的 `alert()` 
- 建立一致的錯誤反饋機制

**樂觀更新**：
- 操作立即更新本地 UI
- 失敗時回滾狀態
- 提升應用反應速度

### 🔮 長期擴展規劃

#### 8. 架構擴展準備
**服務模組化**：
```
src/services/
├── roomService.js      # 房間管理
├── historyService.js   # 歷史記錄（已存在）
├── settingsService.js  # 系統設定
└── userService.js      # 未來用戶系統
```

**遊戲邏輯抽象化**：
- 策略模式支援多種賽制
- 為錦標賽模式預留擴展空間

#### 9. 技術債務處理
**TypeScript 遷移**：
- 新檔案採用 `.ts/.tsx`
- 為數據結構定義 `interface`
- 逐步遷移現有組件

### 📈 實施策略與優先順序

**Phase 1 (Week 1-2)：基礎架構穩固**
1. 清理專案結構混亂
2. 實作 Firebase 安全性改進
3. 導入 React Router 路由系統

**Phase 2 (Week 3-4)：效能與架構優化**
1. 細粒度 Firebase 監聽器重構
2. GameRoom 組件拆分與 Context 實作
3. CSS Modules 遷移

**Phase 3 (Week 5-6)：品質與體驗提升**
1. 單元測試建立
2. 統一錯誤處理與通知系統
3. 用戶體驗細節優化

### 🎯 成功指標

**技術指標**：
- 構建時間縮短 20%
- 頁面重新渲染次數減少 60%
- 程式碼覆蓋率達到 70%

**用戶體驗指標**：
- 頁面刷新不再丟失狀態
- 操作反應時間提升 50%
- 錯誤處理更加友善

**安全性指標**：
- Firebase Security Rules 覆蓋所有資料路徑
- App Check 攔截非法存取
- 敏感資料不再暴露於程式碼中

### 📝 技術決策記錄

**關鍵決策理由**：
1. **Firebase 前端金鑰暴露**：正常設計模式，真正安全來自 Security Rules
2. **URL 狀態重載 vs localStorage**：前者確保資料一致性，後者可能過期
3. **細粒度監聽 ROI**：Firebase SDK 單一連線多工，效能提升顯著
4. **現代 React 模式**：`useSyncExternalStore` 是處理外部狀態的最佳實踐

---

*文檔版本*：v1.2  
*最後更新*：2025-08-05  
*負責人*：White/Claude 協作開發團隊