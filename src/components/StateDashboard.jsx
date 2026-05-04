import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Map as MapIcon } from 'lucide-react';
import MiniMap from './MiniMap';
import { loadDistrictData, getDistrictDataSync } from '../data/districtDataLoader';

export default function StateDashboard({ stateData, dataset, year, onClose, onExpand }) {
  const [indiaMicesDistrictData, setIndiaMicesDistrictData] = useState(() => getDistrictDataSync());

  useEffect(() => {
    loadDistrictData().then(data => setIndiaMicesDistrictData(prev => prev || data));
  }, []);

  if (!stateData) return null;

  const stateName = stateData.NAME_1 || 'Unknown State';

  const datasetTitles = {
    'nrega_demand': 'Total Work Demand',
    'nrega_employment_total': 'Total Households Employed',
    'nrega_women_employment': 'Women Employed',
    'nrega_persondays_total': 'Total Person-Days Generated',
    'mices_dugwell': 'Dugwell Schemes',
    'mices_shallow_tubewell': 'Shallow Tubewell Schemes',
    'mices_medium_tubewell': 'Medium Tubewell Schemes',
    'mices_deep_tubewell': 'Deep Tubewell Schemes',
    'mices_surface_flow_scheme': 'Surface Flow Schemes',
    'mices_surface_lift_scheme': 'Surface Lift Schemes',
    'mices_total_water_scheme': 'Total Water Schemes',
  };

  const displayDatasetName = datasetTitles[dataset] ||
    (dataset || '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // ── Real data from districts ──────────────────────────────────────────────
  const distYearKey = dataset?.startsWith('nrega_') && year ? `${dataset}_${year}` : dataset;
  const stateFeatures = indiaMicesDistrictData?.features?.filter(
    f => f.properties.NAME_1 === stateName
  ) || [];

  // State-level totals from stateData (from india_mices.json — always has full MICES + NREGA)
  // NREGA must use year-specific key; bare key = latest year only
  const stateSchemeVal = dataset?.startsWith('nrega_') && year
    ? Number(stateData?.[`${dataset}_${year}`]) || 0
    : Number(stateData?.[dataset]) || 0;
  const stateTotalSchemes = Number(stateData?.['mices_total_water_scheme']) || 1;

  /**
   * Get effective district value:
   * - NREGA: use embedded year-key or base key (populated after running process_all_nrega.py)
   * - MICES individual schemes (not total): proportionally distribute state total via
   *   district's share of mices_total_water_scheme
   * - MICES total: use direct district value
   */
  const getDistrictValue = (p) => {
    const raw = p[distYearKey] ?? p[dataset];
    const num = typeof raw === 'number' ? raw : (raw !== undefined && raw !== null ? parseFloat(raw) || 0 : null);
    if (num !== null && num > 0) return num;

    // MICES individual scheme proportional fallback
    if (dataset?.startsWith('mices_') && dataset !== 'mices_total_water_scheme') {
      const distTotal = Number(p['mices_total_water_scheme']) || 0;
      if (distTotal > 0 && stateSchemeVal > 0) {
        return (distTotal / stateTotalSchemes) * stateSchemeVal;
      }
    }
    return 0;
  };

  let totalVal = 0, maxVal = 0, minVal = Infinity;
  let scTotal = 0, stTotal = 0, womenTotal = 0, jobcardsTotal = 0, families100 = 0;
  let topDistrict = { name: '—', val: 0 };

  stateFeatures.forEach(f => {
    const p = f.properties;
    const val = getDistrictValue(p);
    totalVal += val;
    if (val > maxVal) { maxVal = val; topDistrict = { name: p.NAME_2 || '—', val: Math.round(val) }; }
    if (val > 0 && val < minVal) minVal = val;

    // SC / ST / Women / Jobcards / 100-days — real fields embedded by process_all_nrega.py
    scTotal       += Number(p[`nrega_employment_sc_${year}`]    ?? p['nrega_employment_sc']    ?? 0);
    stTotal       += Number(p[`nrega_employment_st_${year}`]    ?? p['nrega_employment_st']    ?? 0);
    womenTotal    += Number(p[`nrega_women_employment_${year}`] ?? p['nrega_women_employment'] ?? 0);
    jobcardsTotal += Number(p[`nrega_jobcards_total_${year}`]   ?? p['nrega_jobcards_total']   ?? 0);
    families100   += Number(p[`nrega_families_100days_${year}`] ?? p['nrega_families_100days'] ?? 0);
  });

  // NREGA district data may be absent (needs process_all_nrega.py to have been run)
  // Fall back to state-level NREGA values from stateData so KPIs are never blank
  const hasDistrictData = totalVal > 0;
  const isNregaDataset  = dataset?.startsWith('nrega_');

  if (!hasDistrictData && isNregaDataset) {
    // Use state-level aggregate from stateData
    totalVal = stateSchemeVal;
    maxVal   = stateSchemeVal;
    // SC/ST/Women from stateData when not embedded at district level
    if (scTotal === 0) scTotal = Number(stateData?.[`nrega_employment_sc_${year}`] ?? stateData?.['nrega_employment_sc'] ?? 0);
    if (stTotal === 0) stTotal = Number(stateData?.[`nrega_employment_st_${year}`] ?? stateData?.['nrega_employment_st'] ?? 0);
    if (womenTotal === 0) womenTotal = Number(stateData?.[`nrega_women_employment_${year}`] ?? stateData?.['nrega_women_employment'] ?? 0);
    if (jobcardsTotal === 0) jobcardsTotal = Number(stateData?.[`nrega_jobcards_total_${year}`] ?? stateData?.['nrega_jobcards_total'] ?? 0);
    if (families100 === 0) families100 = Number(stateData?.[`nrega_families_100days_${year}`] ?? stateData?.['nrega_families_100days'] ?? 0);
  }

  // For MICES datasets, use the authoritative state-level value directly (proportional sum is fractional)
  if (dataset?.startsWith('mices_')) {
    totalVal = Math.round(stateSchemeVal);
    maxVal   = Math.round(maxVal);
  }

  if (maxVal === 0) maxVal = 1;
  if (minVal === Infinity) minVal = 0;
  totalVal = Math.round(totalVal);
  maxVal   = Math.round(maxVal);
  const avgVal = stateFeatures.length ? Math.round(totalVal / stateFeatures.length) : 0;

  // Count districts above 75% of max
  const highDistCount = stateFeatures.filter(f => getDistrictValue(f.properties) >= maxVal * 0.75).length;
  const highDistPct = stateFeatures.length
    ? Math.round((highDistCount / stateFeatures.length) * 100)
    : 0;

  // Women participation %
  const empTotal = isNregaDataset
    ? (hasDistrictData
        ? stateFeatures.reduce((s, f) => s + Number(f.properties[`nrega_employment_total_${year}`] ?? f.properties['nrega_employment_total'] ?? 0), 0)
        : Number(stateData?.[`nrega_employment_total_${year}`] ?? stateData?.['nrega_employment_total'] ?? 0))
    : 0;
  const womenPct = empTotal > 0 ? Math.round((womenTotal / empTotal) * 100) : 0;

  // ── KPI card values per dataset type ─────────────────────────────────────
  let kpi1Val, kpi1Label, kpi2Val, kpi2Label, kpi3Val, kpi3Label, kpi4Val, kpi4Label;

  if (dataset?.startsWith('nrega_')) {
    kpi1Val   = totalVal;          kpi1Label = displayDatasetName;
    kpi2Val   = womenTotal;        kpi2Label = 'Women Employed';
    kpi3Val   = scTotal + stTotal; kpi3Label = 'SC + ST Employed';
    kpi4Val   = `${womenPct}%`;    kpi4Label = 'Women Participation';
  } else if (dataset?.startsWith('mices_')) {
    kpi1Val   = totalVal;                            kpi1Label = 'Total Schemes';
    kpi2Val   = stateFeatures.length;               kpi2Label = 'Districts Covered';
    kpi3Val   = Math.round(maxVal);                 kpi3Label = 'Max (Single District)';
    kpi4Val   = avgVal;                             kpi4Label = 'Avg per District';
  } else {
    kpi1Val   = totalVal;   kpi1Label = 'Total';
    kpi2Val   = avgVal;     kpi2Label = 'Average';
    kpi3Val   = maxVal;     kpi3Label = 'Maximum';
    kpi4Val   = minVal;     kpi4Label = 'Minimum';
  }

  // ── Colors & bins ─────────────────────────────────────────────────────────
  const colors = dataset?.startsWith('nrega_demand')
    ? ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#8c2d04']
    : dataset?.startsWith('nrega_')
    ? ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b']
    : dataset?.startsWith('mices_')
    ? ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']
    : ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'];

  const bins = [0, 0, 0, 0, 0];
  stateFeatures.forEach(f => {
    const val = getDistrictValue(f.properties);
    if      (val <= maxVal * 0.1)  bins[0]++;
    else if (val <= maxVal * 0.25) bins[1]++;
    else if (val <= maxVal * 0.5)  bins[2]++;
    else if (val <= maxVal * 0.8)  bins[3]++;
    else                           bins[4]++;
  });
  const maxBinCount = Math.max(...bins, 1);

  const thresholds = [
    0,
    Math.round(maxVal * 0.1),
    Math.round(maxVal * 0.25),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.8),
  ];

  // ── Insight text based on real data ──────────────────────────────────────
  const insightLine1 = dataset?.startsWith('nrega_')
    ? `${stateName} reported ${totalVal.toLocaleString()} ${displayDatasetName.toLowerCase()} in ${year}. Women account for ${womenPct}% of employment. Top district: ${topDistrict.name} (${topDistrict.val.toLocaleString()}).`
    : dataset?.startsWith('mices_')
    ? `${stateName} has ${totalVal.toLocaleString()} total ${displayDatasetName.toLowerCase()} across ${stateFeatures.length} districts. Highest concentration in ${topDistrict.name}.`
    : `${stateName}: total value ${totalVal.toLocaleString()} across ${stateFeatures.length} districts. District average: ${avgVal.toLocaleString()}.`;

  const dataNoteNrega = isNregaDataset && !hasDistrictData
    ? 'District breakdown unavailable — showing state total. Run python process_all_nrega.py to enable district maps.'
    : null;
  const dataNoteEstimate = !isNregaDataset && dataset?.startsWith('mices_') && dataset !== 'mices_total_water_scheme'
    ? 'District values are estimated proportionally from state totals.'
    : null;

  return (
    <div
      className="absolute bottom-[2%] left-6 right-6 z-50 flex gap-4 pointer-events-none font-sans"
      style={{ animation: 'slideUpDashboard 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <button
        onClick={onClose}
        className="absolute -top-3 -right-2 bg-white hover:bg-red-50 hover:text-red-500 text-gray-500 p-2 rounded-full shadow-lg border border-gray-200 pointer-events-auto transition-all z-50 hover:scale-110 focus:outline-none"
        title="Close Dashboard"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Left Panel */}
      <div className="w-[360px] text-gray-800 bg-white rounded-md shadow-2xl border border-gray-200 pointer-events-auto flex flex-col overflow-hidden shrink-0">
        <div className="flex justify-between items-start pt-3 px-4 pb-2">
          <div className="flex-1">
            <h2 className="text-lg text-gray-900 leading-tight">
              <span className="font-bold">{stateName}</span>{' '}
              <span className="text-gray-500 font-medium text-sm">{displayDatasetName}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{isNregaDataset ? `${year}–${String(parseInt(year)+1).slice(2)} · ` : ''}{stateFeatures.length} districts</p>
          </div>
        </div>

        {/* Real data bullet points */}
        <div className="px-4 py-2.5 text-xs text-gray-800 space-y-2 border-b border-gray-100 flex-1">
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2d74b4] mt-1 shrink-0"></span>
            <p>Total {displayDatasetName}: <span className="font-semibold">{totalVal.toLocaleString()}</span></p>
          </div>
          {dataset?.startsWith('nrega_') && (
            <>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#48a688] mt-1 shrink-0"></span>
                <p>Women Employed: <span className="font-semibold">{womenTotal.toLocaleString()} ({womenPct}%)</span></p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d2b350] mt-1 shrink-0"></span>
                <p>SC + ST Beneficiaries: <span className="font-semibold">{(scTotal + stTotal).toLocaleString()}</span></p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c85458] mt-1 shrink-0"></span>
                <p>Top District: <span className="font-semibold">{topDistrict.name} ({topDistrict.val.toLocaleString()})</span></p>
              </div>
            </>
          )}
          {dataset?.startsWith('mices_') && (
            <>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#756bb1] mt-1 shrink-0"></span>
                <p>Avg per District: <span className="font-semibold">{avgVal.toLocaleString()}</span></p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#54278f] mt-1 shrink-0"></span>
                <p>Top District: <span className="font-semibold">{topDistrict.name} ({topDistrict.val.toLocaleString()})</span></p>
              </div>
            </>
          )}
        </div>

        {/* Insight box — data-driven */}
        <div className="bg-[#1a2b3c] text-white p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2 text-white">
            <Lightbulb className="w-3.5 h-3.5" />
            <h3 className="font-semibold text-sm">Data Insight</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{insightLine1}</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            {highDistCount} district{highDistCount !== 1 ? 's' : ''} ({highDistPct}%) are in the top-25% value range.
          </p>
          {(dataNoteNrega || dataNoteEstimate) && (
            <p className="text-xs text-yellow-300 mt-1.5 leading-relaxed opacity-90">
              ⚠ {dataNoteNrega || dataNoteEstimate}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
            <p className="text-[10px] text-gray-500">Source: NREGA MIS / MICES</p>
            <button
              onClick={onExpand}
              className="flex items-center gap-1.5 bg-[#2d74b4] hover:bg-[#25639a] text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors pointer-events-auto"
            >
              <MapIcon className="w-3 h-3" /> Expand Region
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col gap-3 min-w-[500px] pointer-events-auto">
        {/* Map + Legend + Bar chart */}
        <div className="bg-white rounded shadow-xl border border-gray-200 p-4 flex flex-col flex-1 min-h-[220px]">
          <div className="flex justify-between items-baseline mb-1 shrink-0">
            <h3 className="font-bold text-gray-900 text-sm">{displayDatasetName} by District{isNregaDataset ? ` — ${year}` : ''}</h3>
            <p className="text-[11px] text-gray-500">High-value districts: <span className="text-[#c85458] font-bold">{highDistCount} ({highDistPct}%)</span></p>
          </div>

          <div className="flex-1 flex items-center justify-between">
            {/* Color legend */}
            <div className="w-[160px] flex flex-col gap-2 text-[10px] text-gray-600 justify-center shrink-0 pr-1">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: c }} />
                  <span className="whitespace-nowrap">{thresholds[i]?.toLocaleString()} – {(thresholds[i+1] || maxVal)?.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* MiniMap */}
            <div className="flex-1 h-full min-h-[160px] relative overflow-hidden z-10 pointer-events-auto">
              <MiniMap stateName={stateName} dataset={dataset} year={year} stateData={stateData} />
            </div>

            {/* District distribution bar chart — real bin counts */}
            <div className="w-[140px] border-l border-gray-100 pl-6 pr-4 py-1 flex items-end gap-2 justify-center h-[130px] shrink-0 self-center">
              {bins.map((count, i) => (
                <div
                  key={i}
                  className="group relative w-6 rounded-t-sm border border-black/10 border-b-0 cursor-default"
                  style={{ backgroundColor: colors[i], height: `${Math.max(2, (count / maxBinCount) * 100)}%` }}
                >
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                    {count} district{count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
