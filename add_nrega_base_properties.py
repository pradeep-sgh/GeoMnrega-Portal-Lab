import json
from pathlib import Path

def add_nrega_base_properties(geojson_file):
    """
    Add base NREGA properties (without year suffix) to geojson features.
    Uses the latest year available for each property.
    """
    with open(geojson_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # NREGA property bases we want to aggregate
    nrega_bases = [
        'nrega_demand',
        'nrega_employment_total',
        'nrega_women_employment',
        'nrega_persondays_total'
    ]
    
    for feature in data['features']:
        properties = feature['properties']
        
        # For each NREGA base, find the latest year and add a base property
        for base in nrega_bases:
            # Find all year-specific properties for this base
            year_props = {k: v for k, v in properties.items() if k.startswith(base + '_')}
            
            if year_props:
                # Extract years and get the latest
                years = []
                for k in year_props.keys():
                    try:
                        year = int(k.split('_')[-1])
                        years.append((year, k))
                    except:
                        pass
                
                if years:
                    # Get the latest year's value
                    latest_year, latest_key = max(years, key=lambda x: x[0])
                    latest_value = properties[latest_key]
                    
                    # Add the base property
                    properties[base] = latest_value
                    print(f"Added {base} = {latest_value} (from {latest_key})")
    
    # Write back to file
    with open(geojson_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    
    print(f"\nSuccessfully updated {geojson_file}")

if __name__ == '__main__':
    # Process both state and district files
    state_file = Path('src/data/mices/india_mices.json')
    district_file = Path('src/data/mices/india_mices_districts.json')
    
    if state_file.exists():
        print(f"Processing {state_file}...")
        add_nrega_base_properties(state_file)
    else:
        print(f"State file not found: {state_file}")
    
    if district_file.exists():
        print(f"\nProcessing {district_file}...")
        add_nrega_base_properties(district_file)
    else:
        print(f"District file not found: {district_file}")
