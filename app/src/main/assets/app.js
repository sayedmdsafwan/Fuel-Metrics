'use strict';
/* Fuel Metrics – web port. Logic mirrors the Kotlin app (model, csv, stats). Data stays in localStorage. */
const KEY = 'fuel_log_state';
const TEAL = '#1F4E89', CORAL = '#C0432E', AMBER = '#B7791F', PURPLE = '#0F766E', FAINT = '#8F9AB0';
const CARD_COLORS = [TEAL, CORAL, AMBER, PURPLE];

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const num = s => { if (s == null) return null; const t = String(s).trim(); return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t) ? parseFloat(t) : null; };
const pad = n => String(n).padStart(2, '0');
const isoFrom = (y, m, d) => `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
const validYMD = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const todayISO = () => { const d = new Date(); return isoFrom(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const minusMonths = n => { const t = new Date(); let y = t.getFullYear(), m = t.getMonth() + 1 - n; const d = t.getDate(); while (m < 1) { m += 12; y--; } return isoFrom(y, m, Math.min(d, new Date(Date.UTC(y, m, 0)).getUTCDate())); };
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const roundTo = (v, d) => { const f = Math.pow(10, d); return Math.round(v * f) / f; };
const fmtInput = n => Number.isInteger(n) ? String(n) : String(n);
const fmtInt = n => Number.isInteger(n) ? String(n) : String(n);

/* ---------- model ---------- */
const mkCard = o => ({ id: uuid(), kind: 'chart', title: '', metric: 'efficiency', groupBy: 'none', xAxis: 'date', chartType: 'line', ...o });
const defaultCards = () => [
  mkCard({ title: 'Efficiency over time', metric: 'efficiency', groupBy: 'none', xAxis: 'date', chartType: 'line' }),
  mkCard({ title: 'Cost by month', metric: 'cost', groupBy: 'monthly-sum', xAxis: 'date', chartType: 'bar' })
];
const mkEntry = o => ({ id: uuid(), fullTank: true, missedPrevious: false, notes: '', ...o });
const mkVehicle = o => ({ id: uuid(), entries: [], customCards: defaultCards(), ...o });
const emptyState = () => ({ vehicles: [], activeVehicleId: null, settings: { currency: 'BDT', dateFormat: 'DD-MM-YYYY' }, lastBackup: null });
const activeOf = s => s.vehicles.find(v => v.id === s.activeVehicleId) || s.vehicles[0] || null;

const sortedEntries = e => [...e].sort((a, b) => (a.odometer - b.odometer) || cmp(a.date, b.date));

function computeDerived(entries) {
  const sorted = sortedEntries(entries);
  let prev = null, lastFullOdo = null, volSinceFull = 0, chainBroken = false;
  const out = [];
  for (const e of sorted) {
    let distanceSinceLast = null, efficiency = null, costPerKm = null, qualifies = false;
    if (prev) {
      const gap = e.odometer - prev.odometer;
      if (gap > 0) { distanceSinceLast = gap; costPerKm = e.totalCost / gap; }
    }
    if (e.missedPrevious) chainBroken = true;
    volSinceFull += e.volume;
    if (distanceSinceLast != null && e.fullTank && !chainBroken && lastFullOdo != null) {
      const dsf = e.odometer - lastFullOdo;
      if (dsf > 0 && volSinceFull > 0) { efficiency = dsf / volSinceFull; qualifies = true; }
    }
    if (e.fullTank) { lastFullOdo = e.odometer; volSinceFull = 0; chainBroken = false; }
    prev = e;
    out.push({ entry: e, id: e.id, date: e.date, odometer: e.odometer, volume: e.volume, totalCost: e.totalCost, unitPrice: e.unitPrice,
      fullTank: e.fullTank, missedPrevious: e.missedPrevious, notes: e.notes, distanceSinceLast, efficiency, costPerKm, qualifies });
  }
  return out;
}
function notCountedReason(e) {
  if (e.distanceSinceLast == null) return "This is the first logged entry, so there's no distance to measure yet.";
  if (e.missedPrevious) return "Marked as a missed previous fill, so the distance/volume since the last full tank isn't reliable.";
  if (!e.fullTank) return 'Not a full tank — efficiency needs a full tank to know exactly how much fuel was used.';
  return "The fill before this one wasn't a full tank (or was itself uncounted), so this one can't be measured yet either.";
}

function demoState() {
  const rows = [['2026-02-03', 32200, 3.8, 532], ['2026-02-14', 32410, 3.95, 553], ['2026-02-27', 32615, 3.7, 518], ['2026-03-10', 32830, 4.05, 567],
    ['2026-03-24', 33040, 3.6, 505], ['2026-04-05', 33255, 3.9, 546], ['2026-04-19', 33470, 4.1, 574], ['2026-05-02', 33660, 3.5, 493],
    ['2026-05-18', 33890, 3.85, 540], ['2026-06-02', 34100, 3.75, 528], ['2026-06-20', 34330, 4.2, 588], ['2026-07-05', 34540, 3.65, 514],
    ['2026-07-22', 34770, 3.9, 549], ['2026-08-04', 34985, 3.8, 536]];
  const entries = rows.map(([date, odometer, volume, totalCost], i) => mkEntry({
    date, odometer, volume, totalCost, unitPrice: Math.round((totalCost / volume) * 100) / 100,
    fullTank: i !== 6, notes: i === 6 ? 'Topped up halfway, not a full tank' : ''
  }));
  const v = mkVehicle({ name: 'TVS Ntorq 125', odometerUnit: 'km', volumeUnit: 'l', startingOdometer: 32200, entries });
  return { ...emptyState(), vehicles: [v], activeVehicleId: v.id };
}

/* ---------- format ---------- */
let S = emptyState();
const fmtNum = (n, d = 1) => (n == null || !isFinite(n)) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtCur = n => (n == null || !isFinite(n)) ? '—' : `${S.settings.currency} ${fmtNum(n, 0)}`;
const fmtDate = iso => {
  if (!iso) return '—'; const p = iso.split('-'); if (p.length !== 3) return iso; const [y, m, d] = p;
  return S.settings.dateFormat === 'MM-DD-YYYY' ? `${m}-${d}-${y}` : S.settings.dateFormat === 'YYYY-MM-DD' ? `${y}-${m}-${d}` : `${d}-${m}-${y}`;
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthGroupLabel = iso => { const p = iso.split('-'); if (p.length < 2) return iso; const m = parseInt(p[1]) || 1; return `${MONTH[Math.min(Math.max(m - 1, 0), 11)]} ${p[0]}`; };
const unitLabel = u => u === 'l' ? 'L' : u;
const volL = v => unitLabel(v.volumeUnit);
const effL = v => `${v.odometerUnit}/${volL(v)}`;
const displayDate = s => { const p = s.split('-'); if (p.length !== 3) return s; return `${p[2]} ${MON[(+p[1] || 1) - 1]} ${p[0]}`; };

/* ---------- CSV ---------- */
const US_GAL = 3.785411784, IMP_GAL = 4.54609, MILE_KM = 1.609344;
const DATE_RE = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/;
function splitDate(raw) {
  let s = raw.trim(); if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  s = s.split('T')[0].split(' ')[0].trim();
  const m = DATE_RE.exec(s); if (!m) return null;
  const yf = m[1].length === 4, yl = m[3].length === 4; if (yf === yl) return null;
  return { a: +m[1], b: +m[2], c: +m[3], yearFirst: yf };
}
function orderFromPattern(pattern) {
  if (pattern == null) return null;
  let p = pattern.trim(); if (p.length >= 2 && p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1); p = p.toLowerCase();
  const y = p.indexOf('y'), d = p.indexOf('d'), mo = p.indexOf('m'); if (y < 0 || d < 0 || mo < 0) return null;
  if (y < d && d < mo) return 'YDM'; if (y < mo && mo < d) return 'YMD'; if (d < mo && mo < y) return 'DMY'; if (mo < d && d < y) return 'MDY'; return null;
}
function resolveDates(rawDates, declared) {
  let ymd = 0, ydm = 0, dmy = 0, mdy = 0, amb = false;
  for (const raw of rawDates) {
    const p = splitDate(raw); if (!p) continue;
    if (p.yearFirst) { const x = p.b, y = p.c; if (x > 12 && y <= 12) ydm++; else if (y > 12 && x <= 12) ymd++; }
    else { const x = p.a, y = p.b; if (x > 12 && y <= 12) dmy++; else if (y > 12 && x <= 12) mdy++; else if (x <= 12 && y <= 12 && x !== y) amb = true; }
  }
  const hint = orderFromPattern(declared); let guessed = false;
  const yearFirst = (ymd > 0 && ydm === 0) ? 'YMD' : (ydm > 0 && ymd === 0) ? 'YDM' : (ymd > 0 && ydm > 0) ? 'YMD'
    : (hint === 'YMD' || hint === 'YDM') ? hint : 'YMD';
  let yearLast;
  if (dmy > 0 && mdy === 0) yearLast = 'DMY'; else if (mdy > 0 && dmy === 0) yearLast = 'MDY'; else if (dmy > 0 && mdy > 0) yearLast = 'DMY';
  else if (hint === 'DMY' || hint === 'MDY') yearLast = hint; else { if (amb) guessed = true; yearLast = 'DMY'; }
  return { yearFirst, yearLast, guessed, conflicting: (ymd > 0 && ydm > 0) || (dmy > 0 && mdy > 0) };
}
function buildDate(p, order) {
  let y, m, d;
  if (order === 'YMD') { y = p.a; m = p.b; d = p.c; } else if (order === 'YDM') { y = p.a; m = p.c; d = p.b; }
  else if (order === 'DMY') { y = p.c; m = p.b; d = p.a; } else { y = p.c; m = p.a; d = p.b; }
  return validYMD(y, m, d) ? isoFrom(y, m, d) : null;
}
function parseDate(raw, res) {
  const p = splitDate(raw); if (!p) return null;
  const order = p.yearFirst ? res.yearFirst : res.yearLast;
  const primary = buildDate(p, order);
  if (primary && !res.conflicting) return primary;
  if (!res.conflicting) return null;
  return primary || buildDate(p, { YMD: 'YDM', YDM: 'YMD', DMY: 'MDY', MDY: 'DMY' }[order]);
}

const csvQuote = v => `"${String(v).replace(/"/g, '""')}"`;
const valueAt = (row, i) => (i >= 0 && i < row.length) ? row[i] : null;
const normHeader = v => v.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '');
const flag = v => ['1', 'true', 'yes', 'y'].includes((v ?? '').trim().toLowerCase());
const validBase = (o, v, c) => o != null && isFinite(o) && o >= 0 && v != null && isFinite(v) && v > 0 && c != null && isFinite(c) && c >= 0;
const convDist = (v, s, t) => { const km = s === 'mi' ? v * MILE_KM : v; return t === 'mi' ? km / MILE_KM : km; };
const convVol = (v, s, t) => { const l = s === 'gal' ? v * US_GAL : s === 'imp_gal' ? v * IMP_GAL : v; return t === 'gal' ? l / US_GAL : l; };

