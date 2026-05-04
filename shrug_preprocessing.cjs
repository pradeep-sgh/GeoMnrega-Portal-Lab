'use strict';
/**
 * shrug_preprocessing.cjs
 * Processes SHRUG Dev Lab district-level CSVs into shrug_state_data.json and shrug_district_data.json
 * Called automatically by run_preprocessing.cjs before `npm run dev` / `npm run build`
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'src', 'data');

// Census 2011 state ID → GeoJSON state name mapping
const STATE_ID_TO_NAME = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh',        '05': 'Uttarakhand',      '06': 'Haryana',
  '07': 'Delhi',             '08': 'Rajasthan',         '09': 'Uttar Pradesh',
  '10': 'Bihar',             '11': 'Sikkim',            '12': 'Arunachal Pradesh',
  '13': 'Nagaland',          '14': 'Manipur',           '15': 'Mizoram',
  '16': 'Tripura',           '17': 'Meghalaya',         '18': 'Assam',
  '19': 'West Bengal',       '20': 'Jharkhand',         '21': 'Odisha',
  '22': 'Chhattisgarh',      '23': 'Madhya Pradesh',    '24': 'Gujarat',
  '25': 'Daman and Diu',     '26': 'Dadra and Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh',    '29': 'Karnataka',         '30': 'Goa',
  '31': 'Lakshadweep',       '32': 'Kerala',            '33': 'Tamil Nadu',
  '34': 'Puducherry',        '35': 'Andaman and Nicobar', '36': 'Telangana',
};

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  [SHRUG] SKIP (not found): ${path.basename(filePath)}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

function n(val) { const v = parseFloat(val); return isNaN(v) ? 0 : v; }
function pct(num, den) {
  const d = n(den);
  if (d === 0) return 0;
  return Math.round((n(num) / d) * 1000) / 10;
}
function zeroPad(val, digits) {
  const num = parseInt(parseFloat(val));
  if (isNaN(num)) return null;
  return String(num).padStart(digits, '0');
}

// ── PCA 2011 ──────────────────────────────────────────────────────────────────
function processPCA11() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-pca11-csv', 'pc11_pca_clean_pc11dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc11_state_id, 2);
    const distId  = zeroPad(row.pc11_district_id, 3);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const tot_p    = n(row.pc11_pca_tot_p);
    const tot_work = n(row.pc11_pca_tot_work_p);
    const literate = n(row.pc11_pca_p_lit);
    const sc       = n(row.pc11_pca_p_sc);
    const st       = n(row.pc11_pca_p_st);
    const ag_lab   = n(row.pc11_pca_main_al_p);
    const no_hh    = n(row.pc11_pca_no_hh);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId, tot_p,
      lit_rate:      pct(literate, tot_p),
      sc_pct:        pct(sc, tot_p),
      st_pct:        pct(st, tot_p),
      work_pct:      pct(tot_work, tot_p),
      ag_labour_pct: pct(ag_lab, tot_work),
      no_hh,
    });

    if (!stateAgg[name]) stateAgg[name] = { tot_p: 0, literate: 0, sc: 0, st: 0, tot_work: 0, ag_lab: 0, no_hh: 0 };
    const s = stateAgg[name];
    s.tot_p += tot_p; s.literate += literate; s.sc += sc; s.st += st;
    s.tot_work += tot_work; s.ag_lab += ag_lab; s.no_hh += no_hh;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      tot_p: s.tot_p, no_hh: s.no_hh,
      lit_rate:      pct(s.literate, s.tot_p),
      sc_pct:        pct(s.sc, s.tot_p),
      st_pct:        pct(s.st, s.tot_p),
      work_pct:      pct(s.tot_work, s.tot_p),
      ag_labour_pct: pct(s.ag_lab, s.tot_work),
    };
  }
  console.log(`  [SHRUG] PCA 2011: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}

// ── PCA 2001 ──────────────────────────────────────────────────────────────────
function processPCA01() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-pca01-csv', 'pc01_pca_clean_pc01dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc01_state_id, 2);
    const distId  = zeroPad(row.pc01_district_id, 2);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const tot_p    = n(row.pc01_pca_tot_p);
    const tot_work = n(row.pc01_pca_tot_work_p);
    const literate = n(row.pc01_pca_p_lit);
    const sc       = n(row.pc01_pca_p_sc);
    const st       = n(row.pc01_pca_p_st);
    const ag_lab   = n(row.pc01_pca_main_al_p);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId, tot_p,
      lit_rate:      pct(literate, tot_p),
      sc_pct:        pct(sc, tot_p),
      st_pct:        pct(st, tot_p),
      work_pct:      pct(tot_work, tot_p),
      ag_labour_pct: pct(ag_lab, tot_work),
    });

    if (!stateAgg[name]) stateAgg[name] = { tot_p: 0, literate: 0, sc: 0, st: 0, tot_work: 0, ag_lab: 0 };
    const s = stateAgg[name];
    s.tot_p += tot_p; s.literate += literate; s.sc += sc; s.st += st;
    s.tot_work += tot_work; s.ag_lab += ag_lab;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      tot_p: s.tot_p,
      lit_rate:      pct(s.literate, s.tot_p),
      sc_pct:        pct(s.sc, s.tot_p),
      st_pct:        pct(s.st, s.tot_p),
      work_pct:      pct(s.tot_work, s.tot_p),
      ag_labour_pct: pct(s.ag_lab, s.tot_work),
    };
  }
  console.log(`  [SHRUG] PCA 2001: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}

// ── PCA 1991 ──────────────────────────────────────────────────────────────────
function processPCA91() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-pca91-csv', 'pc91_pca_clean_pc91dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc91_state_id, 2);
    const distId  = zeroPad(row.pc91_district_id, 2);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const tot_p     = n(row.pc91_pca_tot_p);
    const main_work = n(row.pc91_pca_mainwork_p);
    const literate  = n(row.pc91_pca_p_lit);
    const sc        = n(row.pc91_pca_p_sc);
    const st        = n(row.pc91_pca_p_st);
    const ag_lab    = n(row.pc91_pca_main_al_p);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId, tot_p,
      lit_rate:      pct(literate, tot_p),
      sc_pct:        pct(sc, tot_p),
      st_pct:        pct(st, tot_p),
      work_pct:      pct(main_work, tot_p),
      ag_labour_pct: pct(ag_lab, main_work),
    });

    if (!stateAgg[name]) stateAgg[name] = { tot_p: 0, literate: 0, sc: 0, st: 0, tot_work: 0, ag_lab: 0 };
    const s = stateAgg[name];
    s.tot_p += tot_p; s.literate += literate; s.sc += sc; s.st += st;
    s.tot_work += main_work; s.ag_lab += ag_lab;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      tot_p: s.tot_p,
      lit_rate:      pct(s.literate, s.tot_p),
      sc_pct:        pct(s.sc, s.tot_p),
      st_pct:        pct(s.st, s.tot_p),
      work_pct:      pct(s.tot_work, s.tot_p),
      ag_labour_pct: pct(s.ag_lab, s.tot_work),
    };
  }
  console.log(`  [SHRUG] PCA 1991: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}

// ── EC 2013 ──────────────────────────────────────────────────────────────────
function processEC13() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-ec13-csv', 'ec13_pc11dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc11_state_id, 2);
    const distId  = zeroPad(row.pc11_district_id, 3);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const emp_all      = n(row.ec13_emp_all);
    const emp_f        = n(row.ec13_emp_f);
    const emp_gov      = n(row.ec13_emp_gov);
    const emp_manuf    = n(row.ec13_emp_manuf);
    const emp_services = n(row.ec13_emp_services);
    const count_all    = n(row.ec13_count_all);
    const emp_sc       = n(row.ec13_emp_sc);
    const emp_st       = n(row.ec13_emp_st);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId, emp_all, count_all,
      female_emp_pct:   pct(emp_f, emp_all),
      gov_emp_pct:      pct(emp_gov, emp_all),
      manuf_emp_pct:    pct(emp_manuf, emp_all),
      services_emp_pct: pct(emp_services, emp_all),
      sc_emp_pct:       pct(emp_sc, emp_all),
      st_emp_pct:       pct(emp_st, emp_all),
    });

    if (!stateAgg[name]) stateAgg[name] = { emp_all: 0, emp_f: 0, emp_gov: 0, emp_manuf: 0, emp_services: 0, count_all: 0, emp_sc: 0, emp_st: 0 };
    const s = stateAgg[name];
    s.emp_all += emp_all; s.emp_f += emp_f; s.emp_gov += emp_gov;
    s.emp_manuf += emp_manuf; s.emp_services += emp_services;
    s.count_all += count_all; s.emp_sc += emp_sc; s.emp_st += emp_st;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      emp_all: s.emp_all, count_all: s.count_all,
      female_emp_pct:   pct(s.emp_f, s.emp_all),
      gov_emp_pct:      pct(s.emp_gov, s.emp_all),
      manuf_emp_pct:    pct(s.emp_manuf, s.emp_all),
      services_emp_pct: pct(s.emp_services, s.emp_all),
      sc_emp_pct:       pct(s.emp_sc, s.emp_all),
      st_emp_pct:       pct(s.emp_st, s.emp_all),
    };
  }
  console.log(`  [SHRUG] EC 2013: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}

// ── EC 2005 ──────────────────────────────────────────────────────────────────
function processEC05() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-ec05-csv', 'ec05_pc01dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc01_state_id, 2);
    const distId  = zeroPad(row.pc01_district_id, 2);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const emp_all      = n(row.ec05_emp_all);
    const emp_f        = n(row.ec05_emp_f);
    const emp_gov      = n(row.ec05_emp_gov);
    const emp_manuf    = n(row.ec05_emp_manuf);
    const emp_services = n(row.ec05_emp_services);
    const count_all    = n(row.ec05_count_all);
    const emp_sc       = n(row.ec05_emp_sc);
    const emp_st       = n(row.ec05_emp_st);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId, emp_all, count_all,
      female_emp_pct:   pct(emp_f, emp_all),
      gov_emp_pct:      pct(emp_gov, emp_all),
      manuf_emp_pct:    pct(emp_manuf, emp_all),
      services_emp_pct: pct(emp_services, emp_all),
      sc_emp_pct:       pct(emp_sc, emp_all),
      st_emp_pct:       pct(emp_st, emp_all),
    });

    if (!stateAgg[name]) stateAgg[name] = { emp_all: 0, emp_f: 0, emp_gov: 0, emp_manuf: 0, emp_services: 0, count_all: 0, emp_sc: 0, emp_st: 0 };
    const s = stateAgg[name];
    s.emp_all += emp_all; s.emp_f += emp_f; s.emp_gov += emp_gov;
    s.emp_manuf += emp_manuf; s.emp_services += emp_services;
    s.count_all += count_all; s.emp_sc += emp_sc; s.emp_st += emp_st;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      emp_all: s.emp_all, count_all: s.count_all,
      female_emp_pct:   pct(s.emp_f, s.emp_all),
      gov_emp_pct:      pct(s.emp_gov, s.emp_all),
      manuf_emp_pct:    pct(s.emp_manuf, s.emp_all),
      services_emp_pct: pct(s.emp_services, s.emp_all),
      sc_emp_pct:       pct(s.emp_sc, s.emp_all),
      st_emp_pct:       pct(s.emp_st, s.emp_all),
    };
  }
  console.log(`  [SHRUG] EC 2005: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}

// ── RBI Banking ───────────────────────────────────────────────────────────────
function processRBI() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-rbi-csv', 'rbi_directory_shrid.csv'));
  const stateAgg = {};
  const distAgg  = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc11_state_id, 2);
    const distIdRaw = (row.pc11_district_id || '').trim();
    const distId  = zeroPad(distIdRaw, 3);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name) continue;

    const bankGroup = (row.rbi_bank_group || '').toLowerCase();
    const popGroup  = (row.rbi_population_group || '').toLowerCase();
    const isPrivate = bankGroup.includes('private');
    const isRural   = popGroup.includes('rural');
    const isUrban   = popGroup.includes('urban') || popGroup.includes('metropolitan') || popGroup.includes('semi-urban');

    // State totals (include all branches, even unassigned districts)
    if (!stateAgg[name]) stateAgg[name] = { branches: 0, private: 0, public_sbi: 0, rural: 0, urban: 0 };
    stateAgg[name].branches++;
    if (isPrivate) stateAgg[name].private++; else stateAgg[name].public_sbi++;
    if (isRural)   stateAgg[name].rural++;
    if (isUrban)   stateAgg[name].urban++;

    // District data — skip district_id "000" (unassigned)
    if (!distId || distId === '000') continue;
    if (!distAgg[stateId]) distAgg[stateId] = {};
    if (!distAgg[stateId][distId]) distAgg[stateId][distId] = { dist_id: distId, branches: 0, private: 0, public_sbi: 0, rural: 0, urban: 0 };
    const d = distAgg[stateId][distId];
    d.branches++;
    if (isPrivate) d.private++; else d.public_sbi++;
    if (isRural)   d.rural++;
    if (isUrban)   d.urban++;
  }

  const distData = {};
  for (const [stateId, dists] of Object.entries(distAgg)) {
    distData[stateId] = Object.values(dists);
  }
  console.log(`  [SHRUG] RBI Banking: ${Object.keys(stateAgg).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData: stateAgg, distData };
}

// ── Antyodaya (Welfare Survey) ─────────────────────────────────────────────────
function processAntyodaya() {
  const rows = parseCSV(path.join(DATA_DIR, 'shrug-antyodaya-csv', 'antyodaya_pc11dist.csv'));
  const stateAgg = {};
  const distData = {};

  for (const row of rows) {
    const stateId = zeroPad(row.pc11_state_id, 2);
    const distId  = zeroPad(row.pc11_district_id, 3);
    const name    = STATE_ID_TO_NAME[stateId];
    if (!name || !distId) continue;

    const tot_hhd        = n(row.total_hhd);
    const tot_pop        = n(row.total_population);
    const bpl_hhd        = n(row.total_hhd_having_bpl_cards);
    const farm_hhd       = n(row.total_hhd_engaged_in_farm_activi);
    const kuccha_hhd     = n(row.total_hhd_with_kuccha_wall_kucch);
    const no_toilet_hhd  = n(row.total_hhd_not_having_sanitary_la);
    const clean_energy   = n(row.total_hhd_with_clean_energy);
    const pmjdy_acc      = n(row.total_hhd_availing_pmjdy_bank_ac);
    const shg_total      = n(row.total_shg);
    const shg_hhd        = n(row.total_hhd_mobilized_into_shg);
    const pmuy_hhd       = n(row.total_hhd_availing_pmuy_benefits);

    if (!distData[stateId]) distData[stateId] = [];
    distData[stateId].push({
      dist_id: distId,
      tot_pop,
      tot_hhd,
      bpl_pct:          pct(bpl_hhd, tot_hhd),
      farm_hhd_pct:     pct(farm_hhd, tot_hhd),
      kuccha_pct:       pct(kuccha_hhd, tot_hhd),
      no_toilet_pct:    pct(no_toilet_hhd, tot_hhd),
      clean_energy_pct: pct(clean_energy, tot_hhd),
      pmjdy_pct:        pct(pmjdy_acc, tot_hhd),
      shg_total,
      shg_mobilized_pct: pct(shg_hhd, tot_hhd),
      pmuy_pct:          pct(pmuy_hhd, tot_hhd),
    });

    if (!stateAgg[name]) stateAgg[name] = {
      tot_pop: 0, tot_hhd: 0, bpl_hhd: 0, farm_hhd: 0,
      kuccha_hhd: 0, no_toilet_hhd: 0, clean_energy: 0,
      pmjdy_acc: 0, shg_total: 0, shg_hhd: 0, pmuy_hhd: 0,
    };
    const s = stateAgg[name];
    s.tot_pop       += tot_pop;      s.tot_hhd     += tot_hhd;
    s.bpl_hhd       += bpl_hhd;      s.farm_hhd    += farm_hhd;
    s.kuccha_hhd    += kuccha_hhd;   s.no_toilet_hhd += no_toilet_hhd;
    s.clean_energy  += clean_energy; s.pmjdy_acc   += pmjdy_acc;
    s.shg_total     += shg_total;    s.shg_hhd     += shg_hhd;
    s.pmuy_hhd      += pmuy_hhd;
  }

  const stateData = {};
  for (const [name, s] of Object.entries(stateAgg)) {
    stateData[name] = {
      tot_pop:           s.tot_pop,
      tot_hhd:           s.tot_hhd,
      bpl_pct:           pct(s.bpl_hhd, s.tot_hhd),
      farm_hhd_pct:      pct(s.farm_hhd, s.tot_hhd),
      kuccha_pct:        pct(s.kuccha_hhd, s.tot_hhd),
      no_toilet_pct:     pct(s.no_toilet_hhd, s.tot_hhd),
      clean_energy_pct:  pct(s.clean_energy, s.tot_hhd),
      pmjdy_pct:         pct(s.pmjdy_acc, s.tot_hhd),
      shg_total:         s.shg_total,
      shg_mobilized_pct: pct(s.shg_hhd, s.tot_hhd),
      pmuy_pct:          pct(s.pmuy_hhd, s.tot_hhd),
    };
  }
  console.log(`  [SHRUG] Antyodaya: ${Object.keys(stateData).length} states, ${Object.values(distData).reduce((a,b)=>a+b.length,0)} districts`);
  return { stateData, distData };
}


function processSHRUG() {
  console.log('\n=== SHRUG Dev Lab Data Preprocessing ===');

  const pca11     = processPCA11();
  const pca01     = processPCA01();
  const pca91     = processPCA91();
  const ec13      = processEC13();
  const ec05      = processEC05();
  const rbi       = processRBI();
  const antyodaya = processAntyodaya();

  fs.writeFileSync(
    path.join(DATA_DIR, 'shrug_state_data.json'),
    JSON.stringify({ pca11: pca11.stateData, pca01: pca01.stateData, pca91: pca91.stateData, ec13: ec13.stateData, ec05: ec05.stateData, rbi: rbi.stateData, antyodaya: antyodaya.stateData }),
    'utf8'
  );

  fs.writeFileSync(
    path.join(DATA_DIR, 'shrug_district_data.json'),
    JSON.stringify({ pca11: pca11.distData, pca01: pca01.distData, pca91: pca91.distData, ec13: ec13.distData, ec05: ec05.distData, rbi: rbi.distData, antyodaya: antyodaya.distData }),
    'utf8'
  );

  console.log('  [SHRUG] Written shrug_state_data.json + shrug_district_data.json');
  console.log('=== SHRUG preprocessing complete ===\n');
}

module.exports = { processSHRUG };

// Run directly if called as main script
if (require.main === module) processSHRUG();
