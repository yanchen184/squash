// 規則展開面板 — 讓分 + tie-break 簡述
import React, { useState } from 'react';

const RulesPanel = ({ defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rules-panel">
      <button
        className="rules-toggle"
        onClick={() => setOpen(!open)}
      >
        📜 計分 / 讓分 / 加賽規則 {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="rules-content">
          <h4>計分 / 場制</h4>
          <ul>
            <li>每場先達 <b>7 分</b>者贏(6:6 deuce 打到 8:6)</li>
            <li><b>1 輪 = 6 場</b> (4 人全 pair 各打 1 次)</li>
            <li><b>1 round = 3 輪 = 18 場</b> (約 1 小時)</li>
            <li>共 <b>2 round = 36 場</b></li>
            <li><b>每 round 獨立計分</b>,各自決定 1/2/3/4 名;Round 2 開始分數歸零重來</li>
            <li>積分 = 勝利場次;<b>累積總分不影響名次</b></li>
          </ul>

          <h4>讓分</h4>
          <ul>
            <li>每場前看兩人「本 round」累積場勝</li>
            <li>領先方要讓 = 兩人差距分數</li>
            <li>例如累積 5:2 → 領先者讓 3 分,對手從 3 分開始打</li>
          </ul>

          <h4>排名用途</h4>
          <ul>
            <li>區分 1/2/3/4 名 (用於決定誰付場地費,實際金額自行討論)</li>
          </ul>

          <h4>Tie-break (同分決名次)</h4>
          <ul>
            <li>同分名次看的是<b>直接對戰勝負與比分</b>,不是總分</li>
            <li><b>Round 1 末 2 人同分</b> (2/3 或 3/4 名):用 <b>Round 2 第一次交手</b>的勝負決定</li>
            <li><b>Round 1 末 3 人同分</b>:用 <b>Round 2 第 1 輪</b>那 3 人 H2H 決定
              <ul>
                <li>H2H 勝場均等 → 比那幾場 H2H 的比分 (deuce 視 <b>8:6</b>)</li>
                <li>比分一致 → 被讓分多的輸</li>
                <li>還比不出來 → 猜拳</li>
              </ul>
            </li>
            <li><b>Round 2 末 2 人同分</b>:用 <b>Round 2 第 3 輪(決勝輪)</b>那兩人交手的勝負決定</li>
            <li><b>Round 2 末 3 人同分</b>:用 <b>決勝輪</b>那 3 人 H2H 同上規則決定</li>
            <li>因此<b>決勝輪 6 場每場都要輸入比分</b>,系統會自動要求</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default RulesPanel;
