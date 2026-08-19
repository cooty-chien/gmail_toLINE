// ===== app.js =====
// Gmail LIFF 查詢頁面主要邏輯

// ===== LINE User ID =====
// LIFF 初始化成功後，保存目前 LINE 使用者的 User ID
let userId = '';


// ==========================================================
// LIFF 初始化
// ==========================================================
window.onload = async function() {
  try {
    // 使用 config.js 裡的 LIFF ID 初始化 LIFF
    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    // 如果使用者尚未登入 LINE
    // 導向 LINE Login
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 取得 LINE 使用者資料
    const profile = await liff.getProfile();

    // 保存 LINE User ID
    userId = profile.userId;

    // 顯示已連線
    showStatus(
      '',
      '已連線，可以開始查詢',
      'success'
    );

    // LIFF 初始化完成後才能查詢
    document.getElementById('searchBtn').disabled = false;

  } catch (error) {

    // LIFF 初始化失敗
    showStatus(
      '',
      'LIFF 初始化失敗',
      'error'
    );

    console.error(
      'LIFF 初始化錯誤：',
      error
    );

    // 顯示錯誤內容方便除錯
    const queryPanel =
      document.getElementById('queryPanel');

    const queryPreview =
      document.getElementById('queryPreview');

    queryPanel.classList.remove('hidden');

    queryPreview.textContent =
      '錯誤：' +
      JSON.stringify(error);
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

  // 只有選擇「自訂日期」才顯示日期輸入
  customDate.classList.toggle(
    'hidden',
    type !== 'custom'
  );
}


// ==========================================================
// 查詢 Gmail
// ==========================================================
function searchGmail() {

  // 建立 Gmail Query
  const query = buildQuery();

  // 沒有查詢條件
  if (!query) {

    showStatus(
      '',
      '請至少輸入一個查詢條件',
      'error'
    );

    return;
  }

  // 尚未取得 LINE User ID
  if (!userId) {

    showStatus(
      '',
      '尚未取得 LINE User ID',
      'error'
    );

    return;
  }

  // 是否使用 AI 摘要
  const useAI =
    document.getElementById('useAI').checked;

  // 查詢按鈕
  const button =
    document.getElementById('searchBtn');

  // 避免重複送出
  button.disabled = true;

  // 顯示處理狀態
  showStatus(
    '',
    useAI
      ? '正在查詢 Gmail 並產生 AI 摘要...'
      : '正在查詢 Gmail...',
    'processing'
  );

  // 顯示 Gmail Query
  showQueryPreview(
    query,
    useAI
  );

  // ========================================================
  // 傳送查詢至 GAS
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
      '',
      useAI
        ? '查詢已送出，AI 正在整理結果...'
        : '查詢已送出，正在整理結果...',
      'processing'
    );

    // 因為目前使用 no-cors，
    // 瀏覽器無法取得 GAS 實際回應，
    // 所以等待幾秒後顯示完成。
    return new Promise(function(resolve) {
      setTimeout(resolve, 3000);
    });
  })

  // ========================================================
  // 顯示完成
  // ========================================================
  .then(function() {

    showStatus(
      '',
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
      '',
      '查詢送出失敗：' +
      error.message,
      'error'
    );
  })

  // ========================================================
  // 恢復按鈕
  // ========================================================
  .finally(function() {

    button.disabled = false;

    button.textContent = '再次查詢';
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

  // 今天
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

    // 開始日期
    if (start) {

      parts.push(
        'after:' +
        start.replace(/-/g, '/')
      );
    }

    // 結束日期
    if (end) {

      const endDate =
        new Date(end + 'T00:00:00');

      // Gmail before 不包含當天
      // 因此結束日期需要 +1 天
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
  // 其他篩選
  // ========================================================

  if (unread) {
    parts.push('is:unread');
  }

  if (attachment) {
    parts.push('has:attachment');
  }

  if (from) {
    parts.push('from:' + from);
  }

  if (subject) {
    parts.push('subject:' + subject);
  }

  if (keyword) {
    parts.push(keyword);
  }

  // 組合 Gmail Query
  return parts.join(' ');
}


// ==========================================================
// Gmail 日期格式
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
// 顯示狀態
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

  // 目前 UI 已經不需要大量圖示，
  // icon 保留參數是為了維持函式彈性。
  status.textContent = text;
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

  // 顯示實際送出的 Gmail Query
  preview.textContent =
    'Gmail Query：' +
    query +
    (useAI
      ? '  ｜  AI 摘要：開啟'
      : '  ｜  AI 摘要：關閉');
}
