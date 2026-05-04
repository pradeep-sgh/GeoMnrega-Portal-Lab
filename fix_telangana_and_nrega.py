#!/usr/bin/env python3
"""
Fix Telangana state and NREGA data integration:
1. Extract Telangana districts from NREGA data
2. Create Telangana districts in GeoJSON by mapping from Andhra Pradesh
3. Add state-level NREGA aggregations
4. Ensure all NREGA data is properly integrated
"""

import json
import csv
from collections import defaultdict
from pathlib import Path

def clean_name(name):
    if not name: return ""
    return name.strip().upper()

def process():
    print("=" * 60)
    print("FIXING TELANGANA AND NREGA DATA INTEGRATION")
    print("=" * 60)
    
    # Step 1: Load all Telangana districts from NREGA data
    print("\n[1/6] Loading Telangana districts from NREGA data...")
    telangana_csv_districts = set()
    telangana_nrega_data = defaultdict(lambda: defaultdict(lambda: {
        'nrega_demand': 0,
        'nrega_employment_total': 0,
        'nrega_women_employment': 0,
        'nrega_persondays_total': 0
    }))
    
    # Process Work Demand for Telangana
    with open('src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        demand_col = next(c for c in reader.fieldnames if 'deman' in c.lower())
        for row in reader:
            if clean_name(row.get('state_name', '')) == 'TELANGANA':
                district = clean_name(row.get('district_name', ''))
                telangana_csv_districts.add(district)
                year = str(row.get('year', '')).strip()
                try:
                    demand = int(float(row.get(demand_col, 0)))
                except: demand = 0
                if district and year:
                    telangana_nrega_data[district][year]['nrega_demand'] += demand
    
    # Process Employment for Telangana
    with open('src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if clean_name(row.get('state_name', '')) == 'TELANGANA':
                district = clean_name(row.get('district_name', ''))
                telangana_csv_districts.add(district)
                fy = str(row.get('financial_year', ''))
                year = fy.split('-')[0].strip() if '-' in fy else fy.strip()
                try:
                    emp_total = int(float(row.get('hh_provided_employment_total', 0)))
                except: emp_total = 0
                try:
                    emp_women = int(float(row.get('women_provided_employment', 0)))
                except: emp_women = 0
                try:
                    persondays = int(float(row.get('persondays_total', 0)))
                except: persondays = 0
                
                if district and year:
                    telangana_nrega_data[district][year]['nrega_employment_total'] += emp_total
                    telangana_nrega_data[district][year]['nrega_women_employment'] += emp_women
                    telangana_nrega_data[district][year]['nrega_persondays_total'] += persondays
    
    print(f"   Found {len(telangana_csv_districts)} Telangana districts in NREGA data")
    print(f"   Districts: {', '.join(sorted(list(telangana_csv_districts))[:5])}...")
    
    # Step 2: Load current GeoJSON
    print("\n[2/6] Loading GeoJSON files...")
    with open('src/data/mices/india_mices_districts.json', 'r', encoding='utf-8') as f:
        geojson = json.load(f)
    
    # Step 3: Create mapping of CSV district names to potential GeoJSON matches
    print("\n[3/6] Creating Telangana districts mapping...")
    
    # District name mappings (CSV name -> GeoJSON name) for known differences
    name_mapping = {
        'JAYASHANKER BHOPALAPALLY': 'Jayashankar Bhopalapally',
        'BHADRADRI KOTHAGUDEM': 'Bhadradri Kothagudem',
    }
    
    # Find Andhra Pradesh districts that match Telangana CSV districts
    telangana_geojson_districts = []
    new_features = []
    
    for csv_dist in telangana_csv_districts:
        # Try mapping
        geojson_name = name_mapping.get(csv_dist, csv_dist.title())
        
        # Find matching GeoJSON feature
        matching_feature = None
        for feature in geojson['features']:
            if (feature['properties'].get('NAME_1') == 'Andhra Pradesh' and 
                clean_name(feature['properties'].get('NAME_2', '')) == csv_dist):
                matching_feature = feature
                break
        
        if matching_feature:
            # Create a new Telangana district feature by copying the AP one
            telangana_feature = json.loads(json.dumps(matching_feature))  # Deep copy
            telangana_feature['properties']['NAME_1'] = 'Telangana'
            telangana_feature['properties']['NAME_2'] = geojson_name
            
            # Add NREGA data
            for year, metrics in telangana_nrega_data[csv_dist].items():
                telangana_feature['properties'][f'nrega_demand_{year}'] = metrics['nrega_demand']
                telangana_feature['properties'][f'nrega_employment_total_{year}'] = metrics['nrega_employment_total']
                telangana_feature['properties'][f'nrega_women_employment_{year}'] = metrics['nrega_women_employment']
                telangana_feature['properties'][f'nrega_persondays_total_{year}'] = metrics['nrega_persondays_total']
            
            # Set current year (latest) values
            if telangana_nrega_data[csv_dist]:
                latest_year = max(telangana_nrega_data[csv_dist].keys())
                latest = telangana_nrega_data[csv_dist][latest_year]
                telangana_feature['properties']['nrega_demand'] = latest['nrega_demand']
                telangana_feature['properties']['nrega_employment_total'] = latest['nrega_employment_total']
                telangana_feature['properties']['nrega_women_employment'] = latest['nrega_women_employment']
                telangana_feature['properties']['nrega_persondays_total'] = latest['nrega_persondays_total']
            
            new_features.append(telangana_feature)
            telangana_geojson_districts.append(csv_dist)
    
    print(f"   Successfully mapped {len(new_features)} Telangana districts from Andhra Pradesh geometries")
    
    # Step 4: Add Telangana features to GeoJSON
    print("\n[4/6] Adding Telangana districts to GeoJSON...")
    geojson['features'].extend(new_features)
    print(f"   GeoJSON now has {len(geojson['features'])} total features")
    
    # Step 5: Add NREGA data to remaining districts (that were already in GeoJSON)
    print("\n[5/6] Adding NREGA data to all other districts...")
    
    # Load all NREGA data (not just Telangana)
    all_nrega_data = defaultdict(lambda: defaultdict(lambda: {
        'nrega_demand': 0,
        'nrega_employment_total': 0,
        'nrega_women_employment': 0,
        'nrega_persondays_total': 0
    }))
    
    with open('src/data/nrega_reports/Work Demand Pattern/work_demand_pattern_hh_district.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        demand_col = next(c for c in reader.fieldnames if 'deman' in c.lower())
        for row in reader:
            district = clean_name(row.get('district_name', ''))
            year = str(row.get('year', '')).strip()
            try:
                demand = int(float(row.get(demand_col, 0)))
            except: demand = 0
            if district and year:
                all_nrega_data[district][year]['nrega_demand'] += demand
    
    with open('src/data/nrega_reports/Employment - SC-ST/employment_scst_district.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            district = clean_name(row.get('district_name', ''))
            fy = str(row.get('financial_year', ''))
            year = fy.split('-')[0].strip() if '-' in fy else fy.strip()
            try:
                emp_total = int(float(row.get('hh_provided_employment_total', 0)))
            except: emp_total = 0
            try:
                emp_women = int(float(row.get('women_provided_employment', 0)))
            except: emp_women = 0
            try:
                persondays = int(float(row.get('persondays_total', 0)))
            except: persondays = 0
            
            if district and year:
                all_nrega_data[district][year]['nrega_employment_total'] += emp_total
                all_nrega_data[district][year]['nrega_women_employment'] += emp_women
                all_nrega_data[district][year]['nrega_persondays_total'] += persondays
    
    # Inject NREGA data into all features
    matched = 0
    for feature in geojson['features']:
        dist_name = clean_name(feature['properties'].get('NAME_2', ''))
        if dist_name in all_nrega_data:
            matched += 1
            for year, metrics in all_nrega_data[dist_name].items():
                feature['properties'][f'nrega_demand_{year}'] = metrics['nrega_demand']
                feature['properties'][f'nrega_employment_total_{year}'] = metrics['nrega_employment_total']
                feature['properties'][f'nrega_women_employment_{year}'] = metrics['nrega_women_employment']
                feature['properties'][f'nrega_persondays_total_{year}'] = metrics['nrega_persondays_total']
            
            # Set current year values
            if all_nrega_data[dist_name]:
                latest_year = max(all_nrega_data[dist_name].keys())
                latest = all_nrega_data[dist_name][latest_year]
                feature['properties']['nrega_demand'] = latest['nrega_demand']
                feature['properties']['nrega_employment_total'] = latest['nrega_employment_total']
                feature['properties']['nrega_women_employment'] = latest['nrega_women_employment']
                feature['properties']['nrega_persondays_total'] = latest['nrega_persondays_total']
    
    print(f"   Added NREGA data to {matched} districts")
    
    # Step 6: Save updated GeoJSON
    print("\n[6/6] Saving updated GeoJSON...")
    with open('src/data/mices/india_mices_districts.json', 'w', encoding='utf-8') as f:
        json.dump(geojson, f, separators=(',', ':'))
    print(f"   Saved to india_mices_districts.json")
    
    # Step 7: Add state-level NREGA data
    print("\n[BONUS] Adding state-level NREGA data to states GeoJSON...")
    
    with open('src/data/mices/india_mices.json', 'r', encoding='utf-8') as f:
        states_geojson = json.load(f)
    
    # Aggregate NREGA data by state
    state_nrega_data = defaultdict(lambda: defaultdict(lambda: {
        'nrega_demand': 0,
        'nrega_employment_total': 0,
        'nrega_women_employment': 0,
        'nrega_persondays_total': 0
    }))
    
    # Load state-level employment data
    with open('src/data/nrega_reports/Employment - SC-ST/employment_scst_state.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = clean_name(row.get('state_name', ''))
            fy = str(row.get('financial_year', ''))
            year = fy.split('-')[0].strip() if '-' in fy else fy.strip()
            try:
                emp_total = int(float(row.get('hh_provided_employment_total', 0)))
            except: emp_total = 0
            try:
                emp_women = int(float(row.get('women_provided_employment', 0)))
            except: emp_women = 0
            try:
                persondays = int(float(row.get('persondays_total', 0)))
            except: persondays = 0
            
            if state and year:
                # Map state names
                state_key = state.replace('ODISHA', 'ORISSA')
                state_nrega_data[state_key][year]['nrega_employment_total'] += emp_total
                state_nrega_data[state_key][year]['nrega_women_employment'] += emp_women
                state_nrega_data[state_key][year]['nrega_persondays_total'] += persondays
    
    # Aggregate work demand by state (sum all districts in state)
    for feature in geojson['features']:
        state = clean_name(feature['properties'].get('NAME_1', ''))
        for year_key in feature['properties'].keys():
            if year_key.startswith('nrega_demand_') or year_key == 'nrega_demand':
                continue
            if 'nrega_demand_20' in year_key:
                year = year_key.split('_')[-1]
                value = feature['properties'][year_key]
                if value:
                    state_nrega_data[state][year]['nrega_demand'] += value
    
    # Inject into states GeoJSON
    for feature in states_geojson['features']:
        state = clean_name(feature['properties'].get('NAME_1', ''))
        if state in state_nrega_data:
            for year, metrics in state_nrega_data[state].items():
                feature['properties'][f'nrega_demand_{year}'] = metrics['nrega_demand']
                feature['properties'][f'nrega_employment_total_{year}'] = metrics['nrega_employment_total']
                feature['properties'][f'nrega_women_employment_{year}'] = metrics['nrega_women_employment']
                feature['properties'][f'nrega_persondays_total_{year}'] = metrics['nrega_persondays_total']
            
            # Set current year
            if state_nrega_data[state]:
                latest_year = max(state_nrega_data[state].keys())
                latest = state_nrega_data[state][latest_year]
                feature['properties']['nrega_demand'] = latest['nrega_demand']
                feature['properties']['nrega_employment_total'] = latest['nrega_employment_total']
                feature['properties']['nrega_women_employment'] = latest['nrega_women_employment']
                feature['properties']['nrega_persondays_total'] = latest['nrega_persondays_total']
    
    with open('src/data/mices/india_mices.json', 'w', encoding='utf-8') as f:
        json.dump(states_geojson, f, separators=(',', ':'))
    print(f"   Saved to india_mices.json")
    
    print("\n" + "=" * 60)
    print("✓ COMPLETE! All issues fixed:")
    print(f"  • Added {len(new_features)} Telangana districts")
    print(f"  • Added NREGA data to {matched} districts")
    print(f"  • Added state-level NREGA data")
    print("  • Telangana state overview should now work")
    print("  • NREGA reports should display on the map")
    print("=" * 60)

if __name__ == '__main__':
    process()
