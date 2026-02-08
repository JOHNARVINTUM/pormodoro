(() => {
  const $ = (id) => document.getElementById(id);

  // Default settings (25/5)
  const DEFAULTS = {
    workMin: 25,
    breakMin: 5,
    longBreakMin: 15,
    cyclesBeforeLong: 4,
    autoStartNext: false,
    soundOn: true,
    notifyOn: false,
    tickOn: false,
    keepAwake: false,
    theme: "dark", // "dark" | "light"
  };

  const STORAGE_KEY = "pomodoro_settings_v1";

  const els = {
    time: $("time"),
    mode: $("mode"),
    startPause: $("startPause"),
    reset: $("reset"),
    skip: $("skip"),
    cyclePill: $("cyclePill"),
    statusPill: $("statusPill"),
    openSettings: $("openSettings"),
    closeSettings: $("closeSettings"),
    settingsModal: $("settingsModal"),
    toggleTheme: $("toggleTheme"),

    // settings inputs
    workMin: $("workMin"),
    breakMin: $("breakMin"),
    longBreakMin: $("longBreakMin"),
    cyclesBeforeLong: $("cyclesBeforeLong"),
    autoStartNext: $("autoStartNext"),
    soundOn: $("soundOn"),
    notifyOn: $("notifyOn"),
    tickOn: $("tickOn"),
    keepAwake: $("keepAwake"),

    requestNotify: $("requestNotify"),
    defaults: $("defaults"),
    save: $("save"),
  };

  const ringFg = document.querySelector(".ring-fg");
  const RING_CIRC = 326.73;

  // Create gradient for ring stroke
  const svg = document.querySelector(".ring svg");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.setAttribute("id", "grad");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y2", "100%");
  const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  s1.setAttribute("offset", "0%");
  s1.setAttribute("stop-color", "var(--primary)");
  const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  s2.setAttribute("offset", "100%");
  s2.setAttribute("stop-color", "var(--primary2)");
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);

  let settings = loadSettings();
  applyTheme(settings.theme);

  // Timer state
  let running = false;
  let mode = "work"; // "work" | "break" | "long"
  let cycle = 1; // current work cycle index
  let totalSeconds = settings.workMin * 60;
  let remainingSeconds = totalSeconds;
  let intervalId = null;
  let wakeLock = null;

  // Sounds
  const endBeep = new Audio(makeBeepWavUrl(880, 0.12));
  const tickBeep = new Audio(makeBeepWavUrl(1200, 0.02));
  tickBeep.volume = 0.12;
  endBeep.volume = 0.35;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function setRingProgress(remain, total) {
    const pct = total <= 0 ? 0 : remain / total;
    ringFg.style.strokeDasharray = String(RING_CIRC);
    ringFg.style.strokeDashoffset = String(RING_CIRC * (1 - pct));
  }

  function setDocTitle() {
    document.title = `${formatTime(remainingSeconds)} • ${modeLabel(mode)}`;
  }

  function modeLabel(m) {
    if (m === "work") return "Work";
    if (m === "break") return "Break";
    return "Long Break";
  }

  function updateUI() {
    els.time.textContent = formatTime(remainingSeconds);
    els.mode.textContent = modeLabel(mode);
    els.startPause.textContent = running ? "Pause" : "Start";
    els.cyclePill.textContent = `Cycle ${cycle} / ${settings.cyclesBeforeLong}`;
    setRingProgress(remainingSeconds, totalSeconds);
    setDocTitle();
  }

  function setStatus(text) {
    els.statusPill.textContent = text;
  }

  function setTimerForMode(newMode) {
    mode = newMode;
    if (mode === "work") totalSeconds = settings.workMin * 60;
    if (mode === "break") totalSeconds = settings.breakMin * 60;
    if (mode === "long") totalSeconds = settings.longBreakMin * 60;
    remainingSeconds = totalSeconds;
    updateUI();
  }

  async function maybeNotify(title, body) {
    if (!settings.notifyOn) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch {}
  }

  function playEndSound() {
    if (!settings.soundOn) return;
    try { endBeep.currentTime = 0; endBeep.play(); } catch {}
  }
  function playTick() {
    if (!settings.tickOn) return;
    try { tickBeep.currentTime = 0; tickBeep.play(); } catch {}
  }

  function stopInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  async function requestWakeLockIfNeeded() {
    if (!settings.keepAwake) return;
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    try {
      if (wakeLock) await wakeLock.release();
    } catch {}
    wakeLock = null;
  }

  async function start() {
    if (running) return;
    running = true;
    setStatus("Running");
    updateUI();
    await requestWakeLockIfNeeded();

    let lastTick = Date.now();
    intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTick) / 1000);
      if (elapsed <= 0) return;
      lastTick += elapsed * 1000;

      remainingSeconds = Math.max(0, remainingSeconds - elapsed);

      if (remainingSeconds > 0) {
        playTick();
        updateUI();
        return;
      }

      // finished
      updateUI();
      onSessionEnd();
    }, 250);
  }

  async function pause() {
    if (!running) return;
    running = false;
    stopInterval();
    setStatus("Paused");
    updateUI();
    await releaseWakeLock();
  }

  async function reset() {
    await pause();
    setStatus("Ready");
    cycle = 1;
    setTimerForMode("work");
  }

  async function skip() {
    await pause();
    setStatus("Skipped");
    nextSession();
  }

  function nextSession() {
    if (mode === "work") {
      // After work: break or long break
      const isLong = (cycle % settings.cyclesBeforeLong === 0);
      setTimerForMode(isLong ? "long" : "break");
    } else {
      // After break: go to work and maybe increment cycle if coming from any break
      cycle = Math.min(cycle + 1, settings.cyclesBeforeLong);
      setTimerForMode("work");
    }

    setStatus("Ready");
    updateUI();
    if (settings.autoStartNext) start();
  }

  function onSessionEnd() {
    // stop interval but keep running flag false
    running = false;
    stopInterval();
    releaseWakeLock();

    const ended = modeLabel(mode);
    playEndSound();
    maybeNotify("Pomodoro", `${ended} finished.`);

    setStatus(`${ended} done`);
    nextSession();
  }

  // Settings modal
  function openSettings() {
    els.settingsModal.classList.add("open");
    els.settingsModal.setAttribute("aria-hidden", "false");
    populateSettingsForm();
  }

  function closeSettings() {
    els.settingsModal.classList.remove("open");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }

  function populateSettingsForm() {
    els.workMin.value = settings.workMin;
    els.breakMin.value = settings.breakMin;
    els.longBreakMin.value = settings.longBreakMin;
    els.cyclesBeforeLong.value = settings.cyclesBeforeLong;
    els.autoStartNext.checked = settings.autoStartNext;
    els.soundOn.checked = settings.soundOn;
    els.notifyOn.checked = settings.notifyOn;
    els.tickOn.checked = settings.tickOn;
    els.keepAwake.checked = settings.keepAwake;
  }

  function readSettingsForm() {
    settings.workMin = clamp(els.workMin.value, 1, 180);
    settings.breakMin = clamp(els.breakMin.value, 1, 60);
    settings.longBreakMin = clamp(els.longBreakMin.value, 1, 120);
    settings.cyclesBeforeLong = clamp(els.cyclesBeforeLong.value, 2, 12);
    settings.autoStartNext = !!els.autoStartNext.checked;
    settings.soundOn = !!els.soundOn.checked;
    settings.notifyOn = !!els.notifyOn.checked;
    settings.tickOn = !!els.tickOn.checked;
    settings.keepAwake = !!els.keepAwake.checked;
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }
    const p = await Notification.requestPermission();
    settings.notifyOn = (p === "granted");
    saveSettings();
    populateSettingsForm();
    alert(settings.notifyOn ? "Notifications enabled." : "Notifications not enabled.");
  }

  function applyTheme(t) {
    settings.theme = (t === "light") ? "light" : "dark";
    document.documentElement.classList.toggle("light", settings.theme === "light");
    saveSettings();
  }

  // Buttons
  els.startPause.addEventListener("click", async () => running ? pause() : start());
  els.reset.addEventListener("click", reset);
  els.skip.addEventListener("click", skip);

  els.openSettings.addEventListener("click", openSettings);
  els.closeSettings.addEventListener("click", closeSettings);
  els.settingsModal.addEventListener("click", (e) => {
    if (e.target === els.settingsModal) closeSettings();
  });

  els.requestNotify.addEventListener("click", enableNotifications);
  els.defaults.addEventListener("click", async () => {
    settings = { ...DEFAULTS, theme: settings.theme };
    saveSettings();
    populateSettingsForm();
  });

  els.save.addEventListener("click", async () => {
    const wasRunning = running;
    await pause();

    readSettingsForm();
    saveSettings();

    // reset current session lengths safely:
    if (mode === "work") setTimerForMode("work");
    if (mode === "break") setTimerForMode("break");
    if (mode === "long") setTimerForMode("long");

    closeSettings();
    setStatus("Saved");

    if (wasRunning) start();
  });

  els.toggleTheme.addEventListener("click", () => {
    applyTheme(settings.theme === "dark" ? "light" : "dark");
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.code === "Space") { e.preventDefault(); running ? pause() : start(); }
    if (e.key.toLowerCase() === "r") reset();
    if (e.key.toLowerCase() === "k") skip();
    if (e.key.toLowerCase() === "s") openSettings();
    if (e.key.toLowerCase() === "t") applyTheme(settings.theme === "dark" ? "light" : "dark");
    if (e.key === "Escape") closeSettings();
  });

  // Keep timer accurate when tab visibility changes
  document.addEventListener("visibilitychange", () => {
    if (!running) return;
    // no-op; interval uses Date.now() so it self-corrects
  });

  // Initialize
  setTimerForMode("work");
  setStatus("Ready");
  updateUI();

  // Helper: generate tiny beep wav in memory (no external files)
  function makeBeepWavUrl(freq, durationSec) {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    const writeStr = (o, s) => { for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + samples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);         // PCM
    view.setUint16(22, 1, true);         // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, samples * 2, true);

    const amp = 0.35;
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const env = Math.max(0, 1 - t / durationSec); // simple fade-out
      const sample = Math.sin(2 * Math.PI * freq * t) * amp * env;
      view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }
})();
