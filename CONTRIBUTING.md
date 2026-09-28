# Contributing to Fuel Metrics

Thanks for your interest! Fuel Metrics is a small, offline-first project and contributions of any size are welcome.

## Ground rules

- **Stay offline and dependency-free.** No network calls, no analytics, no CDN links, no npm/Gradle libraries beyond `androidx.core` and `androidx.activity`. Fonts and assets must be bundled in `app/src/main/assets/`.
- **No new permissions.** The app declares none, and that is a feature.
- **Keep the three-file UI** (`index.html`, `style.css`, `app.js`). No build step, no framework.
- **Never break existing data.** Saved data lives in `localStorage` under the key `fuel_log_state`. Any change to the data shape must migrate old data gracefully.

## Getting started

1. Fork the repo and clone it.
2. Open the project folder in Android Studio and let Gradle sync.
3. Run the `app` configuration on a device or emulator (Android 7.0+).

Tip: you can also open `app/src/main/assets/index.html` directly in a desktop browser for quick UI work. CSV export falls back to a normal file download there.

## Making changes

| Area | File |
| --- | --- |
| Calculations, CSV, screens, state | `app/src/main/assets/app.js` |
| Look and feel | `app/src/main/assets/style.css` |
| Android shell (WebView, file picker, save dialog) | `app/src/main/java/com/safwan/fuelmetrics/MainActivity.java` |

Before opening a pull request:

- Run `node --check app/src/main/assets/app.js` to catch syntax errors.
- Build a debug APK (`./gradlew assembleDebug`) and try your change on a real screen size.
- Check both a fresh install (onboarding) and an install with sample data.
- Keep pull requests focused: one feature or fix per PR, with a short description and, for UI changes, a screenshot.

## Reporting bugs and ideas

Open an issue with your Android version, device, steps to reproduce, and (if it involves import) a small anonymised CSV sample.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