function csvExport(vehicle) {
  const dById = new Map(computeDerived(vehicle.entries).map(d => [d.id, d]));
  const distCode = vehicle.odometerUnit === 'mi' ? 1 : 0, volCode = vehicle.volumeUnit === 'gal' ? 1 : 0;
  let consCode = 0, consHeader = 'l/100km (optional)';
  if (vehicle.odometerUnit === 'mi' && vehicle.volumeUnit === 'gal') { consCode = 1; consHeader = 'mpg (optional)'; }
  const odoH = vehicle.odometerUnit === 'mi' ? 'Odo (mi)' : 'Odo (km)';
  const fuelH = vehicle.volumeUnit === 'gal' ? 'Fuel (us gallons)' : 'Fuel (litres)';
  let out = '"## Vehicle"\r\n"Name","Description","DistUnit","FuelUnit","ConsumptionUnit","ImportCSVDateFormat"\r\n';
  out += `${csvQuote(vehicle.name)},"",${distCode},${volCode},${consCode},"yyyy-MM-dd"\r\n"## Log"\r\n`;
  out += ['Data', odoH, fuelH, 'Full', 'Price (optional)', consHeader, 'latitude (optional)', 'longitude (optional)', 'City (optional)', 'Notes (optional)', 'Missed'].map(csvQuote).join(',') + '\r\n';
  for (const e of sortedEntries(vehicle.entries)) {
    const price = (e.volume > 0 && isFinite(e.totalCost)) ? e.totalCost / e.volume : e.unitPrice;
    const d = dById.get(e.id); let cons = 0;
    if (d && d.qualifies && d.efficiency != null) {
      if (vehicle.odometerUnit === 'mi' && vehicle.volumeUnit === 'gal') cons = d.efficiency;
      else if (vehicle.odometerUnit === 'km' && vehicle.volumeUnit === 'l') cons = 100 / d.efficiency;
    }
    out += [e.date, e.odometer.toFixed(6), e.volume.toFixed(6), e.fullTank ? '1' : '0', price.toFixed(6), cons.toFixed(6), '0', '0', '', e.notes, e.missedPrevious ? '1' : '0'].map(csvQuote).join(',') + '\r\n';
  }
  return out;
}

function parseCsvRows(text) {
  const clean = text.replace(/^\uFEFF/, ''); if (!clean) return [];
  const rows = []; let row = [], cell = '', inQ = false;
  const endCell = () => { row.push(cell); cell = ''; };
  const endRow = () => { endCell(); if (row.some(c => c !== '')) rows.push(row); row = []; };
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '"') { if (inQ && clean[i + 1] === '"') { cell += '"'; i++; } else inQ = !inQ; }
    else if (c === ',') { if (inQ) cell += c; else endCell(); }
    else if (c === '\r' || c === '\n') { if (inQ) cell += c; else { if (c === '\r' && clean[i + 1] === '\n') i++; endRow(); } }
    else cell += c;
  }
  if (row.length || cell) endRow();
  return rows;
}

function buildEntriesFromCsv(text, tDist = 'km', tVol = 'l') {
  const rows = parseCsvRows(text); if (!rows.length) return { entries: [], skippedType: 0, errors: 0, datesGuessed: false };
  const isF = rows.some(r => (r[0] || '').trim().toLowerCase() === '## vehicle') && rows.some(r => (r[0] || '').trim().toLowerCase() === '## log');
  return isF ? parseFuelio(rows, tDist, tVol) : parseLegacy(rows);
}
function parseLegacy(rows) {
  const h = rows[0].map(normHeader), ix = n => h.indexOf(n);
  const iType = ix('type'), iOdo = ix('odo'), iDate = ix('date'), iCost = ix('totalcost'), iVol = ix('volume'), iUP = ix('unitprice'), iNotes = ix('notes');
  const entries = []; let skippedType = 0, errors = 0;
  const res = resolveDates(rows.slice(1).map(r => valueAt(r, iDate)).filter(x => x != null).map(x => x.trim()));
  for (const row of rows.slice(1)) {
    if (row.every(c => c.trim() === '')) continue;
    const type = (valueAt(row, iType) ?? 'fuel').trim().toLowerCase();
    if (type !== 'fuel') { skippedType++; continue; }
    const odo = num(valueAt(row, iOdo)), date = (valueAt(row, iDate) ?? '').trim(), cost = num(valueAt(row, iCost)), vol = num(valueAt(row, iVol));
    const pUP = num(valueAt(row, iUP)), notes = (valueAt(row, iNotes) ?? '').trim(), pd = parseDate(date, res);
    if (!validBase(odo, vol, cost) || !pd) { errors++; continue; }
    const up = (pUP != null && isFinite(pUP) && pUP >= 0) ? pUP : cost / vol;
    if (!isFinite(up) || up < 0) { errors++; continue; }
    entries.push(mkEntry({ date: pd, odometer: odo, volume: vol, totalCost: cost, unitPrice: up, fullTank: true, missedPrevious: false, notes }));
  }
  return { entries, skippedType, errors, datesGuessed: res.guessed };
}
function parseFuelio(rows, tDist, tVol) {
  let vUnit = { d: 'km', v: 'l' }, declared = null, hIdx = -1, start = -1;
  for (let i = 0; i < rows.length; i++) {
    const m = (rows[i][0] || '').trim().toLowerCase();
    if (m === '## vehicle') {
      const h = rows[i + 1] && rows[i + 1].map(normHeader), data = rows[i + 2];
      if (h && data) {
        const dc = parseInt(valueAt(data, h.indexOf('distunit'))) || 0, fc = parseInt(valueAt(data, h.indexOf('fuelunit'))) || 0;
        declared = valueAt(data, h.indexOf('importcsvdateformat'));
        vUnit = { d: dc === 1 ? 'mi' : 'km', v: fc === 1 ? 'gal' : fc === 2 ? 'imp_gal' : 'l' };
      }
    }
    if (m === '## log') { hIdx = i + 1; start = i + 2; break; }
  }
  const nonBlank = r => r.some(c => c.trim() !== '');
  if (hIdx < 0 || hIdx >= rows.length) return { entries: [], skippedType: 0, errors: rows.slice(1).filter(nonBlank).length, datesGuessed: false };
  const h = rows[hIdx].map(normHeader);
  const iDate = h.indexOf('data'), iOdo = h.findIndex(x => x.startsWith('odo(')), iFuel = h.findIndex(x => x.startsWith('fuel(')),
    iFull = h.indexOf('full'), iPrice = h.findIndex(x => x.startsWith('price')), iNotes = h.findIndex(x => x.startsWith('notes')), iMiss = h.indexOf('missed');
  if (iDate < 0 || iOdo < 0 || iFuel < 0) return { entries: [], skippedType: 0, errors: rows.slice(start).filter(nonBlank).length, datesGuessed: false };
  const logRows = []; for (const r of rows.slice(start)) { if ((r[0] || '').trim().startsWith('##')) break; logRows.push(r); }
  const res = resolveDates(logRows.map(r => valueAt(r, iDate)).filter(x => x != null).map(x => x.trim()), declared);
  const entries = []; let errors = 0;
  for (const row of rows.slice(start)) {
    if (!row.length || row.every(c => c.trim() === '')) continue;
    if ((row[0] || '').trim().startsWith('##')) break;
    const date = parseDate((valueAt(row, iDate) ?? '').trim(), res), sOdo = num(valueAt(row, iOdo)), sVol = num(valueAt(row, iFuel));
    const full = flag(valueAt(row, iFull)), missed = flag(valueAt(row, iMiss)), sUP = num(valueAt(row, iPrice)) ?? 0, notes = (valueAt(row, iNotes) ?? '').trim();
    if (!date || sOdo == null || !isFinite(sOdo) || sOdo < 0 || sVol == null || !isFinite(sVol) || sVol <= 0 || !isFinite(sUP) || sUP < 0) { errors++; continue; }
    const tOdo = convDist(sOdo, vUnit.d, tDist), tv = convVol(sVol, vUnit.v, tVol), total = sVol * sUP, tUP = tv > 0 ? total / tv : 0;
    if (![tOdo, tv, total, tUP].every(isFinite)) { errors++; continue; }
    entries.push(mkEntry({ date, odometer: tOdo, volume: tv, totalCost: total, unitPrice: tUP, fullTank: full, missedPrevious: missed, notes }));
  }
  return { entries, skippedType: 0, errors, datesGuessed: res.guessed };
}
function mergeImported(existing, imported) {
  const key = e => `${e.date}|${e.odometer}`, keys = new Set(existing.map(key)), merged = [...existing]; let added = 0, duplicates = 0;
  for (const e of imported) { if (keys.has(key(e))) { duplicates++; continue; } keys.add(key(e)); merged.push(e); added++; }
  return { merged, added, duplicates };
}

