# YouTube Auto Skip Ad

A Chrome extension that skips skippable YouTube video ads as soon as YouTube shows the **Skip** button, so you don't have to click it yourself.

## Features

- Skips a skippable ad as soon as its **Skip** button appears, usually in about a second.
- Also skips the card with a countdown that YouTube sometimes shows after an ad.
- Works with two ads in a row (ad pods) and with ads in the middle of long videos (mid-rolls).
- Popup with an on/off switch, a count of skipped ads, and a reset button.
- No tracking: nothing leaves your browser.

## How it works

1. A content script watches the YouTube player for an ad (the player gets the `ad-showing` class).
2. When the ad's **Skip** button becomes visible, the extension clicks it.
3. YouTube ignores clicks made by page scripts, so the click is sent as a real mouse click through Chrome's debugger API (`chrome.debugger` → `Input.dispatchMouseEvent`).
4. If that click is not possible or YouTube doesn't react within a second, the extension moves the ad video to just before its end instead.

The extension only acts once YouTube itself offers the **Skip** button, so it never touches ads that can't be skipped.

## Installation

The extension isn't on the Chrome Web Store, so you load it from the source folder.

### 1. Get the code

Clone the repository:

```bash
git clone https://github.com/sojibrd/yt-auto-skip.git
```

Or open the repository on GitHub, click **Code → Download ZIP**, and unzip it.

### 2. Load it in Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `yt-auto-skip` folder (the one that contains `manifest.json`).
4. Reload any YouTube tabs that were already open. Tabs opened before the install don't get the extension until they are reloaded.
5. Optional: click the puzzle icon in the toolbar and pin **YouTube Auto Skip Ad** so the popup is one click away.

## Usage

1. Watch YouTube as usual.
2. When a skippable ad plays, wait for the **Skip** button to appear. The extension skips the ad for you.
3. Click the extension icon to open the popup:
   - **Auto Skip: On / Off** turns skipping on or off. The change applies right away in every open YouTube tab.
   - **Ads skipped** shows how many ads were skipped.
   - **Reset** sets the counter back to 0.

### The "started debugging this browser" bar

Each time an ad is skipped, Chrome briefly shows a bar at the top saying **"YouTube Auto Skip Ad" started debugging this browser**. This is expected. Chrome shows that bar whenever an extension uses the debugger API, which is what makes the click count as a real click. The bar goes away as soon as the click is done.

## Updating

1. Get the new code: run `git pull` in the folder, or download the ZIP again and replace the folder.
2. Open `chrome://extensions` and click the reload icon (↻) on the **YouTube Auto Skip Ad** card.
3. Reload your YouTube tabs.

## Permissions

| Permission | Why it is needed |
|---|---|
| `storage` | Remembers the on/off setting and the skipped-ads count. |
| `debugger` | Sends a real mouse click to the **Skip** button, because YouTube ignores clicks made by scripts. |
| `https://www.youtube.com/*` | Runs the extension on YouTube and nowhere else. |

## Privacy

The extension sends no data anywhere. It stores only two values in Chrome's local extension storage: whether skipping is on (`enabled`) and the number of skipped ads (`skipCount`).

## Limitations

- Only skippable ads are skipped, and only once the **Skip** button appears. Non-skippable ads play as usual.
- Works on `www.youtube.com` only, not on `m.youtube.com`, `music.youtube.com`, or YouTube videos embedded on other websites.
- Built for desktop Google Chrome.
- YouTube changes its player from time to time. If skipping stops working, the **Skip** button may have a new class name. Check `SKIP_SELECTORS` at the top of `content.js`.

## Troubleshooting

| Problem | What to do |
|---|---|
| Ads aren't skipped right after installing or updating | Reload the YouTube tab. Tabs that were open before keep the old version. |
| Nothing happens at all | Open the popup and check that **Auto Skip** is **On**. |
| The **Skip** button stays on screen | On the YouTube tab, open DevTools (`F12`) → **Console** and look for lines starting with `[YT Auto Skip]`. Also check whether the extension card in `chrome://extensions` shows an **Errors** button. |
| The counter doesn't go up | The counter only increases for ads that were actually skipped. The card YouTube shows after an ad isn't counted again. |

If the problem stays, open an issue and include the `[YT Auto Skip]` console lines and any errors from the extension card.

## Project structure

```text
yt-auto-skip/
├── manifest.json     Extension manifest (Manifest V3): permissions, scripts, popup
├── content.js        Runs on YouTube: detects ads and the Skip button, skips the ad
├── background.js     Service worker: sends the real mouse click through chrome.debugger
├── popup/
│   ├── popup.html    Popup layout
│   ├── popup.css     Popup styles, including dark mode
│   └── popup.js      On/off switch, counter, and reset
└── icons/            Toolbar and store icons (16, 48, 128 px)
```

## Development

There is no build step. Edit the files directly, then:

1. Click the reload icon (↻) on the extension card in `chrome://extensions`.
2. Reload the YouTube tab.

Useful places:

- **Selectors and timings** are constants at the top of `content.js` (`SKIP_SELECTORS`, `AD_RECHECK_MS`, `SKIP_COOLDOWN_MS`, `VERIFY_MS`).
- **Content script logs** show up in the YouTube tab's DevTools console, prefixed with `[YT Auto Skip]`.
- **Service worker logs** are available from the **service worker** link on the extension card in `chrome://extensions`.
