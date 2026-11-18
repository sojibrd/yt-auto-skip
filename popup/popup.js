const enabledInput = document.getElementById('enabled');
const statusText = document.getElementById('status-text');
const realClickInput = document.getElementById('real-click');
const realClickText = document.getElementById('real-click-text');
const countEl = document.getElementById('count');
const resetBtn = document.getElementById('reset');

function render({ enabled, useRealClick, skipCount }) {
  if (enabled !== undefined) {
    enabledInput.checked = enabled;
    statusText.textContent = `Auto Skip: ${enabled ? 'On' : 'Off'}`;
  }
  if (useRealClick !== undefined) {
    realClickInput.checked = useRealClick;
    realClickText.textContent = `Real click: ${useRealClick ? 'On' : 'Off'}`;
  }
  if (skipCount !== undefined) {
    countEl.textContent = String(skipCount);
  }
}

async function load() {
  try {
    const { enabled = true, useRealClick = true, skipCount = 0 } = await chrome.storage.local.get([
      'enabled',
      'useRealClick',
      'skipCount',
    ]);
    render({ enabled, useRealClick, skipCount });
  } catch (err) {
    console.error('Could not load settings:', err);
  }
}

enabledInput.addEventListener('change', async () => {
  const enabled = enabledInput.checked;
  render({ enabled });
  try {
    await chrome.storage.local.set({ enabled });
  } catch (err) {
    console.error('Could not save setting:', err);
  }
});

realClickInput.addEventListener('change', async () => {
  const useRealClick = realClickInput.checked;
  render({ useRealClick });
  try {
    await chrome.storage.local.set({ useRealClick });
  } catch (err) {
    console.error('Could not save setting:', err);
  }
});

resetBtn.addEventListener('click', async () => {
  try {
    await chrome.storage.local.set({ skipCount: 0 });
  } catch (err) {
    console.error('Could not reset counter:', err);
  }
});

// Keep the popup live while it is open (e.g. an ad gets skipped).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('enabled' in changes) render({ enabled: changes.enabled.newValue !== false });
  if ('useRealClick' in changes) render({ useRealClick: changes.useRealClick.newValue !== false });
  if ('skipCount' in changes) render({ skipCount: changes.skipCount.newValue ?? 0 });
});

load();