/* ---------- stats ---------- */
const RANGE_OPTIONS = [['all', 'All time'], ['year', 'This year'], ['12m', '12 months'], ['6m', '6 months'], ['3m', '3 months'], ['custom', 'Custom']];
const METRIC_OPTIONS = [['efficiency', 'Efficiency'], ['cost', 'Total cost'], ['volume', 'Volume'], ['price', 'Unit price'], ['costPerDistance', 'Cost per distance'], ['distance', 'Distance since last fill']];
const GROUP_BY_OPTIONS = [['none', 'No grouping (per fill-up)'], ['monthly-sum', 'Sum by month'], ['monthly-avg', 'Average by month'], ['cumulative', 'Cumulative']];
const X_AXIS_OPTIONS = [['date', 'Date'], ['odometer', 'Odometer']], CHART_TYPE_OPTIONS = [['line', 'Line'], ['bar', 'Bar']];
const CARD_SUGGESTIONS = [
  ['Efficiency over time', 'Line chart of efficiency for every qualifying fill.', { metric: 'efficiency', groupBy: 'none', chartType: 'line' }],
  ['Cost by month', 'Total spend grouped by calendar month.', { metric: 'cost', groupBy: 'monthly-sum', chartType: 'bar' }],
  ['Cost per distance trend', 'How your running cost per km/mi has moved over time.', { metric: 'costPerDistance', groupBy: 'none', chartType: 'line' }],
  ['Cumulative spend', "Running total of everything you've spent on fuel.", { metric: 'cost', groupBy: 'cumulative', chartType: 'line' }],
  ['Fill-up volume', 'Bar chart of how much you filled each time.', { metric: 'volume', groupBy: 'none', chartType: 'bar' }],
  ['Unit price over time', 'Track fuel price at the pump across fills.', { metric: 'price', groupBy: 'none', chartType: 'line' }],
  ['Average monthly efficiency', 'Efficiency averaged per calendar month.', { metric: 'efficiency', groupBy: 'monthly-avg', chartType: 'line' }],
  ['Distance between fills', 'How far you rode/drove between each fill-up.', { metric: 'distance', groupBy: 'none', chartType: 'bar' }],
  ['Best & worst fill-ups', 'Your most and least efficient fills in the current range.', { kind: 'bestworst' }],
  ['Year over year', 'Cost, distance and average efficiency, one row per year.', { kind: 'yoy' }],
  ['This month vs last month', 'Quick delta on cost and efficiency.', { kind: 'monthdelta' }],
  ['Fueling rhythm heatmap', 'Weekly fuel spend intensity over the last year.', { kind: 'heatmap' }],
  ['Average days between fills', 'How regularly you fill up, plus how consistent that is.', { kind: 'avgdays' }]
];
function filterByRange(entries, range, cs, ce) {
  let s = null, e = null;
  if (range === 'custom') { s = cs; e = ce; } else if (range === 'year') s = `${new Date().getFullYear()}-01-01`;
  else if (range === '12m') s = minusMonths(12); else if (range === '6m') s = minusMonths(6); else if (range === '3m') s = minusMonths(3);
  return entries.filter(x => (s == null || x.date >= s) && (e == null || x.date <= e));
}
function metricValue(e, m) {
  switch (m) {
    case 'efficiency': return e.qualifies ? e.efficiency : null; case 'cost': return e.totalCost; case 'volume': return e.volume;
    case 'price': return e.unitPrice; case 'costPerDistance': return e.costPerKm; case 'distance': return e.distanceSinceLast; default: return null;
  }
}
function buildChartData(card, filtered) {
  const wm = filtered.map(e => [e, metricValue(e, card.metric)]).filter(x => x[1] != null);
  if (!wm.length) return { labels: [], values: [] };
  if (card.groupBy === 'cumulative') {
    let run = 0; const labels = [], values = [];
    for (const [e, v] of [...wm].sort((a, b) => cmp(a[0].date, b[0].date))) { run += v; labels.push(fmtDate(e.date)); values.push(roundTo(run, 2)); }
    return { labels, values };
  }
  if (card.groupBy === 'monthly-sum' || card.groupBy === 'monthly-avg') {
    const g = {}; for (const [e, v] of [...wm].sort((a, b) => cmp(a[0].date, b[0].date))) (g[e.date.slice(0, 7)] ||= []).push(v);
    const keys = Object.keys(g).sort();
    return { labels: keys, values: keys.map(k => { const s = sum(g[k], x => x); return roundTo(card.groupBy === 'monthly-avg' ? s / g[k].length : s, 2); }) };
  }
  const odo = card.xAxis === 'odometer';
  const sorted = [...wm].sort((a, b) => odo ? a[0].odometer - b[0].odometer : cmp(a[0].date, b[0].date));
  return { labels: sorted.map(([e]) => odo ? fmtNum(e.odometer, 0) : fmtDate(e.date)), values: sorted.map(([, v]) => roundTo(v, 2)) };
}
function bestWorst(filtered) {
  const pool = filtered.filter(e => e.qualifies); let best = null, worst = null;
  for (const e of pool) { if (!best || e.efficiency > best.efficiency) best = e; if (!worst || e.efficiency < worst.efficiency) worst = e; }
  return { best, worst };
}
function yearOverYear(all) {
  const g = {}; for (const e of [...all].sort((a, b) => cmp(a.date, b.date))) (g[e.date.slice(0, 4)] ||= []).push(e);
  return Object.keys(g).sort().map(year => {
    const rows = g[year], q = rows.filter(r => r.qualifies), qd = sum(q, r => r.distanceSinceLast || 0), qv = sum(q, r => r.volume);
    return { year, cost: sum(rows, r => r.totalCost), distance: sum(rows, r => r.distanceSinceLast || 0), avgEfficiency: qv > 0 ? qd / qv : null };
  });
}
function monthOverMonth(all) {
  const cur = todayISO().slice(0, 7), prev = minusMonths(1).slice(0, 7);
  const cost = k => { const r = all.filter(e => e.date.slice(0, 7) === k); return r.length ? sum(r, e => e.totalCost) : null; };
  const eff = k => { const r = all.filter(e => e.date.slice(0, 7) === k && e.qualifies), d = sum(r, e => e.distanceSinceLast || 0), v = sum(r, e => e.volume); return v > 0 ? d / v : null; };
  return { curCost: cost(cur), prevCost: cost(prev), curEff: eff(cur), prevEff: eff(prev) };
}
const dayMs = 86400000, toUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
function weeklyHeat(filtered) {
  const by = new Map();
  for (const e of filtered) {
    const t = toUTC(e.date); if (isNaN(t)) continue;
    const ws = t - new Date(t).getUTCDay() * dayMs; by.set(ws, (by.get(ws) || 0) + e.totalCost);
  }
  if (!by.size) return [];
  const weeks = [...by.keys()].sort((a, b) => a - b).slice(-52), max = Math.max(...weeks.map(w => by.get(w)));
  return weeks.map(w => { const c = by.get(w); const level = max <= 0 ? 0 : c <= 0 ? 0 : c < max * .33 ? 1 : c < max * .66 ? 2 : 3; return { level, cost: c }; });
}
function averageDays(filtered) {
  const t = filtered.map(e => toUTC(e.date)).filter(x => !isNaN(x)).sort((a, b) => a - b);
  if (t.length < 2) return { mean: null, sd: null };
  const gaps = t.slice(1).map((x, i) => Math.round((x - t[i]) / dayMs)), mean = sum(gaps, x => x) / gaps.length;
  return { mean, sd: Math.sqrt(sum(gaps, g => (g - mean) * (g - mean)) / gaps.length) };
}

