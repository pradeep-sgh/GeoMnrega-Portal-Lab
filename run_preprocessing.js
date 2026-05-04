/**
 * run_preprocessing.js
 * Node.js equivalent of process_block_data.py + process_all_nrega.py
 * Run with: node run_preprocessing.js
 */
const fs = require('fs');
const path = require('path');

// ── CSV parser (no dependencies) ─────────────────────────────────────────────
function parseCSV(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`  SKIP (not found): ${filepath}`);
    return { headers: [], rows: [] };
  }
  const raw = fs.readFileSync(filepath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  console.log(`  Read ${rows.length} rows from ${path.basename(filepath)}`);
  return { headers, rows };
}

function clean(s) { return (s || '').trim().toUpperCase(); }
function toInt(v) { const n = parseFloat(v || 0); return isNaN(n) ? 0 : Math.round(n); }
function fyToYear(fy) { return fy && fy.includes('-') ? fy.split('-')[0].trim() : String(fy || '').trim(); }

// ── Aggregate helpers ─────────────────────────────────────────────────────────
function ensurePath(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (!cur[k]) cur[k] = {};
    cur = cur[k];
  }
  return cur;
}

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — process_block_data.py equivalent
// Output: nrega_district_demand.json, nrega_block_demand.json,
//         nrega_district_employment.json, nrega_block_employment.json
// ═════════════════════════════════════════════════════════════════════════════

console.log('\n=== PART 1: Block/District demand + employment JSONs ===');

// District demand
console.log('\nProcessing district demand...');
const distDemand = {};
{
  const { rows } = parseCSV('src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv');
  const demandCol = rows[0] ? Object.keys(rows[0]).find(h => h.toLowerCase().includes('demand')) || 'demand' : 'demand';
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const year = (row.year || '').trim();
    const val = toInt(row[demandCol]);
    if (!state || !dist || !year) continue;
    const yObj = ensurePath(distDemand, year);
    if (!yObj[state]) yObj[state] = [];
    let rec = yObj[state].find(r => r.district === dist);
    if (!rec) { rec = { district: dist, value: 0 }; yObj[state].push(rec); }
    rec.value += val;
  }
  // sort each state list by value desc
  for (const yr of Object.values(distDemand))
    for (const arr of Object.values(yr)) arr.sort((a, b) => b.value - a.value);
}
fs.writeFileSync('src/data/nrega_district_demand.json', JSON.stringify(distDemand), 'utf-8');
console.log(`  Written nrega_district_demand.json (${Object.keys(distDemand).length} years)`);

// Block demand
console.log('\nProcessing block demand...');
const blockDemand = {};
{
  const { rows } = parseCSV('src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_block.csv');
  const demandCol = rows[0] ? Object.keys(rows[0]).find(h => h.toLowerCase().includes('demand')) || 'demand' : 'demand';
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const block = (row.block_name || '').trim().toUpperCase();
    const year = (row.year || '').trim();
    const val = toInt(row[demandCol]);
    if (!state || !dist || !block || !year) continue;
    const yObj = ensurePath(blockDemand, year);
    if (!yObj[state]) yObj[state] = [];
    let rec = yObj[state].find(r => r.district === dist && r.block === block);
    if (!rec) { rec = { district: dist, block, value: 0 }; yObj[state].push(rec); }
    rec.value += val;
  }
  for (const yr of Object.values(blockDemand))
    for (const arr of Object.values(yr)) arr.sort((a, b) => b.value - a.value);
}
fs.writeFileSync('src/data/nrega_block_demand.json', JSON.stringify(blockDemand), 'utf-8');
console.log(`  Written nrega_block_demand.json (${Object.keys(blockDemand).length} years)`);

