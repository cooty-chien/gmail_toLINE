// ===== app.js =====
// Gmail LIFF 查詢頁面主要邏輯

// ===== LINE User ID =====
// LIFF 初始化成功後會寫入目前使用者的 LINE User ID
let userId = '';


// ==========================================================
// LIFF 初始化
// ==========================================================
window.onload = async function() {
  try {
    // 使用 config.js 中設定的 LIFF ID 初始化 LIFF
    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    // 如果尚未登入 LINE，導向 LINE Login
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 取得目前 LINE 使用者資料
    const profile = await liff.getProfile();

    // 保存 LINE User ID
    userId = profile.userId;

    // LIFF 初始化完成，可以開始查詢
    showStatus(
      '🟢',
      '已連線，可以開始查詢',
      'success'
    );

    // 啟用查詢按鈕
    document.getElementById('searchBtn').disabled = false;

  } catch (error) {

    // LIFF 初始化失敗
    showStatus(
      '❌',
      'LIFF 初始化失敗',
      'error'
    );

    console.error('LIFF 初始化錯誤：', error);

    // 在 Query 區域顯示錯誤資訊，方便除錯
    const queryPanel =
      document.getElementById('queryPanel');

    const queryPreview =
      document.getElementById('queryPreview');

    queryPanel.classList.remove('hidden');

    queryPreview.textContent =
      '錯誤：' + JSON.stringify(error);
  }
};


// ==========================================================
// 日期類型切換
// ==========================================================
function changeDateType() {
  const type =
    document.getElementById('dateType').value;

  const customDate =
    document.getElementById('customDate');

  // 只有選擇「自訂日期」時才顯示日期區間
  customDate.classList.toggle(
    'hidden',
    type !== 'custom'
  );
}


// ==========================================================
// Gmail 查詢
// ==========================================================
function searchGmail() {

  // 建立 Gmail Query
  const query = buildQuery();

  // 沒有任何查詢條件
  if (!query) {
    showStatus(
      '⚠️',
      '請至少輸入一個查詢條件',
      'error'
    );
    return;
  }

  // 尚未取得 LINE User ID
  if (!userId) {
    showStatus(
      '⚠️',
      '尚未取得 LINE User ID',
      'error'
    );
    return;
  }

  // 取得是否使用 AI
  const useAI =
    document.getElementById('useAI').checked;

  // 取得查詢按鈕
  const button =
    document.getElementById('searchBtn');

  // 防止重複查詢
  button.disabled = true;

  // 顯示查詢進度
  showStatus(
    '⏳',
    useAI
      ? '正在查詢 Gmail 並產生 AI 摘要...'
      : '正在查詢 Gmail...',
    'processing'
  );

  // 顯示實際 Gmail Query
  showQueryPreview(
    query,
    useAI
  );

  // ========================================================
  // 將查詢送到 GAS
  //
  // 注意：
  // 目前 GitHub Pages 使用 no-cors，
  // 因此瀏覽器無法直接讀取 GAS 回傳內容。
  // 這裡只能確認 Request 已送出。
  // ========================================================
  fetch(CONFIG.GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify({
      action: 'searchGmail',
      query: query,
      userId: userId,
      useAI: useAI
    })
  })

  // ========================================================
  // Request 已送出
  // ========================================================
  .then(function() {

    showStatus(
      '📤',
      useAI
        ? '查詢已送出，AI 正在整理結果...'
        : '查詢已送出，正在整理結果...',
      'processing'
    );

    // 目前因為 no-cors 無法知道 GAS 實際完成時間，
    // 因此先等待幾秒再提示使用者。
    return new Promise(function(resolve) {
      setTimeout(resolve, 3000);
    });
  })

  // ========================================================
  // 顯示完成狀態
  // ========================================================
  .then(function() {

    showStatus(
      '✅',
      '查詢完成！請到 LINE 查看查詢結果。',
      'success'
    );
  })

  // ========================================================
  // 發生錯誤
  // ========================================================
  .catch(function(error) {

    console.error(
      'Gmail 查詢錯誤：',
      error
    );

    showStatus(
      '❌',
      '查詢送出失敗：' +
      error.message,
      'error'
    );
  })

  // ========================================================
  // 不論成功或失敗，都恢復查詢按鈕
  // ========================================================
  .finally(function() {

    button.disabled = false;

    button.innerHTML =
      '<span>🔍</span><span>再次查詢</span>';
  });
}


