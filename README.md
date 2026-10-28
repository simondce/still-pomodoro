# Still — a simple Pomodoro timer

A responsive, buildless focus timer for phones, iPads, and laptops. Open the GitHub Pages URL in your browser and press **Start focus**.

- 25-minute focus, 5-minute short break, 15-minute long break; all customizable.
- Pause, resume, reset, completion chime, and daily focus count.
- Automatic device detection and responsive layouts.
- Screen Wake Lock requested while running, released on pause/reset/completion, reacquired on return to the tab.
- Timestamp-based countdown survives refresh and background throttling. Progress is stored locally on each device; it does not sync between devices.

## Screen and sound behavior

Keep the timer visible. Wake Lock requires HTTPS (or localhost) and browser support. Battery saver or the operating system can deny or release a lock; the app reports actual lock status. A web page cannot keep the display awake after you switch apps or manually lock the screen. Audio may be suspended in the background or after a refresh; completion is reconciled when the page resumes.

## Hosting

Serve the repository root using GitHub Pages, from `main`. No build or backend is needed. `.nojekyll` disables Jekyll processing. Typography uses Google Fonts with local font fallbacks. There are no analytics or accounts.

## Local development

Serve this directory with any static HTTP server. Test from localhost for Wake Lock support. Open `index.html` directly for the basic timer (wake lock may not be available).
