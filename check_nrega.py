import json, pathlib
f=pathlib.Path('src/data/mices/india_mices.json')
js=json.loads(f.read_text())
print('keys', list(js['features'][0]['properties'].keys())[:50])
for k in ['nrega_demand','nrega_employment_total','nrega_women_employment','nrega_persondays_total']:
    print(k, js['features'][0]['properties'].get(k))
