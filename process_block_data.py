"""
process_block_data.py
Aggregates NREGA monthly CSVs into annual JSON files for the frontend.
Run this from the project root:  python process_block_data.py

Output files (created in src/data/):
  nrega_district_demand.json   — annual demand totals by state → district
  nrega_block_demand.json      — annual demand totals by state → district → block
  nrega_district_employment.json — annual SC/ST employment by state → district
  nrega_block_employment.json    — annual SC/ST employment by state → district → block
"""
import csv, json, os

OUT_DIR = 'src/data'

def aggregate_csv(filepath, group_cols, value_col):
    """Sum value_col grouped by group_cols + year from monthly CSV."""
    result = {}  # {year: {tuple(group_vals): total}}
    if not os.path.exists(filepath):
        print(f'  SKIP (not found): {filepath}')
        return result
    with open(filepath, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        # detect actual value column from header if needed
        headers = reader.fieldnames or []
        if value_col not in headers:
            candidates = [h for h in headers if h not in ('state_name','district_name','block_name','year','month')]
            value_col = candidates[0] if candidates else value_col
            print(f'  Using column "{value_col}" as value')
        for row in reader:
            year = row.get('year', '').strip()
            if not year:
                continue
            key = tuple(row[c].strip().upper() for c in group_cols)
            val = 0
            try:
                val = float(row.get(value_col, 0) or 0)
            except (ValueError, TypeError):
                pass
            if year not in result:
                result[year] = {}
            result[year][key] = result[year].get(key, 0) + val
    return result

def to_nested(raw, name_cols):
    """Convert {year: {(col1,col2,...): val}} → {year: {STATE: [{col: val, ..., value: n}]}}."""
    out = {}
    for year, entries in raw.items():
        out[year] = {}
        for keys, val in entries.items():
            state = keys[0]
            record = {name_cols[i]: keys[i] for i in range(1, len(name_cols))}
            record['value'] = round(val)
            out[year].setdefault(state, []).append(record)
        for state_list in out[year].values():
            state_list.sort(key=lambda x: x['value'], reverse=True)
    return out

tasks = [
    (
        'Work Demand Pattern — District',
        'src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv',
        ['state_name', 'district_name'], 'demand',
        ['state', 'district'],
        f'{OUT_DIR}/nrega_district_demand.json'
    ),
    (
        'Work Demand Pattern — Block',
        'src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_block.csv',
        ['state_name', 'district_name', 'block_name'], 'demand',
        ['state', 'district', 'block'],
        f'{OUT_DIR}/nrega_block_demand.json'
    ),
    (
        'Employment SC-ST — District',
        'src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv',
        ['state_name', 'district_name'], 'employment',
        ['state', 'district'],
        f'{OUT_DIR}/nrega_district_employment.json'
    ),
    (
        'Employment SC-ST — Block',
        'src/data/nrega_reports/Employment - SC-ST/employment_scst_block.csv',
        ['state_name', 'district_name', 'block_name'], 'employment',
        ['state', 'district', 'block'],
        f'{OUT_DIR}/nrega_block_employment.json'
    ),
]

for label, filepath, group_cols, value_col, name_cols, outpath in tasks:
    print(f'Processing {label} ...')
    raw = aggregate_csv(filepath, group_cols, value_col)
    data = to_nested(raw, name_cols)
    with open(outpath, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'  Written {outpath}  ({len(data)} years)')

print('\nAll done! Now run: npm run dev')
print('\nNOTE: For block/panchayat MAP visualization, provide shapefiles:')
print('  Block GeoJSON  →  src/data/india_blocks.json')
print('  Properties needed per feature:')
print('    NAME_1 = state name  (UPPERCASE, match CSV state_name)')
print('    NAME_2 = district name (UPPERCASE, match CSV district_name)')
print('    NAME_3 = block name   (UPPERCASE, match CSV block_name)')
print()
print('  Panchayat GeoJSON  →  src/data/india_panchayats.json')
print('  Properties needed:  NAME_1, NAME_2, NAME_3, NAME_4 (panchayat)')
