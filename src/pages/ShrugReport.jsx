import React, { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ArrowLeft, Database, BarChart2, Info, ChevronRight, Download, FileText, BookOpen } from 'lucide-react';
import { exportScreenshot, downloadCSV, exportReport } from '../components/exportScreenshot';
import indiaMicesData from '../data/mices/india_mices.json';
import shrugStateData from '../data/shrug_state_data.json';
import shrugDistrictData from '../data/shrug_district_data.json';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STATE_ID_MAP = {
  'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03',
  'Chandigarh': '04', 'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07',
  'Rajasthan': '08', 'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11',
  'Arunachal Pradesh': '12', 'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15',
  'Tripura': '16', 'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19',
  'Jharkhand': '20', 'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23',
  'Gujarat': '24', 'Daman and Diu': '25', 'Dadra and Nagar Haveli': '26',
  'Maharashtra': '27', 'Andhra Pradesh': '28', 'Karnataka': '29', 'Goa': '30',
  'Lakshadweep': '31', 'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34',
  'Andaman and Nicobar': '35', 'Telangana': '36',
};

// GeoJSON uses old state names — map to modern SHRUG names and back
const GEOJSON_TO_SHRUG = { 'Orissa': 'Odisha', 'Uttaranchal': 'Uttarakhand' };
const SHRUG_TO_GEOJSON = Object.fromEntries(Object.entries(GEOJSON_TO_SHRUG).map(([k, v]) => [v, k]));
function toShrugName(n) { return GEOJSON_TO_SHRUG[n] || n; }
function toGeoName(n)  { return SHRUG_TO_GEOJSON[n]  || n; }

const MODULES = [
  { id: 'pca11',     label: 'PCA 2011',    desc: 'Primary Census Abstract 2011' },
  { id: 'pca01',     label: 'PCA 2001',    desc: 'Primary Census Abstract 2001' },
  { id: 'pca91',     label: 'PCA 1991',    desc: 'Primary Census Abstract 1991' },
  { id: 'ec13',      label: 'EC 2013',     desc: 'Economic Census 2013' },
  { id: 'ec05',      label: 'EC 2005',     desc: 'Economic Census 2005' },
  { id: 'rbi',       label: 'RBI Banking', desc: 'RBI Bank Branch Directory' },
  { id: 'antyodaya', label: 'Antyodaya',   desc: 'Antyodaya Welfare Survey (PC11 Districts)' },
];

