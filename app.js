// ===== app.js =====

const LIFF_ID = '2011164374-MnsCQq2R';
let userId = '';

window.onload = async function() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    userId = profile.userId;
    document.getElementById('status').textContent = '已連線，可以開始查詢';
  } catch (error) {
    document.getElementById('status').textContent = 'LIFF 初始化失敗：' + JSON.stringify(error);
  }
};

function changeDateType() {
  document.getElementById('customDate').classList.toggle('hidden', document.getElementById('dateType').value !== 'custom');
}

function searchGmail() {
  const query = buildQuery();
  if (!query) {
    showStatus('請至少輸入一個查詢條件');
    return;
  }
  document.getElementById('queryPreview').textContent = 'Gmail Query：' + query;
  showStatus('查詢條件已準備完成');
}

function buildQuery() {
  const parts = [];
  const dateType = document.getElementById('dateType').value;
  const unread = document.getElementById('unread').checked;
  const from = document.getElementById('from').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const keyword = document.getElementById('keyword').value.trim();

  if (dateType === '1') parts.push('newer_than:1d');
  else if (dateType === '7') parts.push('newer_than:7d');
  else if (dateType === '30') parts.push('newer_than:30d');
  else if (dateType === 'custom') {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (start) parts.push('after:' + start.replace(/-/g, '/'));
    if (end) {
      const date = new Date(end + 'T00:00:00');
      date.setDate(date.getDate() + 1);
      parts.push('before:' + date.toISOString().substring(0, 10).replace(/-/g, '/'));
    }
  }

  if (unread) parts.push('is:unread');
  if (from) parts.push('from:' + from);
  if (subject) parts.push('subject:' + subject);
  if (keyword) parts.push(keyword);

  return parts.join(' ');
}

function showStatus(text) {
  document.getElementById('status').textContent = text;
}