// District employment
console.log('\nProcessing district employment...');
const distEmp = {};
{
  const { rows } = parseCSV('src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv');
  const empCol = rows[0] ? (Object.keys(rows[0]).find(h => h.toLowerCase().includes('total')) || Object.keys(rows[0]).find(h => h.toLowerCase().includes('employ')) || 'employment') : 'employment';
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const year = fyToYear(row.financial_year || row.year || '');
    const val = toInt(row[empCol]);
    if (!state || !dist || !year) continue;
    const yObj = ensurePath(distEmp, year);
    if (!yObj[state]) yObj[state] = [];
    let rec = yObj[state].find(r => r.district === dist);
    if (!rec) { rec = { district: dist, value: 0 }; yObj[state].push(rec); }
    rec.value += val;
  }
  for (const yr of Object.values(distEmp))
    for (const arr of Object.values(yr)) arr.sort((a, b) => b.value - a.value);
}
fs.writeFileSync('src/data/nrega_district_employment.json', JSON.stringify(distEmp), 'utf-8');
console.log(`  Written nrega_district_employment.json (${Object.keys(distEmp).length} years)`);

// Block employment
console.log('\nProcessing block employment...');
const blockEmp = {};
{
  const { rows } = parseCSV('src/data/nrega_reports/Employment - SC-ST/employment_scst_block.csv');
  const empCol = rows[0] ? (Object.keys(rows[0]).find(h => h.toLowerCase().includes('total')) || Object.keys(rows[0]).find(h => h.toLowerCase().includes('employ')) || 'employment') : 'employment';
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const block = (row.block_name || '').trim().toUpperCase();
    const year = fyToYear(row.financial_year || row.year || '');
    const val = toInt(row[empCol]);
    if (!state || !dist || !block || !year) continue;
    const yObj = ensurePath(blockEmp, year);
    if (!yObj[state]) yObj[state] = [];
    let rec = yObj[state].find(r => r.district === dist && r.block === block);
    if (!rec) { rec = { district: dist, block, value: 0 }; yObj[state].push(rec); }
    rec.value += val;
  }
  for (const yr of Object.values(blockEmp))
    for (const arr of Object.values(yr)) arr.sort((a, b) => b.value - a.value);
}
fs.writeFileSync('src/data/nrega_block_employment.json', JSON.stringify(blockEmp), 'utf-8');
console.log(`  Written nrega_block_employment.json (${Object.keys(blockEmp).length} years)`);

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — process_all_nrega.py equivalent
// Embeds district + state level NREGA data into GeoJSON files
// ═════════════════════════════════════════════════════════════════════════════

console.log('\n=== PART 2: Embedding into GeoJSON files ===');

// Build district lookup: { STATE: { DISTRICT: { YEAR: { metric: val } } } }
const districtLookup = {};
const stateLookup = {};

// District demand
console.log('\nBuilding district demand lookup...');
{
  const { rows } = parseCSV('src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv');
  const demandCol = rows[0] ? Object.keys(rows[0]).find(h => h.toLowerCase().includes('demand')) || 'demand' : 'demand';
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const year = (row.year || '').trim(); const val = toInt(row[demandCol]);
    if (!state || !dist || !year) continue;
    ensurePath(districtLookup, state, dist, year);
    districtLookup[state][dist][year].nrega_demand = (districtLookup[state][dist][year].nrega_demand || 0) + val;
    ensurePath(stateLookup, state, year);
    stateLookup[state][year].nrega_demand = (stateLookup[state][year].nrega_demand || 0) + val;
  }
}