/* ---------- icons ---------- */
const P = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  list: 'M19 5v14H5V5h14m1.1-2H3.9c-.5 0-.9.4-.9.9v16.2c0 .4.4.9.9.9h16.2c.4 0 .9-.5.9-.9V3.9c0-.5-.5-.9-.9-.9zM11 7h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2z',
  bars: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
  gas: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
  speed: 'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
  pay: 'M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  down: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  up: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  more: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
  check: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  cal: 'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z',
  play: 'M8 5v14l11-7z',
  tup: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  tdown: 'M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z',
  addchart: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z',
  cloud: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z'
};
const ic = (n, size = 24, color) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor"${color ? ` style="color:${color}"` : ''}><path d="${P[n]}"/></svg>`;
const badge = (n, c, size = 42) => `<div class="badge" style="width:${size}px;height:${size}px;background:${c}1A">${ic(n, Math.round(size / 2), c)}</div>`;
const mono = (t, size, weight = 400, color) => `<span class="mono" style="font-size:${size}px;font-weight:${weight}${color ? `;color:${color}` : ''}">${esc(t)}</span>`;
const sel = (id, label, opts, val) => `<label class="field"><span>${label}</span><select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
const inp = (id, label, val, extra = '') => `<label class="field"><span>${label}</span><input id="${id}" value="${esc(val)}" ${extra}></label>`;
const dinp = (id, label, val) => `<label class="field"><span>${label}</span><input id="${id}" type="date" value="${esc(val || '')}"></label>`;
const sectionHeader = (t, s) => `<div class="tl">${t}</div>${s ? `<div class="bs dim" style="margin-top:3px">${s}</div>` : ''}`;
const emptyBox = (icon, title, msg) => `<div class="empty">${ic(icon, 32, FAINT)}<div class="tm">${title}</div><div class="bs dim">${msg}</div></div>`;
const secTitle = (icon, t, c) => `<div class="row" style="margin:20px 0 8px;gap:8px">${ic(icon, 18, c)}<span class="tm">${t}</span></div>`;

/* ---------- persistence & state ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return;
    const j = JSON.parse(raw), d = emptyState();
    S = {
      vehicles: (j.vehicles || []).map(v => mkVehicle({ ...v, entries: (v.entries || []).map(e => mkEntry(e)), customCards: v.customCards ? v.customCards.map(c => mkCard(c)) : defaultCards() })),
      activeVehicleId: j.activeVehicleId ?? null, settings: { ...d.settings, ...(j.settings || {}) }, lastBackup: j.lastBackup ?? null
    };
  } catch (e) { S = emptyState(); }
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save data — storage may be full"); } }
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200); }
function update(fn) { S = fn(S); persist(); render(); }
const active = () => activeOf(S);
const patchVehicle = (id, fn) => update(s => ({ ...s, vehicles: s.vehicles.map(v => v.id === id ? fn(v) : v) }));

const A = {
  saveEntry(entry, isNew) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, entries: isNew ? [...x.entries, entry] : x.entries.map(e => e.id === entry.id ? entry : e) })); toast(isNew ? 'Entry added' : 'Entry updated'); },
  deleteEntry(id) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, entries: x.entries.filter(e => e.id !== id) })); toast('Entry deleted'); },
  validateOdometer(excludeId, odo) {
    const v = active(); if (!v) return null;
    if (!isFinite(odo) || odo < 0) return 'Odometer must be a non-negative number.';
    const others = v.entries.filter(e => e.id !== excludeId);
    if (others.some(e => e.odometer === odo)) return 'This odometer reading is already used by another entry.';
    const lower = others.filter(e => e.odometer < odo);
    if (lower.length) { const m = Math.max(...lower.map(e => e.odometer)); if (odo <= m) return `Odometer must be greater than the previous entry's reading (${fmtInt(m)} ${v.odometerUnit}).`; }
    const higher = others.filter(e => e.odometer > odo);
    if (higher.length) { const m = Math.min(...higher.map(e => e.odometer)); if (odo >= m) return `Odometer must be less than the next entry's reading (${fmtInt(m)} ${v.odometerUnit}).`; }
    return null;
  },
  validateDate(excludeId, odo, date) {
    const v = active(); if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); if (!m || !validYMD(+m[1], +m[2], +m[3])) return 'Please choose a valid date.';
    if (date > todayISO()) return "Date can't be in the future.";
    const others = v.entries.filter(e => e.id !== excludeId);
    const prev = others.filter(e => e.odometer < odo).sort((a, b) => b.odometer - a.odometer)[0];
    if (prev && date < prev.date) return `Date can't be before the previous entry (${prev.date}, ${fmtInt(prev.odometer)} ${v.odometerUnit}).`;
    const next = others.filter(e => e.odometer > odo).sort((a, b) => a.odometer - b.odometer)[0];
    if (next && date > next.date) return `Date can't be after the next entry (${next.date}, ${fmtInt(next.odometer)} ${v.odometerUnit}).`;
    return null;
  },
  updateVehicle(name, odometerUnit, volumeUnit) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, name: name.trim() ? name : x.name, odometerUnit, volumeUnit })); },
  updateSettings(currency, dateFormat) { update(s => ({ ...s, settings: { currency: (currency.trim() ? currency : 'BDT').toUpperCase(), dateFormat } })); toast('Settings saved'); },
  exported() { update(s => ({ ...s, lastBackup: todayISO() })); toast('CSV exported'); },
  importCsv(text) {
    const v = active(); if (!v) return;
    const r = buildEntriesFromCsv(text, v.odometerUnit, v.volumeUnit), m = mergeImported(v.entries, r.entries);
    patchVehicle(v.id, x => ({ ...x, entries: m.merged }));
    let d = `Imported ${m.added} entries`; if (m.duplicates) d += `, skipped ${m.duplicates} duplicates`; if (r.errors) d += `, ignored ${r.errors} invalid rows`;
    if (r.skippedType) d += `, skipped ${r.skippedType} non-fuel rows`; if (r.datesGuessed) d += '. Dates were ambiguous, read as day-month-year'; toast(d);
  },
  importAsNew(name, odo, vol, text) {
    const r = buildEntriesFromCsv(text, odo, vol); if (!r.entries.length) { toast('No fuel entries found in that file'); return; }
    const v = mkVehicle({ name: name.trim() ? name : 'My vehicle', odometerUnit: odo, volumeUnit: vol, startingOdometer: Math.min(...r.entries.map(e => e.odometer)), entries: r.entries });
    update(s => ({ ...s, vehicles: [...s.vehicles, v], activeVehicleId: v.id }));
    let d = `Imported ${r.entries.length} entries`; if (r.errors) d += `, ignored ${r.errors} invalid rows`; if (r.skippedType) d += `, skipped ${r.skippedType} non-fuel rows`;
    if (r.datesGuessed) d += '. Dates were ambiguous, read as day-month-year'; toast(d);
  },
  clearAll() { update(() => emptyState()); toast('All data cleared'); },
  addCard(c) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, customCards: [...x.customCards, c] })); toast('Card added'); },
  updateCard(c) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, customCards: x.customCards.map(k => k.id === c.id ? c : k) })); toast('Card updated'); },
  deleteCard(id) { const v = active(); if (!v) return; patchVehicle(v.id, x => ({ ...x, customCards: x.customCards.filter(k => k.id !== id) })); toast('Card removed'); },
  switchVehicle(id) { update(s => ({ ...s, activeVehicleId: id })); },
  addVehicle(name, odometerUnit, volumeUnit, startingOdometer) {
    const v = mkVehicle({ name: name.trim() ? name : 'New vehicle', odometerUnit, volumeUnit, startingOdometer });
    update(s => ({ ...s, vehicles: [...s.vehicles, v], activeVehicleId: v.id })); toast('Vehicle added');
  },
  deleteVehicle(id) {
    update(s => { const rem = s.vehicles.filter(v => v.id !== id); return { ...s, vehicles: rem, activeVehicleId: s.activeVehicleId === id ? (rem[0] ? rem[0].id : null) : s.activeVehicleId }; }); toast('Vehicle deleted');
  },
  demo() { update(() => demoState()); toast('Loaded sample data'); }
};

