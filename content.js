// YouTube Auto Skip Ad — content script
// Runs only on https://www.youtube.com/* (see manifest.json).
// Skips a skippable video ad as soon as YouTube shows its Skip button.

(() => {
  'use strict';

  // YouTube renames these classes from time to time, so several are checked.
  const SKIP_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button',
    '.videoAdUiSkipButton',
  ];
  const PLAYER_SELECTOR = '#movie_player';
  const AD_SHOWING_CLASS = 'ad-showing';
  const BACKUP_CHECK_MS = 1000;
  // The Skip button fades in through CSS, which fires no DOM mutation, so
  // the check repeats this often while an ad is on screen.
  const AD_RECHECK_MS = 250;
  // Time for YouTube to move on after a skip, so whatever plays next is never
  // mistaken for the ad that was just skipped.
  const SKIP_COOLDOWN_MS = 2000;
  // How long YouTube gets to react to the click before the fallback runs.
  const VERIFY_MS = 1000;
  // An ad this close to its end is finishing by itself.
  const END_MARGIN_S = 0.5;
  // The fallback moves the ad this close to its end and lets the rest play
  // out, so it ends the way a fully watched ad does.
  const PLAYOUT_S = 0.25;
  // Marks the button to click; background.js looks it up in the page.
  const TARGET_ATTR = 'data-yt-auto-skip-target';

  let enabled = true;
  let observer = null;
  let observedPlayer = null;
  let checkQueued = false;
  let recheckTimer = 0;
  let lastSkipAt = 0;
  let skipping = false;

  const contextAlive = () => Boolean(globalThis.chrome?.runtime?.id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isVisible = (el) => {
    if (!el.isConnected || el.offsetParent === null) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };

  const findSkipButton = (player) => {
    for (const selector of SKIP_SELECTORS) {
      for (const el of player.querySelectorAll(selector)) {
        if (isVisible(el)) return el;
      }
    }
    return null;
  };

  // True while the ad video still has a real part left to play: not the end
  // card YouTube shows after an ad (it has no media), and not an ad that is
  // about to end anyway.
  const adLeftToPlay = (video) =>
    Boolean(video) && Number.isFinite(video.duration) && video.currentTime < video.duration - END_MARGIN_S;

  async function incrementCounter() {
    if (!contextAlive()) return;
    try {
      const { skipCount = 0 } = await chrome.storage.local.get('skipCount');
      await chrome.storage.local.set({ skipCount: skipCount + 1 });
    } catch (err) {
      console.warn('[YT Auto Skip] Could not update counter:', err);
    }
  }

  // YouTube ignores clicks made by a script (event.isTrusted is false), so
  // background.js sends a real mouse click through the debugger API.
  async function trustedClick(button) {
    if (!contextAlive()) return false;
    button.setAttribute(TARGET_ATTR, '');
    try {
      const reply = await chrome.runtime.sendMessage({ type: 'trustedClick' });
      if (reply?.error) console.warn('[YT Auto Skip] Real click failed:', reply.error);
      return reply?.ok === true;
    } catch (err) {
      console.warn('[YT Auto Skip] Real click failed:', err);
      return false;
    } finally {
      button.removeAttribute(TARGET_ATTR);
    }
  }

  async function skip(player, button) {
    const video = player.querySelector('video');
    const countable = adLeftToPlay(video);
    const src = video?.currentSrc;
    const sameAdOnScreen = () =>
      isVisible(button) && player.classList.contains(AD_SHOWING_CLASS) && video?.currentSrc === src;

    if (await trustedClick(button)) {
      await sleep(VERIFY_MS);
      if (!sameAdOnScreen()) {
        if (countable) incrementCounter();
        return;
      }
    }

    // No real click was possible, or YouTube did not react to it: move the
    // ad video to just before its end instead. The source check keeps this
    // off whatever YouTube plays after the ad.
    if (adLeftToPlay(video) && video.currentSrc === src) {
      video.currentTime = video.duration - PLAYOUT_S;
      incrementCounter();
    }
  }

  function scheduleRecheck() {
    if (recheckTimer) return;
    recheckTimer = setTimeout(() => {
      recheckTimer = 0;
      queueCheck();
    }, AD_RECHECK_MS);
  }

  function trySkip() {
    checkQueued = false;
    if (!enabled || !contextAlive()) return;

    const player = document.querySelector(PLAYER_SELECTOR);
    if (!player || !player.classList.contains(AD_SHOWING_CLASS)) return;
    scheduleRecheck();

    if (skipping || Date.now() - lastSkipAt < SKIP_COOLDOWN_MS) return;
    const button = findSkipButton(player);
    if (!button) return;

    skipping = true;
    skip(player, button).finally(() => {
      skipping = false;
      lastSkipAt = Date.now();
    });
  }

  // Many mutations arrive in bursts; run at most one check per burst.
  function queueCheck() {
    if (checkQueued) return;
    checkQueued = true;
    queueMicrotask(trySkip);
  }

  // Watch the player. YouTube is a single-page app, so the player can be
  // replaced; the backup timer re-attaches the observer when that happens.
  function attachObserver() {
    const player = document.querySelector(PLAYER_SELECTOR);
    if (!player || player === observedPlayer) return;

    observer?.disconnect();
    observer = new MutationObserver(queueCheck);
    observer.observe(player, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    observedPlayer = player;
    queueCheck();
  }

  function backupTick() {
    if (!contextAlive()) {
      // Extension was reloaded or removed; stop this old copy.
      observer?.disconnect();
      clearInterval(backupTimer);
      clearTimeout(recheckTimer);
      return;
    }
    attachObserver();
    trySkip();
  }

  async function init() {
    try {
      const { enabled: stored = true } = await chrome.storage.local.get('enabled');
      enabled = stored;
    } catch (err) {
      console.warn('[YT Auto Skip] Could not read settings:', err);
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'enabled' in changes) {
        enabled = changes.enabled.newValue !== false;
        if (enabled) queueCheck();
      }
    });

    attachObserver();
  }

  // Background tabs throttle timers to ~1/s, which this interval tolerates.
  const backupTimer = setInterval(backupTick, BACKUP_CHECK_MS);
  init();
})();