// District employment
console.log('Building district employment lookup...');
{
  const { rows } = parseCSV('src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv');
  for (const row of rows) {
    const state = clean(row.state_name); const dist = clean(row.district_name);
    const year = fyToYear(row.financial_year || row.year || '');
    if (!state || !dist || !year) continue;
    ensurePath(districtLookup, state, dist, year);
    const d = districtLookup[state][dist][year];
    d.nrega_employment_total = (d.nrega_employment_total || 0) + toInt(row.hh_provided_employment_total);
    d.nrega_employment_sc    = (d.nrega_employment_sc    || 0) + toInt(row.hh_provided_employment_sc);
    d.nrega_employment_st    = (d.nrega_employment_st    || 0) + toInt(row.hh_provided_employment_st);
    d.nrega_women_employment = (d.nrega_women_employment || 0) + toInt(row.women_provided_employment);
    d.nrega_persondays_total = (d.nrega_persondays_total || 0) + toInt(row.persondays_total);
    d.nrega_families_100days = (d.nrega_families_100days || 0) + toInt(row.families_completing_100_days_total);
    d.nrega_jobcards_total   = (d.nrega_jobcards_total   || 0) + toInt(row.hh_issued_jobcards_total);

    ensurePath(stateLookup, state, year);
    const s = stateLookup[state][year];
    s.nrega_employment_total = (s.nrega_employment_total || 0) + toInt(row.hh_provided_employment_total);
    s.nrega_employment_sc    = (s.nrega_employment_sc    || 0) + toInt(row.hh_provided_employment_sc);
    s.nrega_employment_st    = (s.nrega_employment_st    || 0) + toInt(row.hh_provided_employment_st);
    s.nrega_women_employment = (s.nrega_women_employment || 0) + toInt(row.women_provided_employment);
    s.nrega_persondays_total = (s.nrega_persondays_total || 0) + toInt(row.persondays_total);
    s.nrega_families_100days = (s.nrega_families_100days || 0) + toInt(row.families_completing_100_days_total);
    s.nrega_jobcards_total   = (s.nrega_jobcards_total   || 0) + toInt(row.hh_issued_jobcards_total);
  }
}

// ── Embed into india_mices.json (state GeoJSON) ───────────────────────────────
console.log('\nEmbedding into india_mices.json...');
const stateGeojson = JSON.parse(fs.readFileSync('src/data/mices/india_mices.json', 'utf-8'));
let stateMatched = 0;
for (const feature of stateGeojson.features) {
  const name = clean(feature.properties.NAME_1 || '');
  if (!stateLookup[name]) continue;
  stateMatched++;
  const years = Object.keys(stateLookup[name]);
  for (const year of years) {
    const metrics = stateLookup[name][year];
    for (const [k, v] of Object.entries(metrics)) {
      feature.properties[`${k}_${year}`] = v;
    }
  }
  // Also set bare key to latest year
  const latestYear = years.sort().at(-1);
  for (const [k, v] of Object.entries(stateLookup[name][latestYear])) {
    feature.properties[k] = v;
  }
}
fs.writeFileSync('src/data/mices/india_mices.json', JSON.stringify(stateGeojson), 'utf-8');
console.log(`  ✓ Embedded ${stateMatched}/${stateGeojson.features.length} states`);

// ── Embed into india_mices_districts.json ────────────────────────────────────
console.log('\nEmbedding into india_mices_districts.json...');
const distGeojson = JSON.parse(fs.readFileSync('src/data/mices/india_mices_districts.json', 'utf-8'));
let distMatched = 0, distUnmatched = 0;
for (const feature of distGeojson.features) {
  const state = clean(feature.properties.NAME_1 || '');
  const dist  = clean(feature.properties.NAME_2 || '');
  if (!districtLookup[state]?.[dist]) { distUnmatched++; continue; }
  distMatched++;
  const years = Object.keys(districtLookup[state][dist]);
  for (const year of years) {
    const metrics = districtLookup[state][dist][year];
    for (const [k, v] of Object.entries(metrics)) {
      feature.properties[`${k}_${year}`] = v;
    }
  }
  const latestYear = years.sort().at(-1);
  for (const [k, v] of Object.entries(districtLookup[state][dist][latestYear])) {
    feature.properties[k] = v;
  }
}
fs.writeFileSync('src/data/mices/india_mices_districts.json', JSON.stringify(distGeojson), 'utf-8');
console.log(`  ✓ Matched ${distMatched}/${distGeojson.features.length} districts (${distUnmatched} unmatched)`);

console.log('\n════════════════════════════════════════');
console.log('  ALL PREPROCESSING COMPLETE');
console.log(`  States embedded:    ${stateMatched}`);
console.log(`  Districts embedded: ${distMatched}`);
console.log('  Restart npm run dev to load updated data.');
console.log('════════════════════════════════════════\n');