/* ---------- modals ---------- */
function openOverlay(html, cls = '') {
  const o = document.createElement('div'); o.className = 'overlay ' + cls; o.innerHTML = html; $('#modal-root').appendChild(o); document.body.classList.add('lock');
  const close = () => { o.remove(); if (!$('#modal-root').children.length) document.body.classList.remove('lock'); };
  o.addEventListener('click', e => { if (e.target === o) close(); });
  return { el: o, close, $: s => $(s, o) };
}
const openSheet = html => openOverlay(`<div class="sheet"><div class="grab"></div>${html}</div>`);
const openDialog = html => openOverlay(`<div class="dialog">${html}</div>`, 'mid');
function confirmDialog(title, text, label, onOk) {
  const d = openDialog(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="acts"><button class="tbtn" id="no">Cancel</button><button class="tbtn danger" id="yes">${esc(label)}</button></div>`);
  d.$('#no').onclick = d.close; d.$('#yes').onclick = () => { d.close(); onOk(); };
}
function unitSeg(id, opts, val) { return `<div class="seg" id="${id}" data-v="${val}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
function wireSeg(d, id) { const s = d.$('#' + id); s.onclick = e => { const b = e.target.closest('button'); if (!b) return; s.dataset.v = b.dataset.v; s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; }

function entrySheet(editing) {
  const v = active(); if (!v) return;
  const d = openSheet(`<div class="tl">${editing ? 'Edit fill-up' : 'Add fill-up'}</div><div class="bs dim" style="margin:4px 0 16px">Record the numbers from your fuel receipt or pump.</div>
  <div class="stack">${dinp('date', 'Date', editing ? editing.date : todayISO())}
  ${inp('odo', `Odometer (${v.odometerUnit})`, editing ? fmtInput(editing.odometer) : '', 'inputmode="decimal"')}
  <div class="row g12"><div class="f1">${inp('vol', `Volume (${v.volumeUnit})`, editing ? fmtInput(editing.volume) : '', 'inputmode="decimal"')}</div><div class="f1">${inp('cost', 'Total cost', editing ? fmtInput(editing.totalCost) : '', 'inputmode="decimal"')}</div></div>
  ${inp('up', 'Unit price (auto-filled)', editing ? fmtInput(editing.unitPrice) : '', 'inputmode="decimal"')}
  ${inp('notes', 'Notes (optional)', editing ? editing.notes : '')}</div>
  <label class="check" style="margin-top:8px"><input type="checkbox" id="full" ${!editing || editing.fullTank ? 'checked' : ''}>Full tank</label>
  <label class="check"><input type="checkbox" id="miss" ${editing && editing.missedPrevious ? 'checked' : ''}>Missed a previous fill</label>
  <div class="err" id="err" style="margin-top:4px"></div>
  <div class="row g10" style="margin-top:10px">${editing ? '<button class="btn out danger f1" id="del">Delete</button>' : ''}<button class="btn f1" id="save">Save entry</button></div>`);
  let manual = false;
  const auto = () => { if (manual) return; const vo = num(d.$('#vol').value), c = num(d.$('#cost').value); if (vo != null && vo > 0 && c != null && c >= 0) d.$('#up').value = fmtInput(Math.round((c / vo) * 100) / 100); };
  d.$('#vol').oninput = auto; d.$('#cost').oninput = auto; d.$('#up').oninput = () => { manual = true; };
  const setErr = m => { d.$('#err').textContent = m; };
  if (editing) d.$('#del').onclick = () => confirmDialog('Delete this entry?', 'This cannot be undone.', 'Delete', () => { A.deleteEntry(editing.id); d.close(); });
  d.$('#save').onclick = () => {
    const date = d.$('#date').value, odo = num(d.$('#odo').value), vol = num(d.$('#vol').value), c = num(d.$('#cost').value), pup = num(d.$('#up').value);
    const vd = /^\d{4}-\d{2}-\d{2}$/.test(date) && validYMD(+date.slice(0, 4), +date.slice(5, 7), +date.slice(8, 10));
    if (!vd || odo == null || !isFinite(odo) || odo < 0 || vol == null || !isFinite(vol) || vol <= 0 || c == null || !isFinite(c) || c < 0) return setErr('Please enter a valid date, odometer, volume, and non-negative cost.');
    const oe = A.validateOdometer(editing && editing.id, odo); if (oe) return setErr(oe);
    const de = A.validateDate(editing && editing.id, odo, date); if (de) return setErr(de);
    let up; if (pup == null) up = Math.round((c / vol) * 100) / 100; else { if (!isFinite(pup) || pup < 0) return setErr('Unit price must be a non-negative number.'); up = pup; }
    A.saveEntry({ id: editing ? editing.id : uuid(), date, odometer: odo, volume: vol, totalCost: c, unitPrice: up, fullTank: d.$('#full').checked, missedPrevious: d.$('#miss').checked, notes: d.$('#notes').value.trim() }, !editing);
    d.close();
  };
}

function vehicleSwitcher() {
  const d = openSheet(`<div class="row g12">${badge('car', TEAL)}<div><div class="tl">Your vehicles</div><div class="bs dim">Switch, edit or add a vehicle.</div></div></div><div style="height:16px"></div>
  ${S.vehicles.map(v => `<div class="card p14 click" data-id="${v.id}" style="margin-bottom:8px"><div class="row g12">${badge('car', v.id === S.activeVehicleId ? TEAL : FAINT)}
  <div class="f1"><div class="ts">${esc(v.name)}</div><div class="bs dim" style="margin-top:3px">${v.odometerUnit} · ${v.volumeUnit} · ${v.entries.length} fill-ups</div></div>
  ${v.id === S.activeVehicleId ? ic('check', 21, TEAL) : ''}<button class="tbtn" data-edit="${v.id}">${ic('edit', 16)}Edit</button></div></div>`).join('')}
  <button class="btn tall full" id="add" style="margin-top:8px">${ic('add')}Add vehicle</button>`);
  d.el.onclick = e => {
    if (e.target === d.el) return d.close();
    const ed = e.target.closest('[data-edit]'); if (ed) { d.close(); vehicleForm(S.vehicles.find(v => v.id === ed.dataset.edit)); return; }
    const c = e.target.closest('[data-id]'); if (c) { A.switchVehicle(c.dataset.id); d.close(); return; }
    if (e.target.closest('#add')) { d.close(); vehicleForm(null); }
  };
}
function vehicleForm(existing) {
  const d = openSheet(`<div class="tl">${existing ? 'Edit vehicle' : 'Add a vehicle'}</div><div class="bs dim" style="margin:5px 0 16px">${existing ? 'Update the details used for calculations.' : 'Set the units and starting odometer before logging fuel.'}</div>
  <div class="stack">${inp('name', 'Vehicle name', existing ? existing.name : '')}
  <div class="row g10"><div class="f1">${sel('odo', 'Distance', [['km', 'Kilometers (km)'], ['mi', 'Miles (mi)']], existing ? existing.odometerUnit : 'km')}</div><div class="f1">${sel('vol', 'Volume', [['l', 'Liters (L)'], ['gal', 'Gallons (gal)']], existing ? existing.volumeUnit : 'l')}</div></div>
  ${existing ? '' : inp('start', 'Starting odometer', '0', 'inputmode="decimal"')}</div>
  <div class="err" id="err" style="margin-top:8px"></div>
  <div class="row g10" style="margin-top:16px">${existing ? '<button class="btn tall out danger f1" id="del">Delete</button>' : ''}<button class="btn tall f1" id="save">${existing ? 'Save changes' : 'Add vehicle'}</button></div>`);
  if (existing) d.$('#del').onclick = () => confirmDialog(`Delete ${existing.name}?`, 'This removes the vehicle and all of its fuel entries. This cannot be undone.', 'Delete', () => { A.deleteVehicle(existing.id); d.close(); });
  d.$('#save').onclick = () => {
    const so = existing ? null : num(d.$('#start').value);
    if (!existing && (so == null || !isFinite(so) || so < 0)) { d.$('#err').textContent = 'Starting odometer must be a non-negative number.'; return; }
    const name = d.$('#name').value, o = d.$('#odo').value, vl = d.$('#vol').value;
    if (existing) { A.switchVehicle(existing.id); A.updateVehicle(name, o, vl); } else A.addVehicle(name, o, vl, so);
    d.close();
  };
}

function customRangeDialog() {
  const d = openDialog(`<h3>Choose date range</h3><div class="stack" style="margin-bottom:16px">${dinp('from', 'From', ui.cs)}${dinp('to', 'To', ui.ce)}<div class="err" id="err"></div></div>
  <div class="acts"><button class="tbtn" id="no">Cancel</button><button class="tbtn" id="ok">Apply</button></div>`);
  const chk = () => { const a = d.$('#from').value, b = d.$('#to').value, ok = a && b && a <= b; d.$('#ok').disabled = !ok; d.$('#ok').style.opacity = ok ? 1 : .4; d.$('#err').textContent = (a && b && a > b) ? 'The start date must be before the end date.' : ''; };
  d.$('#from').oninput = chk; d.$('#to').oninput = chk; chk();
  d.$('#no').onclick = d.close;
  d.$('#ok').onclick = () => { ui.cs = d.$('#from').value; ui.ce = d.$('#to').value; ui.range = 'custom'; d.close(); render(); };
}
function addCardSheet() {
  const d = openSheet(`<div class="tm">Add a card</div><div class="bs faint" style="margin:6px 0 14px">Pick a ready-made card, or build your own from any metric.</div>
  <button class="btn full" id="own">Build your own card</button>
  <div style="height:360px;overflow-y:auto;margin-top:14px">${CARD_SUGGESTIONS.map((s, i) => `<div class="sug" data-i="${i}"><div class="ts">${s[0]}</div><div class="bs dim" style="margin-top:3px">${s[1]}</div></div>`).join('')}</div>`);
  d.$('#own').onclick = () => { d.close(); cardBuilder(null); };
  d.el.addEventListener('click', e => { const s = e.target.closest('.sug'); if (!s) return; const x = CARD_SUGGESTIONS[+s.dataset.i]; A.addCard(mkCard({ title: x[0], ...x[2] })); d.close(); });
}
function cardBuilder(existing) {
  const kind = existing ? existing.kind : 'chart';
  const d = openSheet(`<div class="tm">${existing ? 'Edit card' : 'Build your own card'}</div><div class="stack" style="margin-top:14px">${inp('title', 'Title', existing ? existing.title : '')}
  ${kind === 'chart' ? `${sel('metric', 'Metric', METRIC_OPTIONS, existing ? existing.metric : 'efficiency')}${sel('group', 'Group by', GROUP_BY_OPTIONS, existing ? existing.groupBy : 'none')}
  <div class="row g12"><div class="f1">${sel('x', 'X-axis', X_AXIS_OPTIONS, existing ? existing.xAxis : 'date')}</div><div class="f1">${sel('type', 'Chart type', CHART_TYPE_OPTIONS, existing ? existing.chartType : 'line')}</div></div>` : ''}</div>
  <div class="row g10" style="margin-top:16px">${existing ? '<button class="btn out danger f1" id="del">Delete</button>' : ''}<button class="btn f1" id="save">Save card</button></div>`);
  if (existing) d.$('#del').onclick = () => { A.deleteCard(existing.id); d.close(); };
  d.$('#save').onclick = () => {
    const base = existing || mkCard({ kind: 'chart' }), title = d.$('#title').value;
    const c = { ...base, title: title.trim() ? title : 'Untitled card' };
    if (kind === 'chart') Object.assign(c, { metric: d.$('#metric').value, groupBy: d.$('#group').value, xAxis: d.$('#x').value, chartType: d.$('#type').value });
    existing ? A.updateCard(c) : A.addCard(c); d.close();
  };
}
function importSheet() {
  const d = openSheet(`<div class="tl">Import a vehicle</div><div class="bs dim" style="margin:6px 0 16px">Choose the vehicle name and units before selecting the CSV file.</div>
  ${inp('name', 'Vehicle name', '')}<div class="row g10 mt12"><div class="f1">${unitSeg('odo', [['km', 'km'], ['mi', 'mi']], 'km')}</div><div class="f1">${unitSeg('vol', [['l', 'L'], ['gal', 'gal']], 'l')}</div></div>
  <button class="btn tall full" id="go" style="margin-top:16px">Choose CSV file</button>`);
  wireSeg(d, 'odo'); wireSeg(d, 'vol');
  d.$('#go').onclick = () => { const p = [d.$('#name').value.trim() || 'My vehicle', d.$('#odo').dataset.v, d.$('#vol').dataset.v]; d.close(); pickCsv(p); };
}

/* ---------- export / import ---------- */
let pendingImport = null;
function pickCsv(pending) { pendingImport = pending; const f = $('#file'); f.value = ''; f.click(); }
async function doExport() {
  const v = active(); if (!v) return; const csv = csvExport(v), name = `fuel-log-export-${todayISO()}.csv`;
  if (window.AndroidBridge) { window.AndroidBridge.saveCsv(name, csv); return; } // Android WebView wrapper: native save dialog
  try {
    const file = new File([csv], name, { type: 'text/csv' });
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    A.exported();
  } catch (e) { if (e && e.name === 'AbortError') return; toast("Couldn't save the CSV file"); }
}

/* ---------- screens ---------- */
const ui = { tab: 'home', range: 'all', cs: null, ce: null };
const TABS = [['home', 'Home', 'home'], ['log', 'Log', 'list'], ['stats', 'Stats', 'bars'], ['settings', 'Settings', 'settings']];
let chartJobs = [];

const spark = vals => {
  if (vals.length < 2) return '';
  const w = 300, h = 46, p = 4, mx = Math.max(...vals), mn = Math.min(...vals), rg = (mx - mn) || 1;
  const line = vals.map((x, i) => `${(w * i / (vals.length - 1)).toFixed(1)},${(p + (h - 2 * p) * (1 - (x - mn) / rg)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;margin-top:14px"><polygon points="0,${h} ${line} ${w},${h}" fill="rgba(255,255,255,.13)"/><polyline points="${line}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
};
const effPill = (e, v) => e.qualifies ? `<div class="col end"><span class="epill">${fmtNum(e.efficiency, 2)}</span><span class="lsm faint" style="margin-top:4px">${effL(v)}</span></div>` : '';
function homeScreen(v, D) {
  const q = D.filter(e => e.qualifies), tv = sum(D, e => e.volume), tc = sum(D, e => e.totalCost), td = sum(D, e => e.distanceSinceLast || 0);
  const qd = sum(q, e => e.distanceSinceLast || 0), qv = sum(q, e => e.volume), avgEff = qv > 0 ? qd / qv : null, avgCost = td > 0 ? tc / td : null, has = D.length > 0;
  const ht = (label, val, unit) => `<div class="htile f1"><span>${label}</span><b>${esc(val)}${unit ? `<em>${esc(unit)}</em>` : ''}</b></div>`;
  const life = (label, val, unit, c) => `<div class="stat f1"><i style="background:${c}"></i><div class="lsm faint">${label}</div><div class="sv">${mono(val, 18, 700)}</div>${unit ? `<div class="lsm faint">${esc(unit)}</div>` : '<div style="height:14px"></div>'}</div>`;
  let h = `<div class="pad">${sectionHeader('Your fuel overview', 'A quick look at efficiency, spending and distance.')}<div style="height:16px"></div>
  <div class="hero"><div class="row between"><span class="hl">Average efficiency</span>${avgEff != null ? `<span class="hchip">${effL(v)}</span>` : ''}</div>
  <div class="hval">${avgEff != null ? fmtNum(avgEff, 2) : '—'}</div>${avgEff != null ? spark(q.slice(-14).map(e => e.efficiency)) : '<div class="hl" style="margin-top:8px">Log two full-tank fill-ups to measure efficiency.</div>'}
  <div class="row g10 hrow">${ht(`Cost / ${v.odometerUnit}`, avgCost != null ? fmtNum(avgCost, 2) : '—', avgCost != null ? S.settings.currency : '')}${ht('Fuel used', has ? fmtNum(tv, 1) : '—', has ? volL(v) : '')}</div></div>
  <div class="tm" style="margin:22px 0 10px">Lifetime</div><div class="row g10" style="align-items:stretch">${life('Distance', has ? fmtNum(td, 0) : '—', v.odometerUnit, TEAL)}${life('Spent', has ? fmtNum(tc, 0) : '—', has ? S.settings.currency : '', CORAL)}${life('Fill-ups', has ? String(D.length) : '—', '', AMBER)}</div><div style="height:22px"></div>`;
  if (!has) h += `<div class="card"><div class="row g12">${badge('gas', TEAL)}<div><div class="ts">Ready for your first fill-up</div><div class="bs dim" style="margin-top:3px">Tap Add fill-up to record fuel, cost and odometer details.</div></div></div></div>`;
  else { h += `<div class="tm" style="margin-bottom:10px">Latest fill-up</div>${latestCard(D[D.length - 1], v)}${monthlyInsight(D, v)}`; }
  return h + '</div>';
}
function latestCard(e, v) {
  const sv = (l, val) => `<div><div class="lsm faint">${l}</div><div style="margin-top:3px">${mono(val, 12.5, 500)}</div></div>`;
  return `<div class="card entry${e.qualifies ? '' : ' warn'}"><div class="row g12">${badge('gas', e.qualifies ? TEAL : AMBER)}<div class="f1"><div class="ts">${fmtDate(e.date)}</div><div class="bs dim" style="margin-top:3px">${fmtNum(e.odometer, 0)} ${v.odometerUnit} odometer</div></div>
  ${effPill(e, v)}</div>
  <div class="row between" style="margin-top:14px">${sv('Fuel', `${fmtNum(e.volume, 2)} ${volL(v)}`)}${sv('Cost', fmtCur(e.totalCost))}${sv('Price', `${fmtNum(e.unitPrice, 2)} / ${volL(v)}`)}</div>
  ${!e.qualifies ? `<div class="bs amber" style="margin-top:12px">${esc(notCountedReason(e))}</div>` : ''}</div>`;
}
function monthlyInsight(D, v) {
  const f = k => { const r = D.filter(e => e.date.slice(0, 7) === k && e.distanceSinceLast != null), d = sum(r, e => e.distanceSinceLast), c = sum(r, e => e.totalCost); return d > 0 ? c / d : null; };
  const c = f(todayISO().slice(0, 7)), p = f(minusMonths(1).slice(0, 7)); if (c == null || p == null || p === 0) return '';
  const pct = ((c - p) / p) * 100, up = pct >= 0, col = up ? CORAL : TEAL;
  return `<div class="card p14" style="margin-top:14px"><div class="row g10">${ic(up ? 'tup' : 'tdown', 24, col)}<span class="bs dim">Cost per ${v.odometerUnit} is ${up ? 'up' : 'down'} ${fmtNum(Math.abs(pct), 0)}% vs last month.</span></div></div>`;
}

function logScreen(v, D) {
  let h = `<div class="row" style="padding:16px 18px"><div class="f1">${sectionHeader('Fuel log', 'Your fill-ups, newest first.')}${D.length ? `<div class="lm faint" style="margin-top:3px">${D.length} fill-up${D.length === 1 ? '' : 's'}</div>` : ''}</div><button class="ibtn" data-act="export" style="color:var(--dim)">${ic('down', 24)}</button></div>`;
  if (!D.length) return h + `<div style="padding:0 18px">${emptyBox('gas', 'No fill-ups yet', 'Tap + to record your first fueling.')}</div>`;
  const sorted = [...D].sort((a, b) => cmp(b.date, a.date) || b.odometer - a.odometer), by = {};
  for (const e of D) (by[e.date.slice(0, 7)] ||= []).push(e);
  const mm = (l, val, flex) => `<div class="col end" style="flex:${flex}"><span class="lsm faint">${l}</span>${mono(val, 11, 500)}</div>`;
  h += '<div style="padding:2px 18px 96px" class="stack">'; let last = null;
  for (const e of sorted) {
    const g = e.date.slice(0, 7);
    if (g !== last) { last = g; const r = by[g]; h += `<div class="row" style="padding-top:10px;margin-top:0"><span class="ll dim" style="flex:1.15">${monthGroupLabel(e.date)}</span>${mm('Fuel', `${fmtNum(sum(r, x => x.volume), 2)} ${volL(v)}`, 1)}${mm('Spent', fmtCur(sum(r, x => x.totalCost)), 1)}${mm('Distance', `${fmtNum(sum(r, x => x.distanceSinceLast || 0), 0)} ${v.odometerUnit}`, 1)}</div>`; }
    const sv = (l, val) => `<div><div class="lsm faint">${l}</div><div style="margin-top:3px">${mono(val, 12, 500)}</div></div>`;
    h += `<div class="card p15 click entry${e.qualifies ? '' : ' warn'}" data-entry="${e.id}"><div class="row g12">${badge('gas', e.qualifies ? TEAL : AMBER)}<div class="f1"><div class="ts">${fmtDate(e.date)}</div><div class="bs dim" style="margin-top:3px">${fmtNum(e.odometer, 0)} ${v.odometerUnit} odometer</div></div>
    ${e.qualifies ? effPill(e, v) : '<span class="npill" data-badge="1">Not counted</span>'}</div>
    <div class="row between" style="margin-top:14px">${sv('Distance', e.distanceSinceLast != null ? `${fmtNum(e.distanceSinceLast, 0)} ${v.odometerUnit}` : 'Start')}${sv('Fuel', `${fmtNum(e.volume, 2)} ${volL(v)}`)}${sv('Cost', fmtCur(e.totalCost))}</div>
    ${!e.qualifies ? `<div class="bs dim" style="margin-top:10px">${esc(notCountedReason(e))}</div>` : ''}</div>`;
  }
  return h + '</div>';
}

function statsScreen(v, D) {
  const filtered = filterByRange(D, ui.range, ui.cs, ui.ce), cv = ui.cs && ui.ce && ui.cs <= ui.ce;
  let h = `<div class="row" style="padding:18px"><div class="f1">${sectionHeader('Stats', 'Build a dashboard around the numbers you care about.')}</div>${badge('bars', PURPLE)}</div>
  <div class="chips">${RANGE_OPTIONS.map(([k, l]) => `<button class="chip ${ui.range === k ? 'on' : ''}" data-range="${k}">${l}</button>`).join('')}</div>`;
  if (ui.range === 'custom' && cv) h += `<div style="padding:10px 18px"><button class="btn out full" data-act="range-dialog">${ic('cal', 18)}${displayDate(ui.cs)} — ${displayDate(ui.ce)}</button></div>`;
  if (ui.range === 'custom' && !cv) h += `<div class="bs dim" style="padding:10px 20px">Choose a start and end date to apply the custom range.</div>`;
  h += '<div style="padding:0 18px">';
  if (!v.customCards.length) h += emptyBox('addchart', 'No stats cards yet', 'Add a ready-made card or build your own view.');
  else { h += '<div style="height:8px"></div>'; v.customCards.forEach((c, i) => { h += cardHtml(c, CARD_COLORS[i % 4], v, filtered, D) + '<div style="height:12px"></div>'; }); }
  return h + `</div><div style="padding:0 18px 96px"><button class="btn tall full" data-act="add-card">${ic('addchart')}Add stats card</button></div>`;
}
function cardHtml(c, color, v, filtered, all) {
  let body;
  const nd = '<div class="bs faint">Not enough data yet.</div>';
  if (c.kind === 'bestworst') {
    const bw = bestWorst(filtered), ms = (l, e, col) => `<div class="tile10 f1" style="background:${col}14"><div class="lsm faint up">${l}</div><div style="margin-top:4px">${e ? `${mono(fmtNum(e.efficiency, 2), 18, 600, col)}<div class="bs faint">${effL(v)}</div><div class="bs dim" style="margin-top:4px">${fmtDate(e.date)}</div>` : '<span class="bs faint">—</span>'}</div></div>`;
    body = `<div class="row g10" style="align-items:stretch">${ms('Best', bw.best, TEAL)}${ms('Worst', bw.worst, CORAL)}</div>`;
  } else if (c.kind === 'yoy') {
    const rows = yearOverYear(all);
    body = !rows.length ? nd : `<div class="row between">${['Year', 'Cost', 'Distance', 'Avg eff.'].map(x => `<span class="lsm faint up f1">${x}</span>`).join('')}</div><div style="height:6px"></div>${rows.map(r => `<div class="row between" style="padding:6px 0">${[r.year, fmtCur(r.cost), `${fmtNum(r.distance, 0)} ${v.odometerUnit}`, r.avgEfficiency != null ? fmtNum(r.avgEfficiency, 2) : '—'].map(x => `<span class="f1">${mono(x, 12.5)}</span>`).join('')}</div>`).join('')}`;
  } else if (c.kind === 'monthdelta') {
    const d = monthOverMonth(all);
    const tile = (l, cu, pr, inv, f) => { let t = `<div class="tile10 f1" style="background:var(--surface2)"><div class="lsm faint up">${l}</div><div style="margin-top:4px">`; if (cu == null) t += '<span class="bs faint">—</span>'; else { t += mono(f(cu), 17, 600); if (pr != null && pr !== 0) { const pct = ((cu - pr) / pr) * 100, up = pct >= 0; t += `<div class="bs" style="margin-top:2px;font-weight:500;color:${up === inv ? TEAL : CORAL}">${up ? '+' : ''}${fmtNum(pct, 0)}% vs last month</div>`; } } return t + '</div></div>'; };
    body = `<div class="row g10" style="align-items:stretch">${tile('Cost this month', d.curCost, d.prevCost, false, fmtCur)}${tile('Efficiency', d.curEff, d.prevEff, true, x => `${fmtNum(x, 2)} ${effL(v)}`)}</div>`;
  } else if (c.kind === 'heatmap') {
    const cells = weeklyHeat(filtered), al = ['var(--surface2)', 'rgba(31,78,137,.3)', 'rgba(31,78,137,.6)', TEAL];
    body = !cells.length ? nd : `<div class="heat">${Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => `<div class="c">${cells.slice(i * 7, i * 7 + 7).map(x => `<i style="background:${al[x.level]}"></i>`).join('')}</div>`).join('')}</div><div class="bs faint" style="margin-top:6px">Darker = higher spend that week</div>`;
  } else if (c.kind === 'avgdays') {
    const a = averageDays(filtered);
    body = a.mean == null ? nd : `${mono(`${fmtNum(a.mean, 1)} days`, 22, 600, TEAL)}<div class="bs dim" style="margin-top:4px">${a.sd < a.mean * .2 ? 'Very consistent fill-up rhythm.' : a.sd < a.mean * .5 ? 'Fairly consistent fill-up rhythm.' : 'Fill-up timing varies a fair bit.'}</div>`;
  } else {
    const data = buildChartData(c, filtered);
    if (!data.values.length) body = `<div class="bs faint" style="padding:20px 0">No data matches this card's settings for the selected range.</div>`;
    else {
      const L = data.labels, sh = L.length <= 3 ? L : [L[0], L[L.length >> 1], L[L.length - 1]];
      chartJobs.push({ values: data.values, color, bar: c.chartType === 'bar' });
      body = `<canvas class="chart" data-job="${chartJobs.length - 1}"></canvas><div class="row between" style="margin-top:6px">${sh.map(l => `<span class="faint" style="font-size:10px">${esc(l)}</span>`).join('')}</div>`;
    }
  }
  return `<div class="card"><div class="row between"><span class="ts f1 row g8"><i class="dot" style="background:${color}"></i><span class="f1">${esc(c.title)}</span></span><div class="row" style="gap:4px"><button class="ibtn" data-card-edit="${c.id}">${ic('edit', 16)}</button><button class="ibtn" data-card-del="${c.id}">${ic('del', 16)}</button></div></div><div style="height:8px"></div>${body}</div>`;
}
function drawCharts() {
  document.querySelectorAll('canvas.chart').forEach(cv => {
    const job = chartJobs[+cv.dataset.job]; if (!job) return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr); const vals = job.values, n = vals.length, col = job.color, top0 = 16, ph = h - top0;
    const mx = Math.max(...vals), mn = Math.min(0, ...vals), rg = (mx - mn) || 1;
    const X = i => n === 1 ? w / 2 : w * i / (n - 1), Y = v => top0 + ph - ((v - mn) / rg) * ph;
    g.strokeStyle = '#E3E8F0'; g.lineWidth = 1; g.setLineDash([3, 4]);
    for (let i = 0; i < 4; i++) { const y = Math.round(top0 + ph * i / 3) + .5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.setLineDash([]); g.font = '600 10px Manrope, sans-serif'; g.fillStyle = '#8F9AB0'; g.textBaseline = 'top'; g.fillText(fmtNum(mx, mx >= 100 ? 0 : 1), 0, 0);
    if (job.bar) {
      const slot = w / n, bw = Math.min(Math.max(slot * .55, 3), 36), gr = g.createLinearGradient(0, top0, 0, h); gr.addColorStop(0, col); gr.addColorStop(1, col + '66'); g.fillStyle = gr;
      vals.forEach((v, i) => { const t = Y(v), x = slot * i + slot / 2 - bw / 2, bh = Math.max(h - t, 2); g.beginPath(); g.roundRect ? g.roundRect(x, t, bw, bh, [4, 4, 0, 0]) : g.rect(x, t, bw, bh); g.fill(); });
    } else {
      const gr = g.createLinearGradient(0, top0, 0, h); gr.addColorStop(0, col + '40'); gr.addColorStop(1, col + '00');
      g.fillStyle = gr; g.beginPath(); g.moveTo(X(0), h); vals.forEach((v, i) => g.lineTo(X(i), Y(v))); g.lineTo(X(n - 1), h); g.closePath(); g.fill();
      g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); vals.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
      if (n <= 30) { g.fillStyle = col; vals.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 2.5, 0, 6.2832); g.fill(); }); }
      g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(X(n - 1), Y(vals[n - 1]), 4.5, 0, 6.2832); g.fill(); g.stroke();
    }
  });
}

