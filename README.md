<div align="center">

# ⛽ Fuel Metrics

**Know what every fill-up actually costs you.**

<img alt="Platform" src="https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white">
<img alt="min SDK" src="https://img.shields.io/badge/min%20SDK-24%20(Android%207.0)-2F6F4E?style=flat-square">
<img alt="License" src="https://img.shields.io/badge/license-MIT-1F4E89?style=flat-square">
<img alt="Offline" src="https://img.shields.io/badge/works-100%25%20offline-8C8371?style=flat-square">
<img alt="Latest release" src="https://img.shields.io/github/v/release/sayedmdsafwan/Fuel-Metrics?style=flat-square&color=1F4E89">

<br><br>

<a href="https://github.com/sayedmdsafwan/Fuel-Metrics/releases/latest/download/app-debug.apk">
  <img alt="Download the latest APK" src="https://img.shields.io/badge/%E2%AC%87%20Download%20APK-1F4E89?style=for-the-badge&logo=android&logoColor=white" height="42">
</a>

<br>

[All releases](https://github.com/sayedmdsafwan/Fuel-Metrics/releases) · [Report a bug](https://github.com/sayedmdsafwan/Fuel-Metrics/issues) · [Contributing](CONTRIBUTING.md)

</div>

---

Fuel Metrics is a small, honest fuel and mileage tracker for Android. Log a fill-up,
and it works out your real efficiency from full tank to full tank, what each kilometre
costs you, and how all of that has moved over the year — with charts you set up yourself.

No account. No ads. No network access. **The APK requests zero permissions** — it
cannot send your data anywhere, because it never gets the permission to.

## ✨ Highlights

- **Real efficiency, not guesswork** — full-tank-to-full-tank maths, with partial fills handled correctly.
- **Unlimited vehicles**, each with its own units (km/mi, litres/US gallons) and history.
- **A stats dashboard you build** — pick a metric, a grouping, an axis and a chart type.
- **CSV in, CSV out** — Fuelio-compatible, so your data is never locked in.
- **100% offline, zero permissions, no tracking.** Everything lives on your phone.

## 📲 Install

1. Open the [latest APK](https://github.com/sayedmdsafwan/Fuel-Metrics/releases/latest/download/app-debug.apk) on your Android phone.
2. Open the downloaded file. If Android asks, allow **Install unknown apps** for your browser or file manager.
3. Tap **Install**, then open **Fuel Metrics**.

> It is a debug build published for easy testing, so Play Protect may show a warning.
> The app has no permissions, no internet access, and the full source is right here.

## 🚗 Features

### Vehicles
- Add as many vehicles as you like and switch between them from the top bar.
- Per vehicle: **distance unit** (km or miles) and **volume unit** (litres or US gallons).
- Edit or delete a vehicle at any time; deleting one removes its fill-ups with it.

### Fill-up log
- Each entry stores date, odometer, volume, total cost, unit price, notes, and two flags: **Full tank** and **Missed a previous fill**.
- The unit price is filled in from cost ÷ volume, and can be overridden by hand.
- Entries are grouped by month with monthly totals for fuel, spend and distance.
- Tap an entry to edit or delete it. Every entry shows its efficiency, or a plain-language reason why it isn't counted.

### Data you can trust
- Dates must be real calendar dates, cannot be in the future, and must sit in order with the entries around them.
- Odometer readings must be unique.
- Volume must be above zero, and cost cannot be negative.

### Home
A hero card with your average efficiency, cost per distance and total fuel used; lifetime
distance, spend and fill-up count; your latest fill-up; and a month-over-month nudge telling
you whether running costs went up or down.

### Stats
Filter by all time, this year, 12/6/3 months, or a custom range. Then add, edit and
remove cards — or start from a ready-made suggestion.

### Settings
Rename the vehicle, change its units, choose the currency label (default `BDT`) and the
date format (`DD-MM-YYYY`, `MM-DD-YYYY`, `YYYY-MM-DD`), export or import CSV, delete the
vehicle, or clear everything.

### Onboarding
On first launch you can start empty, explore **sample data**, or **import a CSV** into a
new vehicle. If you have entries and haven't exported for seven days, a gentle in-app
reminder appears on launch.

### Android integration
Native **Save as** dialog for CSV export, the system file picker for import, a Back
button that closes any open sheet before leaving the app, and a WebView that survives
rotation and other configuration changes.

## ⛽ How efficiency is calculated

Full-tank-to-full-tank is the only method that gives you a real number:

1. Entries are sorted by odometer.
2. For each entry the app tracks the odometer at the last full tank and the fuel added since then.
3. An entry **counts** when it is a full tank, follows another full tank, and no fill in between was marked as missed.
4. Efficiency for a counted entry = distance since the last full tank ÷ all fuel added since then — so partial fills in between are included correctly.
5. Cost per distance for an entry = its total cost ÷ distance since the previous entry.

An entry shows **Not counted** with a reason when:

| Situation | Reason shown |
| --- | --- |
| First entry of a vehicle | No distance to measure yet |
| Marked *Missed a previous fill* | Distance and volume since the last full tank aren't reliable |
| Not a full tank | A full tank is needed to know exactly how much fuel was used |
| Previous fill was not a full tank | It can't be measured yet either |

Efficiency is shown in `km/L`, `mi/L`, `km/gal` or `mi/gal`, depending on the vehicle's
units. The overall average is **total counted distance ÷ total counted fuel** — the same
segments the individual entries used, which is more accurate than averaging percentages.

## 📊 Stats and charts

Each chart card is built from four choices:

| Option | Values |
| --- | --- |
| Metric | Efficiency, total cost, volume, unit price, cost per distance, distance since last fill |
| Grouping | Per fill-up, sum by month, average by month, cumulative |
| X axis | Date or odometer |
| Chart type | Line or bar |

Ready-made cards:

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
| Average days between fills | How regular your fill-ups are, and how consistent |

Charts are drawn with the plain Canvas 2D API — there is no charting library.

## 🔄 Backup, export and import

**Export** (Settings, or the download icon in the Log tab) writes the active vehicle as a
Fuelio-compatible CSV, so files can move to and from other trackers:

```
"## Vehicle"
"Name","Description","DistUnit","FuelUnit","ConsumptionUnit","ImportCSVDateFormat"
"My car","",0,0,0,"yyyy-MM-dd"
"## Log"
"Data","Odo (km)","Fuel (litres)","Full","Price (optional)","l/100km (optional)","latitude (optional)","longitude (optional)","City (optional)","Notes (optional)","Missed"
```

`DistUnit`: 0 = km, 1 = mi. `FuelUnit`: 0 = litres, 1 = US gallons (2 = imperial gallons
is accepted on import).

**Import** merges into the current vehicle, or creates a new one from onboarding and the
vehicle sheet. Two formats are recognised:

1. **Fuelio-style CSV** (with `## Vehicle` and `## Log` sections) — declared units are converted to the vehicle's units automatically (km/mi, litres/US gallons/imperial gallons).
2. **Simple CSV** with a header row — recognised columns: `type`, `odo`, `date`, `totalcost`, `volume`, `unitprice`, `notes`. Rows whose type isn't `fuel` are skipped.

Date formats are detected automatically (including ambiguous day/month cases) and you're
told when dates had to be guessed. Duplicate entries (same date and odometer) are skipped
when merging, invalid rows are counted and reported rather than silently dropped, and
files up to 10 MB are accepted.

## 🔒 Privacy

- **No permissions.** The manifest requests none — not even internet.
- **No network.** Cleartext traffic is disabled and the app only loads bundled files from `file:///android_asset`.
- **No tracking.** No analytics, no ads, no accounts.
- **Local storage only.** Data lives in the WebView's `localStorage`. `allowBackup` is off, so it isn't copied to cloud backups — export a CSV regularly to keep your own.
- WebView file access is disabled apart from bundled assets, and the JavaScript bridge exposes a single method, used for saving CSV files.

> Because everything is local, uninstalling the app or clearing its storage deletes the
> data permanently. Export a CSV first.

## 🧱 Tech stack

| Layer | Details |
| --- | --- |
| Shell | Android, Java 17, one `ComponentActivity` hosting a `WebView` |
| UI | Vanilla HTML, CSS and JavaScript (ES2020+), no framework, no build step |
| Charts | Canvas 2D API and inline SVG |
| Font | [Manrope](https://fonts.google.com/specimen/Manrope) variable font, bundled (SIL Open Font License 1.1) |
| Storage | `localStorage` (state key `fuel_log_state`) |
| Build | Gradle 8.14.5, Android Gradle Plugin 8.10 |
| Android | `minSdk 24` (7.0), `targetSdk` / `compileSdk` 36 |
| Libraries | `androidx.core`, `androidx.activity` only |

## 📂 Project layout

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
├── build.gradle, settings.gradle, gradle.properties
├── CONTRIBUTING.md · LICENSE · README.md
```

Inside `app.js`, roughly in order: utilities, data model, efficiency engine
(`computeDerived`), date and unit helpers, CSV parsing, export and import, stats
calculations, icons and UI helpers, state and persistence, actions and validation, sheets
and dialogs, screens (home, log, stats, settings, onboarding), rendering and event
handling, boot.

## 🛠 Build and run

**Requirements:** [Android Studio](https://developer.android.com/studio) (recent stable
release), JDK 17 (the embedded JDK works), Android SDK Platform 36.

```bash
git clone https://github.com/sayedmdsafwan/Fuel-Metrics.git
cd Fuel-Metrics
```

Then open the folder in Android Studio, let Gradle sync, and press **Run ▶**. Or build
from the command line:

```bash
./gradlew assembleDebug      # debug APK  -> app/build/outputs/apk/debug/
./gradlew assembleRelease    # release APK (configure your own signing first)
```

On Windows use `gradlew.bat`.

**Signing a release:** create your own keystore and reference it from a
`keystore.properties` file. `*.jks`, `*.keystore` and `keystore.properties` are ignored on
purpose — never commit signing keys.

| Problem | Fix |
| --- | --- |
| `Invalid Gradle JDK configuration found` | Set Gradle JDK to the embedded `jbr`, then sync again |
| `Duplicate class kotlin...` | Already handled in `app/build.gradle` by excluding `kotlin-stdlib-jdk7/jdk8`. Keep that block if you add dependencies |
| App shows an old UI after changes | Rebuild and reinstall — assets are packaged into the APK |

### Developing the UI in a browser

The interface is plain web code, so you can iterate without a device:

1. Open `app/src/main/assets/index.html` in Chrome or Firefox.
2. Use the browser's device toolbar to preview a phone screen.
3. CSV export falls back to a normal file download (the native save dialog is only used inside the app).

Quick syntax check: `node --check app/src/main/assets/app.js`.

`app.js` exports its pure functions (`computeDerived`, `buildEntriesFromCsv`, `csvExport`,
`mergeImported`, `demoState`, `yearOverYear`, `weeklyHeat`, `averageDays`,
`buildChartData`, `resolveDates`, `parseDate`) when loaded as a Node module, which makes
them easy to unit test.

## 🎨 Design notes

- **Typeface:** Manrope, chosen for clear, evenly spaced numerals; tabular figures keep columns aligned.
- **Palette:** cool grey background, deep navy text, steel-blue primary, coral for cost, amber for warnings.
- **Structure:** flat cards with hairline borders, one gradient hero for the key number, and colour-coded accents that carry meaning (blue = counted, amber = not counted).
- **Accessibility:** visible keyboard focus, reduced-motion support, touch-sized targets.
- **Offline first:** every asset, including the font, ships inside the APK.

## 🗃 Data model

The whole state is one JSON object saved under `fuel_log_state`:

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

## 🗺 Roadmap

Contributions on any of these are welcome:

- Additional currencies and locale-aware number formatting
- Optional dark theme
- Reminders for regular backups
- More stat cards (fuel type comparison, station comparison)
- Localisation and translations
- Automated tests for the calculation and import functions
- Home-screen widget with the latest efficiency

## 🤝 Contributing

Bug reports, ideas and pull requests are very welcome — please read
[CONTRIBUTING.md](CONTRIBUTING.md) first. The short version: keep it offline,
dependency-free and data-safe.

## 📄 License

Released under the [MIT License](LICENSE). The bundled Manrope font is licensed
separately under the SIL Open Font License 1.1.

---

<div align="center">
<sub>Created by <strong>Md. Safwan</strong> · Also on GitHub: <a href="https://github.com/sayedmdsafwan/SafwanExp">Safwan Exp</a> · <a href="https://github.com/sayedmdsafwan/SalatTime">Salat Time</a></sub>
</div>