// ==========================================================
// 建立 Gmail Query
// ==========================================================
function buildQuery() {

  const parts = [];

  // 取得日期類型
  const dateType =
    document.getElementById('dateType').value;

  // 取得篩選條件
  const unread =
    document.getElementById('unread').checked;

  const attachment =
    document.getElementById('attachment').checked;

  const from =
    document.getElementById('from').value.trim();

  const subject =
    document.getElementById('subject').value.trim();

  const keyword =
    document.getElementById('keyword').value.trim();

  // 取得今天日期
  const today = new Date();

  const todayText =
    formatGmailDate(today);


  // ========================================================
  // 日期條件
  // ========================================================

  if (dateType === 'today') {

    parts.push(
      'after:' + todayText
    );

  } else if (dateType === 'yesterday') {

    // 計算昨天日期
    const yesterday =
      new Date(today);

    yesterday.setDate(
      yesterday.getDate() - 1
    );

    parts.push(
      'after:' +
      formatGmailDate(yesterday)
    );

    parts.push(
      'before:' +
      todayText
    );

  } else if (dateType === '7') {

    parts.push(
      'newer_than:7d'
    );

  } else if (dateType === '30') {

    parts.push(
      'newer_than:30d'
    );

  } else if (dateType === 'custom') {

    const start =
      document.getElementById('startDate').value;

    const end =
      document.getElementById('endDate').value;

    // 自訂開始日期
    if (start) {

      parts.push(
        'after:' +
        start.replace(/-/g, '/')
      );
    }

    // 自訂結束日期
    if (end) {

      const endDate =
        new Date(end + 'T00:00:00');

      // Gmail before 不包含當天，
      // 因此結束日期需要 +1 天。
      endDate.setDate(
        endDate.getDate() + 1
      );

      parts.push(
        'before:' +
        formatGmailDate(endDate)
      );
    }
  }


  // ========================================================
  // 其他篩選條件
  // ========================================================

  // 只看未讀
  if (unread) {
    parts.push('is:unread');
  }

  // 只看附件
  if (attachment) {
    parts.push('has:attachment');
  }

  // 寄件者
  if (from) {
    parts.push('from:' + from);
  }

  // 主旨
  if (subject) {
    parts.push('subject:' + subject);
  }

  // 內容關鍵字
  if (keyword) {
    parts.push(keyword);
  }

  // 組合成 Gmail Query
  return parts.join(' ');
}


// ==========================================================
// Gmail 日期格式
//
// JavaScript Date
// ↓
// Gmail Query
//
// 例如：
// 2026/08/19
// ==========================================================
function formatGmailDate(date) {

  return date.getFullYear() +
    '/' +
    String(
      date.getMonth() + 1
    ).padStart(2, '0') +
    '/' +
    String(
      date.getDate()
    ).padStart(2, '0');
}


// ==========================================================
// 顯示狀態訊息
//
// icon：狀態圖示
// text：訊息內容
// type：loading / success / processing / error
// ==========================================================
function showStatus(
  icon,
  text,
  type
) {

  const status =
    document.getElementById('status');

  status.className =
    'status status-' + type;

  status.innerHTML =
    '<span class="status-icon">' +
    icon +
    '</span>' +
    '<span class="status-text">' +
    escapeHtml(text) +
    '</span>';
}


// ==========================================================
// 顯示 Gmail Query
// ==========================================================
function showQueryPreview(
  query,
  useAI
) {

  const panel =
    document.getElementById('queryPanel');

  const preview =
    document.getElementById('queryPreview');

  // 顯示 Query 區塊
  panel.classList.remove('hidden');

  // 顯示實際送給 Gmail 的 Query
  preview.textContent =
    'Gmail Query：' +
    query +
    (useAI
      ? '  ｜  AI 摘要：開啟'
      : '  ｜  AI 摘要：關閉');
}


// ==========================================================
// HTML Escape
//
// 狀態文字如果未來包含特殊字元，
// 避免直接插入 HTML。
// ==========================================================
function escapeHtml(text) {

  const div =
    document.createElement('div');

  div.textContent =
    String(text);

  return div.innerHTML;
}