function settingsScreen(v) {
  const act = (icon, t, s, a) => `<div class="row g12 click" data-act="${a}" style="padding:10px 0">${badge(icon, TEAL)}<div class="f1"><div class="ts">${t}</div><div class="bs dim" style="margin-top:2px">${s}</div></div></div>`;
  const danger = (t, s, a) => `<button class="btn out danger full" data-act="${a}" style="height:auto;padding:10px 24px;justify-content:flex-start;border-radius:20px"><div style="text-align:left"><div style="font-weight:600">${t}</div><div class="lsm faint">${s}</div></div></button>`;
  return `<div class="pad"><div class="row">${'<div class="f1">' + sectionHeader('Settings', 'Keep your vehicle, display and backup preferences in one place.') + '</div>'}${badge('settings', TEAL)}</div>
  <div style="height:16px"></div>${secTitle('car', 'Vehicle', TEAL).replace('margin:20px 0 8px', 'margin:0 0 8px')}
  <div class="card"><div class="stack">${inp('s-name', 'Vehicle name', v.name)}<div class="row g10"><div class="f1">${sel('s-odo', 'Distance', [['km', 'Kilometers (km)'], ['mi', 'Miles (mi)']], v.odometerUnit)}</div><div class="f1">${sel('s-vol', 'Volume', [['l', 'Liters (L)'], ['gal', 'Gallons (gal)']], v.volumeUnit)}</div></div></div></div>
  <div style="height:16px"></div>${secTitle('settings', 'Preferences', TEAL).replace('margin:20px 0 8px', 'margin:0 0 8px')}
  <div class="card"><div class="row g10"><div style="flex:1">${inp('s-cur', 'Currency', S.settings.currency, 'maxlength="6"')}</div><div style="flex:1.35">${sel('s-fmt', 'Date format', ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'].map(x => [x, x]), S.settings.dateFormat)}</div></div></div>
  <button class="btn tall full" data-act="save-settings" style="margin-top:16px">Save changes</button>
  ${secTitle('down', 'Backup & restore', TEAL)}<div class="card">${act('down', 'Export CSV', 'Save your fuel history as a backup.', 'export')}${act('up', 'Import CSV', 'Merge entries into this vehicle.', 'import')}<div class="lsm faint" style="margin-top:8px">${S.lastBackup ? `Last backup: ${S.lastBackup}` : 'No export recorded yet'}</div></div>
  ${secTitle('del', 'Data & storage', CORAL)}<div class="card stack">${danger('Delete this vehicle', 'Remove this vehicle and all its fill-ups.', 'del-vehicle')}${danger('Clear all data', 'Remove every vehicle and every fill-up from this device.', 'clear')}</div></div>`;
}

