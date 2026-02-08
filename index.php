<?php
// Simple PHP wrapper so you can deploy on a PHP host.
// Works fine as plain HTML too (GitHub Pages won't execute PHP).
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pomodoro Timer</title>
  <link rel="stylesheet" href="assets/style.css" />
  <meta name="theme-color" content="#0b0f14" />
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div class="brand">
        <div class="dot"></div>
        <h1>Pomodoro</h1>
      </div>
      <div class="top-actions">
        <button class="btn ghost" id="toggleTheme" title="Toggle theme (T)">Theme</button>
        <button class="btn ghost" id="openSettings" title="Settings (S)">Settings</button>
      </div>
    </header>

    <main class="card">
      <section class="timer">
        <div class="ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle class="ring-bg" cx="60" cy="60" r="52"></circle>
            <circle class="ring-fg" cx="60" cy="60" r="52"></circle>
          </svg>
          <div class="time" id="time">25:00</div>
          <div class="mode" id="mode">Work</div>
        </div>

        <div class="controls">
          <button class="btn primary" id="startPause">Start</button>
          <button class="btn" id="reset">Reset</button>
          <button class="btn" id="skip">Skip</button>
        </div>

        <div class="meta">
          <div class="pill" id="cyclePill">Cycle 1 / 4</div>
          <div class="pill" id="statusPill">Ready</div>
        </div>

        <div class="shortcuts">
          <span><kbd>Space</kbd> Start/Pause</span>
          <span><kbd>R</kbd> Reset</span>
          <span><kbd>K</kbd> Skip</span>
          <span><kbd>S</kbd> Settings</span>
          <span><kbd>T</kbd> Theme</span>
        </div>
      </section>
    </main>

    <footer class="foot">
      <span>Settings saved locally • Works offline • No backend required</span>
    </footer>
  </div>

  <!-- Settings Modal -->
  <div class="modal" id="settingsModal" aria-hidden="true">
    <div class="modal-inner" role="dialog" aria-modal="true" aria-label="Settings">
      <div class="modal-head">
        <h2>Options</h2>
        <button class="btn ghost" id="closeSettings" aria-label="Close">✕</button>
      </div>

      <div class="grid">
        <label>
          Work (minutes)
          <input type="number" id="workMin" min="1" max="180" step="1" />
        </label>
        <label>
          Short Break (minutes)
          <input type="number" id="breakMin" min="1" max="60" step="1" />
        </label>
        <label>
          Long Break (minutes)
          <input type="number" id="longBreakMin" min="1" max="120" step="1" />
        </label>
        <label>
          Long Break every N cycles
          <input type="number" id="cyclesBeforeLong" min="2" max="12" step="1" />
        </label>

        <label class="toggle">
          <input type="checkbox" id="autoStartNext" />
          <span>Auto-start next session</span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="soundOn" />
          <span>Sound on end</span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="notifyOn" />
          <span>Desktop notifications</span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="tickOn" />
          <span>Tick sound while running</span>
        </label>

        <label class="toggle">
          <input type="checkbox" id="keepAwake" />
          <span>Prevent screen sleep (Wake Lock)</span>
        </label>
      </div>

      <div class="modal-actions">
        <button class="btn" id="requestNotify">Enable Notifications</button>
        <button class="btn" id="defaults">Restore Defaults</button>
        <button class="btn primary" id="save">Save</button>
      </div>
    </div>
  </div>

  <script src="assets/app.js"></script>
</body>
</html>
