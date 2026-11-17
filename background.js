// YouTube Auto Skip Ad — background service worker
// YouTube ignores clicks made by page scripts (event.isTrusted is false). The
// debugger API can send a real mouse click, so the content script asks for
// one here when a Skip button is on screen.

// Set by content.js on the button to click.
const TARGET_ATTR = 'data-yt-auto-skip-target';
// Attaching shows Chrome's "started debugging this browser" bar, which can
// shift the page; wait for the layout to settle before measuring.
const SETTLE_MS = 150;

// Runs in the page: centre of the marked button, or null when it is hidden,
// off screen or covered by something else.
const LOCATE_BUTTON = `(() => {
  const b = document.querySelector('[${TARGET_ATTR}]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (!r.width || !r.height || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
  const hit = document.elementFromPoint(x, y);
  return hit && b.contains(hit) ? { x, y } : null;
})()`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function trustedClick(tabId) {
  const target = { tabId };
  await chrome.debugger.attach(target, '1.3');
  try {
    await sleep(SETTLE_MS);
    const { result } = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: LOCATE_BUTTON,
      returnByValue: true,
    });
    const point = result?.value;
    if (!point) return false;

    const { x, y } = point;
    const press = { x, y, button: 'left', clickCount: 1 };
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mousePressed', ...press });
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseReleased', ...press });
    return true;
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'trustedClick' || sender.tab?.id === undefined) return false;
  trustedClick(sender.tab.id)
    .then((ok) => sendResponse({ ok }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message ?? err) }));
  return true; // reply comes asynchronously
});