function onboarding() {
  const opt = (icon, c, t, s, a) => `<div class="opt" data-act="${a}" style="background:${c}12">${badge(icon, c)}<div class="f1"><div class="ts">${t}</div><div class="bs dim" style="margin-top:2px">${s}</div></div></div>`;
  const tp = (icon, t) => `<div class="row" style="gap:5px">${ic(icon, 17, FAINT)}<span class="lsm faint">${t}</span></div>`;
  return `<div style="min-height:100%;display:flex;flex-direction:column;justify-content:center;padding:calc(var(--sat) + 24px) 20px 32px"><div class="hero" style="padding:24px 22px"><div class="logo">${ic('speed', 30, '#fff')}</div><div class="hs" style="color:#fff;margin-top:18px">Fuel Metrics</div><div class="bm" style="color:rgba(255,255,255,.78);margin-top:4px">Know what every fill-up costs you.</div></div>
  <div style="height:28px"></div><div class="card p20"><div class="tl">Start your fuel dashboard</div><div class="bm dim" style="margin:7px 0 18px">Track efficiency, fuel cost, distance and trends without clutter. Your data stays on this device.</div>
  <div class="stack" style="--g:9px">${opt('add', TEAL, 'Start fresh', 'Add your vehicle and log your own fill-ups.', 'fresh')}${opt('play', PURPLE, 'Explore sample data', 'See how the dashboard and stats work.', 'demo')}${opt('cloud', CORAL, 'Import a CSV', 'Bring an existing fuel history into a new vehicle.', 'import-new')}</div></div>
  <div class="row" style="justify-content:space-evenly;margin-top:18px">${tp('car', 'Multiple vehicles')}${tp('speed', 'Offline first')}</div></div>`;
}

