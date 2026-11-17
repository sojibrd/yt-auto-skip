const enabledInput = document.getElementById('enabled');
const statusText = document.getElementById('status-text');
const countEl = document.getElementById('count');
const resetBtn = document.getElementById('reset');

function render({ enabled, skipCount }) {
  if (enabled !== undefined) {
    enabledInput.checked = enabled;
    statusText.textContent = `Auto Skip: ${enabled ? 'On' : 'Off'}`;
  }
  if (skipCount !== undefined) {
    countEl.textContent = String(skipCount);
  }
}

async function load() {
  try {
    const { enabled = true, skipCount = 0 } = await chrome.storage.local.get(['enabled', 'skipCount']);
    render({ enabled, skipCount });
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
  if ('skipCount' in changes) render({ skipCount: changes.skipCount.newValue ?? 0 });
});

load();
