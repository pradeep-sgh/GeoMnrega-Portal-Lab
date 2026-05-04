"""
process_all_nrega.py
────────────────────
Processes ALL block-level NREGA CSVs and produces:
  1. src/data/nrega_block_data.json   → block-level lookup (state/district/block/year)
  2. src/data/nrega_district_data.json → district-level full stats (year-specific)
  3. src/data/nrega_state_data.json   → state-level full stats (year-specific)

Run with:  python process_all_nrega.py
"""

import json
import csv
import os
from collections import defaultdict

# ── File paths ─────────────────────────────────────────────────────────────────
BLOCK_DEMAND_CSV     = 'src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_block.csv'
DISTRICT_DEMAND_CSV  = 'src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv'
STATE_DEMAND_CSV     = 'src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_state.csv'

BLOCK_EMP_CSV        = 'src/data/nrega_reports/Employment - SC-ST/employment_scst_block.csv'
DISTRICT_EMP_CSV     = 'src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv'
STATE_EMP_CSV        = 'src/data/nrega_reports/Employment - SC-ST/employment_scst_state.csv'

OUT_BLOCK    = 'src/data/nrega_block_data.json'
OUT_DISTRICT = 'src/data/nrega_district_data.json'
OUT_STATE    = 'src/data/nrega_state_data.json'

# ── Helpers ────────────────────────────────────────────────────────────────────
def clean(s):
    return (s or '').strip().upper()

def to_int(v):
    try:
        return int(float(v or 0))
    except (ValueError, TypeError):
        return 0

def fy_to_year(fy):
    """'2014-2015' → '2014'"""
    return fy.split('-')[0].strip() if '-' in str(fy) else str(fy).strip()

# ── Data containers ────────────────────────────────────────────────────────────
# block[state][district][block][year] = { demand, employment_total, ... }
block_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
    'nrega_demand': 0,
    'nrega_employment_total': 0,
    'nrega_employment_sc': 0,
    'nrega_employment_st': 0,
    'nrega_women_employment': 0,
    'nrega_persondays_total': 0,
    'nrega_persondays_sc': 0,
    'nrega_persondays_st': 0,
    'nrega_families_100days': 0,
    'nrega_jobcards_total': 0,
}))))

district_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
    'nrega_demand': 0,
    'nrega_employment_total': 0,
    'nrega_employment_sc': 0,
    'nrega_employment_st': 0,
    'nrega_women_employment': 0,
    'nrega_persondays_total': 0,
    'nrega_persondays_sc': 0,
    'nrega_persondays_st': 0,
    'nrega_families_100days': 0,
    'nrega_jobcards_total': 0,
})))