const INDICATORS = {
  pca11: [
    { id: 'tot_p',        label: 'Total Population',          unit: 'persons',      format: 'number'  },
    { id: 'no_hh',        label: 'Total Households',          unit: 'households',   format: 'number'  },
    { id: 'lit_rate',     label: 'Literacy Rate',             unit: '%',            format: 'percent' },
    { id: 'sc_pct',       label: 'SC Population Share',       unit: '%',            format: 'percent' },
    { id: 'st_pct',       label: 'ST Population Share',       unit: '%',            format: 'percent' },
    { id: 'work_pct',     label: 'Work Participation Rate',   unit: '%',            format: 'percent' },
    { id: 'ag_labour_pct',label: 'Agricultural Labour Share', unit: '% of workers', format: 'percent' },
  ],
  pca01: [
    { id: 'tot_p',        label: 'Total Population',          unit: 'persons',      format: 'number'  },
    { id: 'lit_rate',     label: 'Literacy Rate',             unit: '%',            format: 'percent' },
    { id: 'sc_pct',       label: 'SC Population Share',       unit: '%',            format: 'percent' },
    { id: 'st_pct',       label: 'ST Population Share',       unit: '%',            format: 'percent' },
    { id: 'work_pct',     label: 'Work Participation Rate',   unit: '%',            format: 'percent' },
    { id: 'ag_labour_pct',label: 'Agricultural Labour Share', unit: '% of workers', format: 'percent' },
  ],
  pca91: [
    { id: 'tot_p',        label: 'Total Population',          unit: 'persons',      format: 'number'  },
    { id: 'lit_rate',     label: 'Literacy Rate',             unit: '%',            format: 'percent' },
    { id: 'sc_pct',       label: 'SC Population Share',       unit: '%',            format: 'percent' },
    { id: 'st_pct',       label: 'ST Population Share',       unit: '%',            format: 'percent' },
    { id: 'work_pct',     label: 'Work Participation Rate',   unit: '%',            format: 'percent' },
    { id: 'ag_labour_pct',label: 'Agricultural Labour Share', unit: '% of workers', format: 'percent' },
  ],
  ec13: [
    { id: 'emp_all',         label: 'Total Employment',            unit: 'workers',     format: 'number'  },
    { id: 'count_all',       label: 'Total Enterprises',           unit: 'enterprises', format: 'number'  },
    { id: 'female_emp_pct',  label: 'Female Employment Share',     unit: '%',           format: 'percent' },
    { id: 'gov_emp_pct',     label: 'Government Employment Share', unit: '%',           format: 'percent' },
    { id: 'manuf_emp_pct',   label: 'Manufacturing Emp. Share',    unit: '%',           format: 'percent' },
    { id: 'services_emp_pct',label: 'Services Employment Share',   unit: '%',           format: 'percent' },
    { id: 'sc_emp_pct',      label: 'SC Employment Share',         unit: '%',           format: 'percent' },
    { id: 'st_emp_pct',      label: 'ST Employment Share',         unit: '%',           format: 'percent' },
  ],
  ec05: [
    { id: 'emp_all',         label: 'Total Employment',            unit: 'workers',     format: 'number'  },
    { id: 'count_all',       label: 'Total Enterprises',           unit: 'enterprises', format: 'number'  },
    { id: 'female_emp_pct',  label: 'Female Employment Share',     unit: '%',           format: 'percent' },
    { id: 'gov_emp_pct',     label: 'Government Employment Share', unit: '%',           format: 'percent' },
    { id: 'manuf_emp_pct',   label: 'Manufacturing Emp. Share',    unit: '%',           format: 'percent' },
    { id: 'services_emp_pct',label: 'Services Employment Share',   unit: '%',           format: 'percent' },
    { id: 'sc_emp_pct',      label: 'SC Employment Share',         unit: '%',           format: 'percent' },
    { id: 'st_emp_pct',      label: 'ST Employment Share',         unit: '%',           format: 'percent' },
  ],
  rbi: [
    { id: 'branches',   label: 'Total Bank Branches',      unit: 'branches', format: 'number' },
    { id: 'private',    label: 'Private Sector Branches',  unit: 'branches', format: 'number' },
    { id: 'public_sbi', label: 'Public / SBI Branches',    unit: 'branches', format: 'number' },
    { id: 'rural',      label: 'Rural Branches',           unit: 'branches', format: 'number' },
    { id: 'urban',      label: 'Urban Branches',           unit: 'branches', format: 'number' },
  ],
  antyodaya: [
    { id: 'tot_pop',           label: 'Total Population',               unit: 'persons',    format: 'number'  },
    { id: 'tot_hhd',           label: 'Total Households',               unit: 'households', format: 'number'  },
    { id: 'bpl_pct',           label: 'BPL Card Coverage',              unit: '% of HH',    format: 'percent' },
    { id: 'farm_hhd_pct',      label: 'Farm Household Share',           unit: '% of HH',    format: 'percent' },
    { id: 'kuccha_pct',        label: 'Kutcha Housing',                 unit: '% of HH',    format: 'percent' },
    { id: 'no_toilet_pct',     label: 'Households Without Sanitation',  unit: '% of HH',    format: 'percent' },
    { id: 'clean_energy_pct',  label: 'Clean Energy Coverage',         unit: '% of HH',    format: 'percent' },
    { id: 'pmjdy_pct',         label: 'PMJDY Bank Account Coverage',   unit: '% of HH',    format: 'percent' },
    { id: 'shg_total',         label: 'Total Self-Help Groups',         unit: 'SHGs',       format: 'number'  },
    { id: 'shg_mobilized_pct', label: 'SHG Mobilisation Rate',         unit: '% of HH',    format: 'percent' },
    { id: 'pmuy_pct',          label: 'PMUY (Ujjwala) Coverage',        unit: '% of HH',    format: 'percent' },
  ],
};

const COLOR_SCALES = {
  pca:      ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
  ec:       ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#8c2d04'],
  rbi:      ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
  antyodaya:['#fff7f3', '#fcc5c0', '#f768a1', '#ae017e', '#49006a'],
};

function getScale(moduleId) {
  if (moduleId.startsWith('pca'))     return COLOR_SCALES.pca;
  if (moduleId.startsWith('ec'))      return COLOR_SCALES.ec;
  if (moduleId === 'antyodaya')       return COLOR_SCALES.antyodaya;
  return COLOR_SCALES.rbi;
}

