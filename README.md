# Fuel Metrics

**Know what every fill-up costs you.**

<p align="center">
  <a href="https://github.com/sayedmdsafwan/Fuel-Metrics/releases/latest/download/app-debug.apk"><img src="https://img.shields.io/badge/%E2%AC%87%20Download%20APK-1F4E89?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" height="48"></a>
</p>

<p align="center">
  <a href="https://github.com/sayedmdsafwan/Fuel-Metrics/releases/latest"><img src="https://img.shields.io/github/v/release/sayedmdsafwan/Fuel-Metrics?color=1F4E89" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/Android-7.0%2B-3DDC84?logo=android&logoColor=white" alt="Android 7.0+">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Offline-100%25-success" alt="Offline">
</p>

## Download

**[Download the latest APK](https://github.com/sayedmdsafwan/Fuel-Metrics/releases/latest/download/app-debug.apk)** (one tap, about 2 MB). All versions are on the [Releases page](https://github.com/sayedmdsafwan/Fuel-Metrics/releases).

**Install steps**
1. Open the link above on your Android phone and download `app-debug.apk`.
2. Open the downloaded file. If Android asks, allow **Install unknown apps** for your browser or file manager.
3. Tap **Install**, then open **Fuel Metrics**.

> This is a debug build published for easy testing, so Play Protect may show a warning. The app has no permissions and no internet access, and the full source is in this repository.

---

Fuel Metrics is a free, open-source fuel and mileage tracker for Android. Log your fill-ups, see your real-world efficiency and running cost, and explore your history with charts and stat cards. Everything runs **fully offline** and your data never leaves your device.

Under the hood it is a lightweight Android shell (a single `WebView` activity) hosting a plain HTML/CSS/JavaScript app. There is no framework, no build step, no backend, no ads and no tracking.

<!-- Add screenshots to docs/screenshots/ and link them here -->

---

## Table of contents

- [Download](#download)
- [Highlights](#highlights)
- [Features in detail](#features-in-detail)
- [How efficiency is calculated](#how-efficiency-is-calculated)
- [Stats and charts](#stats-and-charts)
- [Backup, export and import](#backup-export-and-import)
- [Privacy and security](#privacy-and-security)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Build and run](#build-and-run)
- [Developing the UI in a browser](#developing-the-ui-in-a-browser)
- [Design notes](#design-notes)
- [Data model](#data-model)
- [Roadmap ideas](#roadmap-ideas)
- [Contributing](#contributing)
- [License](#license)

---

## Highlights

- Track unlimited vehicles, each with its own units and history
- Real efficiency from full-tank to full-tank, not guesswork
- Cost per distance, fuel used, distance driven and lifetime totals at a glance
- Customisable stats dashboard with line charts, bar charts and insight cards
- CSV export and import (including Fuelio-style files) for backups and migration
- 100% offline, zero permissions, no account, no ads

---

## Features in detail

### Vehicles
- Add as many vehicles as you like and switch between them from the top bar.
- Per vehicle you choose the **distance unit** (kilometres or miles) and the **volume unit** (litres or US gallons), plus a **starting odometer**.
- Edit or delete a vehicle at any time. Deleting a vehicle removes all of its fill-ups.

### Fill-up log
- Each entry stores: date, odometer, volume, total cost, unit price, notes, and two flags: **Full tank** and **Missed a previous fill**.
- The unit price is auto-filled from cost and volume, and you can override it manually.
- Entries are grouped by month with monthly totals for fuel, spend and distance.
- Tap an entry to edit or delete it.
- Every entry shows its efficiency, or a clear **Not counted** badge with a plain-language reason (see below).

### Input validation
The app protects the quality of your data:
- Date must be a real calendar date and cannot be in the future.
- Odometer must be a non-negative number, unique, and strictly between the previous and next entries' readings.
- Date must not fall before the previous entry or after the next entry (ordered by odometer).
- Volume must be greater than zero and cost cannot be negative.

### Home
- A hero card with your **average efficiency**, a sparkline of recent fill-ups, cost per distance and total fuel used.
- **Lifetime** totals: distance, amount spent and number of fill-ups.
- The **latest fill-up** at a glance.
- A **month-over-month insight** showing whether your cost per distance went up or down.

### Stats
- Range filter: All time, This year, 12 months, 6 months, 3 months or a **custom date range**.
- Add, edit and remove your own cards, or pick from ready-made suggestions.
- See [Stats and charts](#stats-and-charts) for everything available.

### Settings
- Rename the vehicle and change its units.
- Choose the **currency label** (default `BDT`, any short code works) and **date format** (`DD-MM-YYYY`, `MM-DD-YYYY` or `YYYY-MM-DD`).
- Export or import CSV, delete a vehicle, or clear all data.

### Sample data and onboarding
On first launch you can start fresh, explore **sample data**, or **import a CSV** into a new vehicle.

### Backup reminder
If you have entries and have not exported for seven days, a gentle in-app reminder appears on launch.

### Android integration
- Native **Save as** dialog for CSV export and the system file picker for import.
- The Back button closes any open sheet or dialog first, and only then leaves the app.
- The screen state survives rotation and other configuration changes.

---

## How efficiency is calculated

Fuel Metrics uses the **full-tank to full-tank** method, the most accurate way to measure real consumption.

1. Entries are sorted by odometer.
2. For each entry the app tracks the odometer at the last full tank and the fuel added since then.
3. An entry **counts** when it is a full tank, follows a previous full tank, and no fill was marked as missed in between.
4. Efficiency for a counted entry = distance since the last full tank ÷ total fuel added since then (so partial fills in between are included correctly).
5. Cost per distance for an entry = its total cost ÷ distance since the previous entry.

An entry shows **Not counted** with a reason when:

| Situation | Reason shown |
| --- | --- |
| First entry of a vehicle | No distance to measure yet |
| Marked *Missed a previous fill* | Distance and volume since the last full tank are not reliable |
| Not a full tank | A full tank is needed to know exactly how much fuel was used |
| Previous fill was not a full tank | It cannot be measured yet either |

Efficiency is shown in `km/L`, `mi/L`, `km/gal` or `mi/gal` depending on the vehicle's units. The overall average efficiency is total counted distance ÷ total counted fuel, which is more accurate than averaging percentages.

---

## Stats and charts

### Chart cards
Each chart card is built from four choices:

| Option | Values |
| --- | --- |
| Metric | Efficiency, Total cost, Volume, Unit price, Cost per distance, Distance since last fill |
| Grouping | Per fill-up, Sum by month, Average by month, Cumulative |
| X axis | Date or Odometer |
| Chart type | Line or Bar |

### Ready-made cards
| Card | What it shows |
| --- | --- |
| Efficiency over time | Line chart of every counted fill-up |
| Cost by month | Bar chart of monthly spend |
| Cost per distance trend | How running cost has moved over time |
| Average monthly efficiency | Efficiency averaged per calendar month |
| Distance between fills | Bar chart of distance per fill-up |
| Best and worst fill-ups | Your most and least efficient fills in the selected range |
| Year over year | Cost, distance and average efficiency per year |
| This month vs last month | Quick delta on cost and efficiency |
| Fueling rhythm heatmap | Weekly fuel spend intensity over the last year |
| Average days between fills | How regular your fill-ups are and how consistent |

Charts are drawn with the plain Canvas 2D API. There is no charting library.

---

## Backup, export and import

### Export
Settings (or the download icon in the Log tab) exports the active vehicle as a CSV file. The layout follows the widely used Fuelio-style format, so files can be moved to and from other trackers:

```
"## Vehicle"
"Name","Description","DistUnit","FuelUnit","ConsumptionUnit","ImportCSVDateFormat"
"My car","",0,0,0,"yyyy-MM-dd"
"## Log"
"Data","Odo (km)","Fuel (litres)","Full","Price (optional)","l/100km (optional)","latitude (optional)","longitude (optional)","City (optional)","Notes (optional)","Missed"
```

`DistUnit`: 0 = km, 1 = mi. `FuelUnit`: 0 = litres, 1 = US gallons (2 = imperial gallons is accepted on import).

### Import
Import merges into the current vehicle, or creates a new vehicle from the onboarding screen and the vehicle sheet. Two formats are recognised:

1. **Fuelio-style CSV** (with `## Vehicle` and `## Log` sections). Units declared in the file are converted to your vehicle's units automatically (km/mi, litres/US gallons/imperial gallons).
2. **Simple CSV** with a header row. Recognised columns: `type`, `odo`, `date`, `totalcost`, `volume`, `unitprice`, `notes`. Rows whose type is not `fuel` are skipped.

Details:
- Date formats are detected automatically (including ambiguous day/month cases) and you are told when dates had to be guessed.
- Duplicate entries (same date and odometer) are skipped when merging.
- Invalid rows are counted and reported instead of silently dropped.
- Files up to 10 MB are accepted.

---

## Privacy and security

- **No permissions.** The manifest requests none, not even internet.
- **No network.** Cleartext traffic is disabled and the app loads only bundled files from `file:///android_asset`.
- **No tracking.** No analytics, no ads, no accounts.
- **Local storage only.** Data lives in the WebView's `localStorage` on your device. `allowBackup` is off, so it is not copied to cloud backups. Export a CSV regularly to keep your own backups.
- WebView file access is disabled apart from bundled assets, and the JavaScript bridge exposes a single method used for saving CSV files.

> Because data is local, uninstalling the app or clearing its storage permanently deletes it. Use **Export CSV** first.

---

## Tech stack

| Layer | Details |
| --- | --- |
| Shell | Android, Java 17, one `ComponentActivity` hosting a `WebView` |
| UI | Vanilla HTML, CSS and JavaScript (ES2020), no framework, no build tools |
| Charts | Canvas 2D API and inline SVG |
| Font | [Manrope](https://github.com/sharanda/manrope) variable font, bundled (SIL Open Font License 1.1) |
| Storage | `localStorage` (state key `fuel_log_state`) |
| Build | Gradle 8.14, Android Gradle Plugin 8.10 |
| Android | `minSdk 24` (Android 7.0), `targetSdk` / `compileSdk 36` |
| Libraries | `androidx.core`, `androidx.activity` only |

---

## Project structure

```
Fuel Metrics/
├── app/
│   ├── build.gradle
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/safwan/fuelmetrics/
│       │   └── MainActivity.java      # WebView host, file picker, CSV save dialog, back handling
│       ├── assets/
│       │   ├── index.html             # App entry point
│       │   ├── style.css              # Design tokens and components
│       │   ├── app.js                 # State, calculations, CSV, charts, screens
│       │   └── fonts/manrope.woff2    # Bundled font
│       └── res/                       # App name, theme, colours, launcher icons
├── gradle/wrapper/                    # Gradle wrapper
├── build.gradle                       # Root Gradle file
├── settings.gradle
├── gradle.properties
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

### Inside `app.js`
Rough map of the file, in order: utilities, data model, efficiency engine (`computeDerived`), date and unit helpers, CSV parsing, export and import, stats calculations, icons and UI helpers, state and persistence, actions and validation, sheets and dialogs, screens (home, log, stats, settings, onboarding), rendering and event handling, boot.

---

## Build and run

### Requirements
- [Android Studio](https://developer.android.com/studio) (a recent stable release)
- JDK 17 (the **embedded JDK** that ships with Android Studio works)
- Android SDK Platform 36

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/sayedmdsafwan/Fuel-Metrics.git
   ```
2. Open the project folder in Android Studio and wait for Gradle sync.
3. If sync reports *Invalid Gradle JDK configuration*, open **Settings → Build, Execution, Deployment → Build Tools → Gradle** and set **Gradle JDK** to the embedded JDK (`jbr`).
4. Press **Run** to launch on an emulator or a connected device.

### Command line
```bash
./gradlew assembleDebug        # debug APK  -> app/build/outputs/apk/debug/
./gradlew assembleRelease      # release APK (configure your own signing first)
```
On Windows use `gradlew.bat`.

### Signing a release
Create your own keystore and reference it from a `keystore.properties` file. Both `*.jks`, `*.keystore` and `keystore.properties` are git-ignored on purpose. Never commit signing keys.

### Troubleshooting
| Problem | Fix |
| --- | --- |
| `Invalid Gradle JDK configuration found` | Set Gradle JDK to the embedded `jbr`, then sync again |
| `Duplicate class kotlin...` | Already handled in `app/build.gradle` by excluding `kotlin-stdlib-jdk7/jdk8`. Keep that block if you add dependencies |
| App shows an old UI after changes | Rebuild and reinstall, since assets are packaged into the APK |

---

## Developing the UI in a browser

The UI is plain web code, so you can iterate quickly on a desktop:

1. Open `app/src/main/assets/index.html` in Chrome or Firefox.
2. Use the browser's device toolbar to preview a phone screen.
3. CSV export falls back to a normal file download (the native save dialog is only used inside the Android app).

Quick syntax check:
```bash
node --check app/src/main/assets/app.js
```

`app.js` also exports its pure functions (`computeDerived`, `buildEntriesFromCsv`, `csvExport`, `mergeImported`, `demoState`, `yearOverYear`, `weeklyHeat`, `averageDays`, `buildChartData`, `resolveDates`, `parseDate`) when loaded as a Node module, which makes them straightforward to unit test.

---

## Design notes

- **Typeface:** Manrope, chosen for clear, evenly spaced numerals. Tabular figures keep columns of numbers aligned.
- **Palette:** cool grey background, deep navy text, steel-blue primary, with coral for cost and amber for warnings.
- **Structure:** flat cards with hairline borders, one gradient hero for the key number, and colour-coded accents that carry meaning (blue = counted, amber = not counted).
- **Accessibility:** visible keyboard focus, reduced-motion support, tappable targets sized for touch.
- **Offline first:** every asset, including the font, ships inside the APK.

---

## Data model

The full state is one JSON object saved under `fuel_log_state`:

```jsonc
{
  "vehicles": [{
    "id": "uuid",
    "name": "My car",
    "odometerUnit": "km",          // "km" | "mi"
    "volumeUnit": "l",             // "l" | "gal"
    "entries": [{
      "id": "uuid",
      "date": "2026-08-04",        // ISO date
      "odometer": 34985,
      "volume": 3.8,
      "totalCost": 536,
      "unitPrice": 141.05,
      "fullTank": true,
      "missedPrevious": false,
      "notes": ""
    }],
    "customCards": [ /* stats cards */ ]
  }],
  "activeVehicleId": "uuid",
  "settings": { "currency": "BDT", "dateFormat": "DD-MM-YYYY" },
  "lastBackup": "2026-09-28"
}
```

---

## Roadmap ideas

Contributions on any of these are welcome:

- Additional currencies and locale-aware number formatting
- Optional dark theme
- Reminders for regular backups
- More stat cards (fuel type comparison, station comparison)
- Localisation and translations
- Automated tests for the calculation and import functions
- Home screen widget with the latest efficiency

---

## Contributing

Bug reports, ideas and pull requests are very welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. The short version: keep it offline, dependency-free and data-safe.

---

## License

Released under the [MIT License](LICENSE). The bundled Manrope font is licensed separately under the SIL Open Font License 1.1.

Created by **Md. Safwan**.