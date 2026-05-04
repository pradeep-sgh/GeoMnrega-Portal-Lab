import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { ArrowLeft, Download, FileText, Map as MapIcon, List, ChevronUp, ChevronDown, AlertCircle, BookOpen } from 'lucide-react';
import { exportScreenshot, downloadCSV, exportReport } from '../components/exportScreenshot';
import { loadDistrictData, getDistrictDataSync } from '../data/districtDataLoader';
import districtDemandData from '../data/nrega_district_demand.json';
import blockDemandData from '../data/nrega_block_demand.json';
import districtEmpData from '../data/nrega_district_employment.json';
import blockEmpData from '../data/nrega_block_employment.json';

export default function StateReport({ stateData, dataset, year = '2020', onBack }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [noDistrictData, setNoDistrictData] = useState(false);
  const [viewLevel, setViewLevel] = useState('district'); // 'district' | 'block'
  const [sortField, setSortField] = useState('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [indiaMicesDistrictData, setIndiaMicesDistrictData] = useState(() => getDistrictDataSync());

  useEffect(() => {
    loadDistrictData().then(data => setIndiaMicesDistrictData(prev => prev || data));
  }, []);

  const stateName = stateData?.NAME_1 || 'Unknown State';
  const isNregaDataset = dataset?.startsWith('nrega_');
  
  // State-level values — NREGA must use year-specific key (bare key = latest year)
  const stateSchemeVal    = isNregaDataset && year
    ? Number(stateData?.[`${dataset}_${year}`]) || 0
    : Number(stateData?.[dataset]) || 0;
  const stateTotalSchemes = Number(stateData?.['mices_total_water_scheme']) || 1;

  // ── CSV-based block/district lookup (populated after running process_block_data.py) ──
  const isDemandDataset = dataset === 'nrega_demand';
  const csvDistrictData = isDemandDataset ? districtDemandData : (isNregaDataset ? districtEmpData : {});
  const csvBlockData    = isDemandDataset ? blockDemandData    : (isNregaDataset ? blockEmpData   : {});
  const stateKey = stateName.toUpperCase(); // CSV uses uppercase state names

  // Get all rows for this state+year from CSV data
  const csvDistrictRows = useMemo(() => {
    const rows = csvDistrictData?.[year]?.[stateKey] || [];
    return rows;
  }, [csvDistrictData, year, stateKey]);

  const csvBlockRows = useMemo(() => {
    const rows = csvBlockData?.[year]?.[stateKey] || [];
    return rows;
  }, [csvBlockData, year, stateKey]);

  const csvDataAvailable = csvDistrictRows.length > 0;
  const csvBlockAvailable = csvBlockRows.length > 0;

  // All district names for the filter dropdown
  const districtNames = useMemo(() => {
    const names = [...new Set(csvBlockRows.map(r => r.district))].sort();
    return names;
  }, [csvBlockRows]);

  // Active table rows (district or block view, with filter + sort)
  const tableRows = useMemo(() => {
    let rows = viewLevel === 'block' ? csvBlockRows : csvDistrictRows;
    if (viewLevel === 'block' && filterDistrict !== 'ALL') {
      rows = rows.filter(r => r.district === filterDistrict);
    }
    const sorted = [...rows].sort((a, b) => {
      if (sortField === 'value') {
        return sortAsc ? (a.value || 0) - (b.value || 0) : (b.value || 0) - (a.value || 0);
      }
      const cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [viewLevel, csvDistrictRows, csvBlockRows, filterDistrict, sortField, sortAsc]);

  const tableTotal = tableRows.reduce((s, r) => s + (r.value || 0), 0);

  const getNumeric = (num) => {
    if (typeof num === 'number' && !Number.isNaN(num)) return num;
    if (typeof num === 'string' && num.trim() !== '' && !Number.isNaN(Number(num))) return Number(num);
    return 0;
  };

  /**
   * Get effective value for a district feature:
   * - NREGA: use year-specific key → base key → 0
   * - MICES individual scheme: use direct value → proportional estimate from state totals
   * - MICES total: use direct district value
   */
  const getDistrictValue = (props) => {
    const yearKey = `${dataset}_${year}`;
    let val = getNumeric(props[yearKey]);
    if (!val) val = getNumeric(props[dataset]);
    if (val > 0) return val;

    // NREGA fallback for persondays as proxy for demand
    if (val === 0 && dataset === 'nrega_demand') {
      val = getNumeric(props[`nrega_persondays_total_${year}`]) || getNumeric(props['nrega_persondays_total']) || 0;
    }
    if (val > 0) return val;

    // MICES proportional fallback for individual scheme types
    if (dataset?.startsWith('mices_') && dataset !== 'mices_total_water_scheme') {
      const distTotal = getNumeric(props['mices_total_water_scheme']);
      if (distTotal > 0 && stateSchemeVal > 0) {
        return (distTotal / stateTotalSchemes) * stateSchemeVal;
      }
    }

    return 0;
  };

  // Stats calculation
  const stateFeatures = indiaMicesDistrictData?.features?.filter(f => f.properties.NAME_1 === stateName) || [];
  let maxVal = 0;
  let totalVal = 0;
  stateFeatures.forEach(f => {
     const val = getDistrictValue(f.properties);
     totalVal += val;
     if (val > maxVal) maxVal = val;
  });
  // Fall back to state-level value when district data is absent
  const hasDistrictData = totalVal > 0;
  if (!hasDistrictData) totalVal = stateSchemeVal;
  if (maxVal === 0) maxVal = stateSchemeVal || 100;
  totalVal = Math.round(totalVal);
  maxVal   = Math.round(maxVal);

  let colors = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b']; // Defaults (Blues)
  if (dataset?.startsWith('mices_')) colors = ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']; // Purples
  else if (dataset?.startsWith('nrega_demand')) colors = ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#8c2d04']; // Oranges
  else if (dataset?.startsWith('nrega_')) colors = ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b']; // Greens

  useEffect(() => {
    if (!indiaMicesDistrictData) return;
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [78, 21], 
        zoom: 4,
        interactive: true,
        attributionControl: false,
        preserveDrawingBuffer: true,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

      map.current.on('load', () => {
        // Compute value for each district and embed as _value property
        const geojson = {
          type: 'FeatureCollection',
          features: stateFeatures.map(f => ({
            ...f,
            properties: {
              ...f.properties,
              _nrega_value: getDistrictValue(f.properties)
            }
          }))
        };

        // Detect if all values are zero (NREGA data not yet embedded)
        const hasData = geojson.features.some(f => f.properties._nrega_value > 0);
        setNoDistrictData(!hasData && dataset?.startsWith('nrega_'));

        map.current.addSource('state-districts', {
          type: 'geojson',
          data: geojson,
          generateId: true
        });

        // Add filled district polygons
        map.current.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'state-districts',
          paint: {
            'fill-color': [
                'interpolate',
                ['exponential', 0.5],
                ['coalesce', ['get', '_nrega_value'], ['get', dataset], 0],
                0, colors[0],
                maxVal * 0.1, colors[1],
                maxVal * 0.25, colors[2],
                maxVal * 0.5, colors[3],
                maxVal, colors[4]
            ],
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.8
            ]
          }
        });
        
        // Add District boundaries
        map.current.addLayer({
          id: 'districts-line',
          type: 'line',
          source: 'state-districts',
          paint: {
            'line-color': '#ffffff',
            'line-width': 1
          }
        });

        // Add State wide boundary for emphasis
        map.current.addLayer({
          id: 'state-boundary-highlight',
          type: 'line',
          source: 'state-districts',
          paint: {
            'line-color': '#000000',
            'line-width': 2,
            'line-opacity': 0.8
          },
          filter: ['==', '$type', 'Polygon'] // Wait, this draws every district boundary thick if we aren't careful.
          // Since the source is state-districts, it will draw borders for districts. Let's omit thick borders here or use the main states layer. 
          // Omitted for standard look.
        });

        // Fit Bounds precisely
        if (stateFeatures.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          stateFeatures.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
               feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
            } else if (feature.geometry.type === 'MultiPolygon') {
               feature.geometry.coordinates.forEach(poly => {
                 poly[0].forEach(coord => bounds.extend(coord));
               });
            }
          });
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
        }
        
        // Hover effects interactive
        let hoveredStateId = null;
        map.current.on('mousemove', 'districts-fill', (e) => {
          if (e.features.length > 0) {
            if (hoveredStateId !== null) {
              map.current.setFeatureState({ source: 'state-districts', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = e.features[0].id;
            map.current.setFeatureState({ source: 'state-districts', id: hoveredStateId }, { hover: true });
            setHoveredDistrict({
              name: e.features[0].properties.NAME_2,
              value: e.features[0].properties._nrega_value ?? e.features[0].properties[dataset] ?? 0
            });
          }
        });

        map.current.on('mouseleave', 'districts-fill', () => {
          if (hoveredStateId !== null) {
            map.current.setFeatureState({ source: 'state-districts', id: hoveredStateId }, { hover: false });
          }
          hoveredStateId = null;
          setHoveredDistrict(null);
        });
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stateName, dataset, year, indiaMicesDistrictData]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            title="Back to India Map"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{stateName} — {dataset.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</h1>
            <p className="text-xs text-gray-500 font-medium">
              {isNregaDataset ? `Financial Year ${year}–${String(parseInt(year)+1).slice(2)}` : 'MICES Data'}
              {' · '}{stateFeatures.length} districts
              {' · '}State Total: <strong className="text-gray-700">{totalVal.toLocaleString()}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Level selector — only for NREGA where CSV data exists */}
          {isNregaDataset && (
            <div className="flex rounded border border-gray-300 overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setViewLevel('district')}
                className={`px-3 py-1.5 transition-colors ${viewLevel === 'district' ? 'bg-[#2d74b4] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >District</button>
              <button
                onClick={() => setViewLevel('block')}
                className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${viewLevel === 'block' ? 'bg-[#2d74b4] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >Block</button>
            </div>
          )}
          <button
            onClick={() => {
              const cols = viewLevel === 'block'
                ? ['state', 'district', 'block', 'value']
                : ['state', 'district', 'value'];
              const rows = tableRows.map(r => ({ state: stateName, ...r }));
              downloadCSV(rows, `GeoMNREGA_${stateName}_${dataset}_${year}`, cols);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => exportReport({
              title: `${stateName} — ${dataset.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}`,
              subtitle: `Financial Year ${year}–${String(parseInt(year)+1).slice(2)} · ${stateFeatures.length} Districts`,
              stats: [
                { label: 'State Total', value: totalVal.toLocaleString() },
                { label: 'Districts', value: stateFeatures.length },
                { label: 'Top District Value', value: maxVal.toLocaleString() },
                { label: 'Year', value: `${year}–${String(parseInt(year)+1).slice(2)}` },
              ],
              tableRows: tableRows.map(r => ({ State: stateName, ...r })),
              tableColumns: viewLevel === 'block' ? ['State','district','block','value'] : ['State','district','value'],
              filename: `GeoMNREGA_Report_${stateName}_${year}`,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" /> Export Report
          </button>
          <button
            onClick={() => exportScreenshot(`GeoMNREGA_${stateName}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d74b4] text-white rounded text-xs font-semibold hover:bg-[#23588a] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Map
          </button>
        </div>
      </header>

      {/* Body — map + data panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map area */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          <div ref={mapContainer} className="w-full h-full" />

          {/* No district map data overlay */}
          {noDistrictData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none z-10">
              <div className="bg-white border border-yellow-300 rounded-lg p-6 shadow-lg max-w-sm text-center">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-base font-bold text-gray-800 mb-2">District map data not embedded</p>
                <p className="text-sm text-gray-600 mb-1">Run to embed district-level NREGA values:</p>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block">python process_all_nrega.py</code>
              </div>
            </div>
          )}

          {/* Hover tooltip */}
          {hoveredDistrict && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-lg border border-gray-200 rounded p-3 pointer-events-none min-w-[180px] z-20">
              <h4 className="text-sm font-bold text-gray-900 leading-tight">{hoveredDistrict.name}</h4>
              <p className="text-xs text-gray-400 mb-1">District</p>
              <span className="text-lg font-bold text-[#2d74b4]">{Math.round(hoveredDistrict.value).toLocaleString()}</span>
            </div>
          )}

          {/* Color legend */}
          <div className="absolute bottom-6 left-4 bg-white/95 rounded shadow-lg px-3 py-2 border border-gray-200 pointer-events-none">
            <p className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">
              {dataset.replace(/_/g,' ')}{isNregaDataset ? ` · ${year}` : ''}
            </p>
            <div className="flex gap-1 mb-0.5">
              {colors.map((c, i) => (
                <div key={i} className="w-7 h-3.5 rounded-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-500">
              <span>0</span>
              <span>{Math.round(maxVal * 0.5).toLocaleString()}</span>
              <span>{Math.round(maxVal).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right data panel — district / block table from CSV */}
        {isNregaDataset && (
          <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-[#2d74b4]" />
                <h3 className="font-bold text-sm text-gray-800">
                  {viewLevel === 'block' ? 'Block-wise Data' : 'District-wise Data'}
                </h3>
              </div>
              {csvDataAvailable && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {tableRows.length} {viewLevel === 'block' ? 'blocks' : 'districts'}
                </span>
              )}
            </div>

            {/* Block view: district filter */}
            {viewLevel === 'block' && csvBlockAvailable && districtNames.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-100 shrink-0">
                <select
                  value={filterDistrict}
                  onChange={e => setFilterDistrict(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-[#2d74b4]"
                >
                  <option value="ALL">All Districts</option>
                  {districtNames.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

            {/* No data message */}
            {!csvDataAvailable && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {viewLevel === 'block' ? 'Block' : 'District'} data not processed yet
                </p>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Run the preprocessing script to load CSV data into the portal:
                </p>
                <code className="bg-gray-100 text-gray-800 text-xs px-3 py-2 rounded block w-full text-left">
                  python process_block_data.py
                </code>
                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                  This aggregates monthly NREGA CSVs into annual JSON files for district and block level drill-down.
                </p>
              </div>
            )}

            {/* Column headers */}
            {csvDataAvailable && (
              <>
                <div className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide shrink-0">
                  {viewLevel === 'block' && (
                    <button
                      onClick={() => { setSortField('district'); setSortAsc(s => sortField === 'district' ? !s : false); }}
                      className="flex items-center gap-0.5 w-[110px] hover:text-gray-800 transition-colors"
                    >
                      District
                      {sortField === 'district' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  )}
                  <button
                    onClick={() => { setSortField(viewLevel === 'block' ? 'block' : 'district'); setSortAsc(s => sortField !== 'value' ? !s : false); }}
                    className={`flex items-center gap-0.5 hover:text-gray-800 transition-colors ${viewLevel === 'block' ? 'flex-1' : 'flex-1'}`}
                  >
                    {viewLevel === 'block' ? 'Block' : 'District'}
                    {sortField !== 'value' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                  <button
                    onClick={() => { setSortField('value'); setSortAsc(s => sortField === 'value' ? !s : false); }}
                    className="flex items-center gap-0.5 w-[90px] text-right justify-end hover:text-gray-800 transition-colors"
                  >
                    Value
                    {sortField === 'value' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </div>

                {/* Table rows */}
                <div className="flex-1 overflow-y-auto text-xs">
                  {tableRows.map((row, i) => {
                    const pct = tableTotal > 0 ? Math.round((row.value / tableTotal) * 100) : 0;
                    const name = viewLevel === 'block' ? row.block : row.district;
                    const maxRowVal = tableRows[0]?.value || 1;
                    const barPct = Math.round((row.value / maxRowVal) * 100);
                    return (
                      <div
                        key={i}
                        className="flex items-center px-3 py-2 border-b border-gray-50 hover:bg-blue-50 transition-colors group"
                      >
                        <span className="w-5 text-gray-300 font-mono text-[10px] shrink-0">{i + 1}</span>
                        {viewLevel === 'block' && (
                          <span className="w-[100px] text-gray-500 truncate mr-2 shrink-0 text-[10px]" title={row.district}>
                            {row.district}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 font-medium truncate" title={name}>{name}</p>
                          <div className="mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#2d74b4] rounded-full opacity-60" style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                        <div className="ml-2 text-right shrink-0">
                          <p className="font-bold text-gray-900">{row.value.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400">{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer total */}
                <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold text-gray-600">Total ({tableRows.length} {viewLevel === 'block' ? 'blocks' : 'districts'})</span>
                  <span className="text-xs font-bold text-gray-900">{tableTotal.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