function fmtVal(val, format) {
  if (val === undefined || val === null || val === 0) return '—';
  if (format === 'percent') return `${Number(val).toFixed(1)}%`;
  if (val >= 1e7) return `${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `${(val / 1e5).toFixed(1)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return String(Math.round(val));
}

export default function ShrugReport({ onBack }) {
  const mapContainer = useRef(null);
  const map          = useRef(null);

  const [mapReady,       setMapReady]       = useState(false);
  const [activeModule,   setActiveModule]   = useState('pca11');
  const [activeIndicator,setActiveIndicator]= useState('tot_p');
  const [selectedState,  setSelectedState]  = useState(null);
  const [tooltip,        setTooltip]        = useState(null);

  const moduleData = (shrugStateData[activeModule]   || {});
  const distData   = (shrugDistrictData[activeModule] || {});
  const indicators = INDICATORS[activeModule] || [];
  const indDef     = indicators.find(i => i.id === activeIndicator) || indicators[0];

  const rankedStates = useMemo(() => (
    Object.entries(moduleData)
      .map(([name, d]) => ({ name, value: d[activeIndicator] ?? 0 }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value)
  ), [moduleData, activeIndicator]);

  const maxVal = rankedStates.length > 0 ? rankedStates[0].value : 1;

  const selectedStateId = selectedState ? STATE_ID_MAP[selectedState] : null;
  const rankedDistricts = useMemo(() => {
    if (!selectedStateId) return [];
    return [...(distData[selectedStateId] || [])]
      .map(d => ({ ...d, value: d[activeIndicator] ?? 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [distData, selectedStateId, activeIndicator]);

  const maxDistVal = rankedDistricts.length > 0 ? rankedDistricts[0].value : 1;

  // Initialise Mapbox once
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [80, 22],
      zoom: 3.8,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.current.on('load', () => setMapReady(true));
    return () => {
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  // Update choropleth when module / indicator / data changes
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const colors   = getScale(activeModule);
    const topVal   = rankedStates.length > 0 ? rankedStates[0].value : 1;

    const geojson = {
      type: 'FeatureCollection',
      features: indiaMicesData.features.map((f, idx) => ({
        ...f,
        id: idx,
        properties: {
          ...f.properties,
          _val: moduleData[toShrugName(f.properties.NAME_1)]?.[activeIndicator] ?? 0,
        },
      })),
    };

    const colorExpr = [
      'interpolate', ['linear'], ['coalesce', ['get', '_val'], 0],
      0,             colors[0],
      topVal * 0.01, colors[0],
      topVal * 0.25, colors[1],
      topVal * 0.5,  colors[2],
      topVal * 0.75, colors[3],
      topVal,        colors[4],
    ];

    if (map.current.getSource('shrug-states')) {
      map.current.getSource('shrug-states').setData(geojson);
      map.current.setPaintProperty('shrug-fill', 'fill-color', colorExpr);
    } else {
      map.current.addSource('shrug-states', { type: 'geojson', data: geojson });

      map.current.addLayer({
        id: 'shrug-fill', type: 'fill', source: 'shrug-states',
        paint: { 'fill-color': colorExpr, 'fill-opacity': 0.82 },
      });
      map.current.addLayer({
        id: 'shrug-borders', type: 'line', source: 'shrug-states',
        paint: { 'line-color': '#ffffff', 'line-width': 0.7 },
      });
      // Highlight layer for selected state
      map.current.addLayer({
        id: 'shrug-selected', type: 'line', source: 'shrug-states',
        filter: ['==', ['get', 'NAME_1'], ''],
        paint: { 'line-color': '#f59e0b', 'line-width': 3 },
      });

      map.current.on('mousemove', 'shrug-fill', (e) => {
        if (!e.features.length) return;
        map.current.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        setTooltip({ x: e.point.x, y: e.point.y, name: p.NAME_1, value: p._val });
      });
      map.current.on('mouseleave', 'shrug-fill', () => {
        map.current.getCanvas().style.cursor = '';
        setTooltip(null);
      });
      map.current.on('click', 'shrug-fill', (e) => {
        if (e.features.length) setSelectedState(toShrugName(e.features[0].properties.NAME_1));
      });
    }
  }, [mapReady, activeModule, activeIndicator, moduleData, rankedStates]);

  // Update selected-state highlight filter
  useEffect(() => {
    if (!mapReady || !map.current || !map.current.getLayer('shrug-selected')) return;
    map.current.setFilter('shrug-selected', ['==', ['get', 'NAME_1'], toGeoName(selectedState || '')]);
  }, [selectedState, mapReady]);

  const handleModuleChange = (id) => {
    setActiveModule(id);
    setActiveIndicator(INDICATORS[id][0].id);
    setSelectedState(null);
  };

  const summaryStats = useMemo(() => {
    if (rankedStates.length === 0) return null;
    const vals = rankedStates.map(s => s.value);
    const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { max: vals[0], min: vals[vals.length - 1], avg, topName: rankedStates[0].name, botName: rankedStates[rankedStates.length - 1].name };
  }, [rankedStates]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white border-b px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Back to main map">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">SHRUG Dev Lab Data</h1>
          <p className="text-xs text-gray-500">GeoMNREGA Research Lab</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
          <Database className="w-3.5 h-3.5" />
          <span>Village → District · 1991–2013</span>
        </div>
        <button
          onClick={() => {
            const indLabel = indDef?.label || activeIndicator;
            if (selectedState && rankedDistricts.length > 0) {
              const rows = rankedDistricts.map(d => ({ state: selectedState, district: d.district_name || d.district || '', [indLabel]: d.value }));
              downloadCSV(rows, `SHRUG_${selectedState}_${activeModule}_${activeIndicator}`, ['state', 'district', indLabel]);
            } else {
              const rows = rankedStates.map(s => ({ state: s.name, [indLabel]: s.value }));
              downloadCSV(rows, `SHRUG_${activeModule}_${activeIndicator}`, ['state', indLabel]);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors shrink-0"
        >
          <FileText className="w-3.5 h-3.5" /> Export Data
        </button>
        <button
          onClick={() => {
            const indLabel = indDef?.label || activeIndicator;
            const moduleLabel = MODULES.find(m => m.id === activeModule)?.label || activeModule;
            const isSt = selectedState && rankedDistricts.length > 0;
            const rows = isSt
              ? rankedDistricts.map(d => ({ State: selectedState, District: d.district_name || d.district || '', [indLabel]: d.value }))
              : rankedStates.map(s => ({ State: s.name, [indLabel]: s.value }));
            exportReport({
              title: isSt ? `${selectedState} — ${moduleLabel}` : `India — ${moduleLabel}`,
              subtitle: `${indLabel} · SHRUG Dev Lab Data`,
              stats: summaryStats ? [
                { label: 'Highest', value: summaryStats.max?.toLocaleString() },
                { label: 'Lowest', value: summaryStats.min?.toLocaleString() },
                { label: 'Average', value: Math.round(summaryStats.avg)?.toLocaleString() },
                { label: 'States', value: rankedStates.length },
              ] : [],
              tableRows: rows,
              tableColumns: isSt ? ['State', 'District', indLabel] : ['State', indLabel],
              filename: `SHRUG_Report_${activeModule}_${activeIndicator}`,
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5" /> Export Report
        </button>
        <button
          onClick={() => exportScreenshot('GeoMNREGA_SHRUG')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" /> Export Map
        </button>
      </header>

      {/* ── Module Tabs ── */}
      <div className="bg-white border-b shrink-0 px-6 flex gap-0.5 overflow-x-auto">
        {MODULES.map(m => (
          <button
            key={m.id}
            onClick={() => handleModuleChange(m.id)}
            title={m.desc}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t border-b-2 transition-colors ${
              activeModule === m.id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map Panel */}
        <div className="relative flex-1">
          <div ref={mapContainer} className="w-full h-full" />

          {/* Indicator selector */}
          <div className="absolute top-4 left-4 bg-white/95 shadow-lg rounded-xl p-3 z-10 min-w-[220px] border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Indicator</p>
            <select
              value={activeIndicator}
              onChange={e => setActiveIndicator(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400"
            >
              {indicators.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.label}</option>
              ))}
            </select>
            {selectedState && (
              <button
                onClick={() => setSelectedState(null)}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                ← All states
              </button>
            )}
          </div>

          {/* Color legend */}
          {rankedStates.length > 0 && (
            <div className="absolute bottom-8 left-4 bg-white/95 rounded-xl shadow p-3 border border-gray-100 z-10">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 truncate max-w-[140px]">
                {indDef?.label}
              </p>
              <div className="flex gap-px">
                {getScale(activeModule).map((c, i) => (
                  <div key={i} style={{ backgroundColor: c }}
                    className="w-8 h-3 first:rounded-l last:rounded-r" />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">Low</span>
                <span className="text-[10px] text-gray-400">High</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Max: {fmtVal(maxVal, indDef?.format)}</p>
            </div>
          )}

          {/* Hover tooltip */}
          {tooltip && (
            <div
              className="absolute z-20 bg-white shadow-xl rounded-lg p-2.5 pointer-events-none text-xs border border-gray-100"
              style={{ left: tooltip.x + 14, top: Math.max(8, tooltip.y - 60), maxWidth: 210 }}
            >
              <p className="font-bold text-gray-800 truncate">{tooltip.name}</p>
              <p className="text-gray-500 mt-0.5">
                {indDef?.label}:{' '}
                <span className="font-semibold text-blue-600">{fmtVal(tooltip.value, indDef?.format)}</span>
              </p>
              <p className="text-gray-400 text-[10px] mt-0.5">Click to drill into districts →</p>
            </div>
          )}
        </div>

        {/* ── Right Data Panel ── */}
        <div className="w-[400px] bg-white border-l flex flex-col overflow-hidden shrink-0">

          {/* Panel header */}
          <div className="px-5 py-3.5 border-b bg-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-gray-800 text-sm truncate">
                  {selectedState
                    ? <>{selectedState} <ChevronRight className="w-3 h-3 text-gray-400 inline" /> Districts</>
                    : 'State Rankings'}
                </span>
              </div>
              {selectedState && (
                <button onClick={() => setSelectedState(null)} className="text-xs text-blue-600 hover:underline shrink-0 ml-2">
                  ← All States
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {indDef?.label} · {MODULES.find(m => m.id === activeModule)?.desc}
            </p>
          </div>

          {/* Summary stats (state view only) */}
          {!selectedState && summaryStats && (
            <div className="grid grid-cols-3 divide-x text-center py-3 border-b shrink-0">
              <div className="px-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Highest</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtVal(summaryStats.max, indDef?.format)}</p>
                <p className="text-[10px] text-gray-400 truncate">{summaryStats.topName}</p>
              </div>
              <div className="px-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Average</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtVal(summaryStats.avg, indDef?.format)}</p>
                <p className="text-[10px] text-gray-400">{rankedStates.length} states</p>
              </div>
              <div className="px-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Lowest</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{fmtVal(summaryStats.min, indDef?.format)}</p>
                <p className="text-[10px] text-gray-400 truncate">{summaryStats.botName}</p>
              </div>
            </div>
          )}

          {/* Ranked table */}
          <div className="flex-1 overflow-y-auto">
            {selectedState ? (
              rankedDistricts.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-semibold w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">District</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 font-semibold">Value</th>
                      <th className="px-3 py-2.5 text-gray-500 font-semibold w-20 text-center">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedDistricts.map((d, i) => (
                      <tr key={d.dist_id} className="border-b hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-2 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-700">District {d.dist_id}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-600">{fmtVal(d.value, indDef?.format)}</td>
                        <td className="px-3 py-2">
                          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(100, (d.value / maxDistVal) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                  <Info className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">No district data available</p>
                  <p className="text-xs text-gray-400">
                    This state/module combination may not have district-level records in SHRUG.
                  </p>
                </div>
              )
            ) : (
              rankedStates.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-semibold w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">State / UT</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 font-semibold">Value</th>
                      <th className="px-3 py-2.5 text-gray-500 font-semibold w-20 text-center">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedStates.map((s, i) => (
                      <tr
                        key={s.name}
                        onClick={() => setSelectedState(s.name)}
                        className={`border-b cursor-pointer transition-colors ${
                          selectedState === s.name ? 'bg-blue-50' : 'hover:bg-blue-50'
                        }`}
                      >
                        <td className="px-4 py-2 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-700">{s.name}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-600">{fmtVal(s.value, indDef?.format)}</td>
                        <td className="px-3 py-2">
                          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(100, (s.value / maxVal) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                  <Database className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-600 font-medium">Data not yet processed</p>
                  <p className="text-xs text-gray-400">
                    Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">npm run dev</code> to
                    auto-process all SHRUG datasets.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Attribution footer */}
          <div className="px-4 py-2 border-t bg-gray-50 shrink-0">
            <p className="text-[10px] text-gray-400 text-center">
              Source: Development Data Lab · SHRUG v2.0 · CC BY-NC-SA 4.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