/* ---------- render ---------- */
let lastTab = null;
function render() {
  const v = active(), app = $('#app'), old = $('.main'), keep = old && lastTab === ui.tab ? old.scrollTop : 0;
  chartJobs = [];
  if (v) { const ids = S.vehicles.map(x => x.id); if (S.activeVehicleId !== v.id && ids.length) S.activeVehicleId = v.id; }
  let html;
  if (!v) {
    ui.tab = 'home';
    html = `<div class="main">${onboarding()}</div>`;
  } else {
    const D = computeDerived(v.entries), tabLabel = TABS.find(t => t[0] === ui.tab)[1];
    const body = ui.tab === 'home' ? homeScreen(v, D) : ui.tab === 'log' ? logScreen(v, D) : ui.tab === 'stats' ? statsScreen(v, D) : settingsScreen(v);
    html = `<div class="topbar"><div class="who" data-act="switcher"><div class="avatar">${ic('car', 19, '#fff')}</div>
    <div><div class="ts">${esc(v.name)}</div><div class="lsm dim" style="font-weight:500">${tabLabel}</div></div>${S.vehicles.length > 1 ? `<span style="margin-left:2px">${ic('more', 24)}</span>` : ''}</div></div>
    <div class="main">${body}</div>
    <nav class="nav">${TABS.map(([k, l, i]) => `<button data-tab="${k}" class="${ui.tab === k ? 'on' : ''}"><span class="pill">${ic(i, 24)}</span>${l}</button>`).join('')}</nav>
    ${(ui.tab === 'home' || ui.tab === 'log') ? `<button class="fab" data-act="add-entry">${ic('add', 24)}Add fill-up</button>` : ''}`;
  }
  app.innerHTML = html;
  const m = $('.main'); if (m) m.scrollTop = keep; lastTab = ui.tab;
  drawCharts();
}

document.addEventListener('click', e => {
  if (e.target.closest('#modal-root')) return;
  const t = e.target;
  const tab = t.closest('[data-tab]'); if (tab) { ui.tab = tab.dataset.tab; render(); return; }
  const rg = t.closest('[data-range]'); if (rg) { ui.range = rg.dataset.range; render(); if (ui.range === 'custom') customRangeDialog(); return; }
  const ce = t.closest('[data-card-edit]'); if (ce) { const v = active(); cardBuilder(v.customCards.find(c => c.id === ce.dataset.cardEdit)); return; }
  const cd = t.closest('[data-card-del]'); if (cd) { A.deleteCard(cd.dataset.cardDel); return; }
  if (t.closest('[data-badge]')) return;
  const en = t.closest('[data-entry]'); if (en) { entrySheet(active().entries.find(x => x.id === en.dataset.entry)); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  switch (a.dataset.act) {
    case 'switcher': vehicleSwitcher(); break;
    case 'add-entry': entrySheet(null); break;
    case 'export': doExport(); break;
    case 'import': pickCsv(null); break;
    case 'import-new': importSheet(); break;
    case 'fresh': vehicleForm(null); break;
    case 'demo': A.demo(); break;
    case 'range-dialog': customRangeDialog(); break;
    case 'add-card': addCardSheet(); break;
    case 'save-settings': A.updateVehicle($('#s-name').value, $('#s-odo').value, $('#s-vol').value); A.updateSettings($('#s-cur').value, $('#s-fmt').value); break;
    case 'del-vehicle': { const v = active(); confirmDialog(`Delete ${v.name}?`, 'This deletes the vehicle and every fuel entry stored under it. This cannot be undone.', 'Delete', () => A.deleteVehicle(v.id)); break; }
    case 'clear': confirmDialog('Clear all data?', 'Every vehicle and every logged entry will be removed from this device. This cannot be undone.', 'Clear everything', () => A.clearAll()); break;
  }
});

/* ---------- boot ---------- */
const MAX_CSV = 10 * 1024 * 1024;
function boot() {
  load();
  $('#file').addEventListener('change', async ev => {
    const f = ev.target.files[0], p = pendingImport; pendingImport = null; if (!f) return;
    try {
      if (f.size > MAX_CSV) throw new Error('too large');
      const text = await f.text();
      p ? A.importAsNew(p[0], p[1], p[2], text) : A.importCsv(text);
    } catch (e) { toast("Couldn't read the selected CSV file"); }
  });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (ui.tab === 'stats') render(); }, 150); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  render();
  // Web replacement for the weekly Android backup notification: an in-app nudge on launch.
  const v = active();
  if (v && v.entries.length) {
    const days = S.lastBackup ? Math.floor((toUTC(todayISO()) - toUTC(S.lastBackup)) / dayMs) : null;
    if (days == null || isNaN(days) || days >= 7) setTimeout(() => toast("It's been a week since your last backup — export a CSV to keep your data safe."), 800);
  }
}
if (typeof window !== 'undefined') boot();
if (typeof module !== 'undefined') module.exports = { computeDerived, buildEntriesFromCsv, csvExport, mergeImported, demoState, yearOverYear, weeklyHeat, averageDays, buildChartData, resolveDates, parseDate };