state_data = defaultdict(lambda: defaultdict(lambda: {
    'nrega_demand': 0,
    'nrega_employment_total': 0,
    'nrega_employment_sc': 0,
    'nrega_employment_st': 0,
    'nrega_women_employment': 0,
    'nrega_persondays_total': 0,
    'nrega_persondays_sc': 0,
    'nrega_persondays_st': 0,
    'nrega_families_100days': 0,
    'nrega_jobcards_total': 0,
}))


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Block Work Demand (monthly → aggregate annual)
# ══════════════════════════════════════════════════════════════════════════════
print("Processing block-level work demand CSV...")
if os.path.exists(BLOCK_DEMAND_CSV):
    with open(BLOCK_DEMAND_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        demand_col = next((c for c in reader.fieldnames if 'demand' in c.lower()), 'demand')
        for row in reader:
            state   = clean(row.get('state_name', ''))
            dist    = clean(row.get('district_name', ''))
            block   = (row.get('block_name') or '').strip()
            year    = str(row.get('year', '')).strip()
            demand  = to_int(row.get(demand_col, 0))
            if state and dist and block and year:
                block_data[state][dist][block][year]['nrega_demand'] += demand
    print("  ✓ Block demand done")
else:
    print(f"  ✗ Not found: {BLOCK_DEMAND_CSV}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Block Employment (SC/ST/Women/Persondays)
# ══════════════════════════════════════════════════════════════════════════════
print("Processing block-level employment CSV...")
if os.path.exists(BLOCK_EMP_CSV):
    with open(BLOCK_EMP_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state   = clean(row.get('state_name', ''))
            dist    = clean(row.get('district_name', ''))
            block   = (row.get('block_name') or '').strip()
            year    = fy_to_year(row.get('financial_year', ''))
            if state and dist and block and year:
                d = block_data[state][dist][block][year]
                d['nrega_employment_total'] += to_int(row.get('hh_provided_employment_total', 0))
                d['nrega_employment_sc']    += to_int(row.get('hh_provided_employment_sc', 0))
                d['nrega_employment_st']    += to_int(row.get('hh_provided_employment_st', 0))
                d['nrega_women_employment'] += to_int(row.get('women_provided_employment', 0))
                d['nrega_persondays_total'] += to_int(row.get('persondays_total', 0))
                d['nrega_persondays_sc']    += to_int(row.get('persondays_sc', 0))
                d['nrega_persondays_st']    += to_int(row.get('persondays_st', 0))
                d['nrega_families_100days'] += to_int(row.get('families_completing_100_days_total', 0))
                d['nrega_jobcards_total']   += to_int(row.get('hh_issued_jobcards_total', 0))
    print("  ✓ Block employment done")
else:
    print(f"  ✗ Not found: {BLOCK_EMP_CSV}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — District Work Demand
# ══════════════════════════════════════════════════════════════════════════════
print("Processing district-level work demand CSV...")
if os.path.exists(DISTRICT_DEMAND_CSV):
    with open(DISTRICT_DEMAND_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        demand_col = next((c for c in reader.fieldnames if 'demand' in c.lower()), 'demand')
        for row in reader:
            state  = clean(row.get('state_name', ''))
            dist   = clean(row.get('district_name', ''))
            year   = str(row.get('year', '')).strip()
            demand = to_int(row.get(demand_col, 0))
            if state and dist and year:
                district_data[state][dist][year]['nrega_demand'] += demand
    print("  ✓ District demand done")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — District Employment
# ══════════════════════════════════════════════════════════════════════════════
print("Processing district-level employment CSV...")
if os.path.exists(DISTRICT_EMP_CSV):
    with open(DISTRICT_EMP_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state  = clean(row.get('state_name', ''))
            dist   = clean(row.get('district_name', ''))
            year   = fy_to_year(row.get('financial_year', ''))
            if state and dist and year:
                d = district_data[state][dist][year]
                d['nrega_employment_total'] += to_int(row.get('hh_provided_employment_total', 0))
                d['nrega_employment_sc']    += to_int(row.get('hh_provided_employment_sc', 0))
                d['nrega_employment_st']    += to_int(row.get('hh_provided_employment_st', 0))
                d['nrega_women_employment'] += to_int(row.get('women_provided_employment', 0))
                d['nrega_persondays_total'] += to_int(row.get('persondays_total', 0))
                d['nrega_persondays_sc']    += to_int(row.get('persondays_sc', 0))
                d['nrega_persondays_st']    += to_int(row.get('persondays_st', 0))
                d['nrega_families_100days'] += to_int(row.get('families_completing_100_days_total', 0))
                d['nrega_jobcards_total']   += to_int(row.get('hh_issued_jobcards_total', 0))
    print("  ✓ District employment done")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — State Work Demand
# ══════════════════════════════════════════════════════════════════════════════
print("Processing state-level work demand CSV...")
if os.path.exists(STATE_DEMAND_CSV):
    with open(STATE_DEMAND_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        demand_col = next((c for c in reader.fieldnames if 'demand' in c.lower()), 'demand')
        for row in reader:
            state  = clean(row.get('state_name', ''))
            year   = str(row.get('year', '')).strip()
            demand = to_int(row.get(demand_col, 0))
            if state and year:
                state_data[state][year]['nrega_demand'] += demand
    print("  ✓ State demand done")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — State Employment
# ══════════════════════════════════════════════════════════════════════════════
print("Processing state-level employment CSV...")
if os.path.exists(STATE_EMP_CSV):
    with open(STATE_EMP_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = clean(row.get('state_name', ''))
            year  = fy_to_year(row.get('financial_year', ''))
            if state and year:
                d = state_data[state][year]
                d['nrega_employment_total'] += to_int(row.get('hh_provided_employment_total', 0))
                d['nrega_employment_sc']    += to_int(row.get('hh_provided_employment_sc', 0))
                d['nrega_employment_st']    += to_int(row.get('hh_provided_employment_st', 0))
                d['nrega_women_employment'] += to_int(row.get('women_provided_employment', 0))
                d['nrega_persondays_total'] += to_int(row.get('persondays_total', 0))
                d['nrega_persondays_sc']    += to_int(row.get('persondays_sc', 0))
                d['nrega_persondays_st']    += to_int(row.get('persondays_st', 0))
                d['nrega_families_100days'] += to_int(row.get('families_completing_100_days_total', 0))
                d['nrega_jobcards_total']   += to_int(row.get('hh_issued_jobcards_total', 0))
    print("  ✓ State employment done")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Write output JSONs
# ══════════════════════════════════════════════════════════════════════════════
print(f"\nWriting {OUT_BLOCK}  ...")
with open(OUT_BLOCK, 'w', encoding='utf-8') as f:
    json.dump(block_data, f, separators=(',', ':'))
block_size = os.path.getsize(OUT_BLOCK) / 1024 / 1024
print(f"  ✓ Block data: {block_size:.1f} MB")

print(f"Writing {OUT_DISTRICT}  ...")
with open(OUT_DISTRICT, 'w', encoding='utf-8') as f:
    json.dump(district_data, f, separators=(',', ':'))
dist_size = os.path.getsize(OUT_DISTRICT) / 1024 / 1024
print(f"  ✓ District data: {dist_size:.1f} MB")

print(f"Writing {OUT_STATE}  ...")
with open(OUT_STATE, 'w', encoding='utf-8') as f:
    json.dump(state_data, f, separators=(',', ':'))
state_size = os.path.getsize(OUT_STATE) / 1024 / 1024
print(f"  ✓ State data: {state_size:.1f} MB")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Embed into State GeoJSON for map rendering
# ══════════════════════════════════════════════════════════════════════════════
print("\nEmbedding full stats into india_mices.json state GeoJSON ...")
STATE_GEOJSON = 'src/data/mices/india_mices.json'
with open(STATE_GEOJSON, encoding='utf-8') as f:
    state_geojson = json.load(f)

for feature in state_geojson['features']:
    geojson_name = (feature['properties'].get('NAME_1') or '').strip().upper()
    if geojson_name in state_data:
        for year, metrics in state_data[geojson_name].items():
            for k, v in metrics.items():
                feature['properties'][f'{k}_{year}'] = v
        # Also set base key to latest available year
        latest_year = sorted(state_data[geojson_name].keys())[-1]
        for k, v in state_data[geojson_name][latest_year].items():
            feature['properties'][k] = v

with open(STATE_GEOJSON, 'w', encoding='utf-8') as f:
    json.dump(state_geojson, f, separators=(',', ':'))
print("  ✓ State GeoJSON updated")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 9 — Embed into District GeoJSON for map rendering
# ══════════════════════════════════════════════════════════════════════════════
print("\nEmbedding full stats into india_mices_districts.json ...")
DISTRICT_GEOJSON = 'src/data/mices/india_mices_districts.json'
with open(DISTRICT_GEOJSON, encoding='utf-8') as f:
    district_geojson = json.load(f)

matched = 0
unmatched = set()
for feature in district_geojson['features']:
    state_name = clean(feature['properties'].get('NAME_1', ''))
    dist_name  = clean(feature['properties'].get('NAME_2', ''))
    
    if state_name in district_data and dist_name in district_data[state_name]:
        matched += 1
        for year, metrics in district_data[state_name][dist_name].items():
            for k, v in metrics.items():
                feature['properties'][f'{k}_{year}'] = v
        latest_year = sorted(district_data[state_name][dist_name].keys())[-1]
        for k, v in district_data[state_name][dist_name][latest_year].items():
            feature['properties'][k] = v
    else:
        unmatched.add(f"{state_name}/{dist_name}")

print(f"  ✓ Matched {matched}/{len(district_geojson['features'])} districts")
if unmatched:
    print(f"  ⚠ Sample unmatched: {list(unmatched)[:5]}")

with open(DISTRICT_GEOJSON, 'w', encoding='utf-8') as f:
    json.dump(district_geojson, f, separators=(',', ':'))
print("  ✓ District GeoJSON updated")

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
total_blocks = sum(
    len(blocks)
    for state in block_data.values()
    for blocks in (
        list(b.keys())
        for dist_dict in state.values()
        for b in [dist_dict]
    )
)

print("\n════════════════════════════════")
print("  PROCESSING COMPLETE")
print(f"  States:    {len(state_data)}")
print(f"  Districts: {sum(len(v) for v in district_data.values())}")
print(f"  Block data file: {block_size:.1f} MB")
print("════════════════════════════════")
print("\nRun 'npm run dev' to see all real data on the portal.")
