import React, { useState } from 'react';
import { Info, Compass, Download, Map as MapIcon, HelpCircle, BookOpen } from 'lucide-react';

export default function Sidebar({ dataset, setDataset, year, setYear, onStartTour, tourHighlight, onExportMap, onOpenFAQ, onOpenAbout }) {
  const [activeCategory, setActiveCategory] = useState('mnrega');

  const categories = [
    {
      id: 'mgnrega-ponds',
      name: 'MGNREGA Farm Ponds',
      variables: [
        { id: 'bhuvan-ponds', name: 'Farm Ponds (Bhuvan Portal)' }
      ]
    },
    {
      id: 'climate-environment',
      name: 'Climate & Environment',
      variables: [
        { id: 'era5-evaporation', name: 'Evaporation' },
        { id: 'era5-precipitation', name: 'Total Precipitation' },
        { id: 'era5-soil-temp-1', name: 'Soil Temperature (Level 1)' },
        { id: 'era5-soil-temp-4', name: 'Soil Temperature (Level 4)' }
      ]
    },
    {
      id: 'rural-infra',
      name: 'Rural Infrastructure (PMGSY)',
      variables: [
        { id: 'pmgsy-facilities', name: 'Facilities' },
        { id: 'pmgsy-habitation', name: 'Habitation' },
        { id: 'pmgsy-roads', name: 'Roads (Candidates / DRRP)' },
        { id: 'pmgsy-tourist', name: 'Tourist Places' }
      ]
    },
    {
      id: 'admin-boundaries',
      name: 'Administrative Boundaries',
      variables: [
        { id: 'gramchitra-gp', name: 'Gram Panchayat Boundaries' },
        { id: 'ind-subdistrict', name: 'Subdistrict Boundaries' },
        { id: 'ind-district', name: 'District Boundaries' }
      ]
    },
    {
      id: 'water-infra',
      name: 'Water Infrastructure (MICES)',
      variables: [
        { id: 'mices_dugwell', name: 'Dugwell Schemes' },
        { id: 'mices_shallow_tubewell', name: 'Shallow Tubewell Schemes' },
        { id: 'mices_medium_tubewell', name: 'Medium Tubewell Schemes' },
        { id: 'mices_deep_tubewell', name: 'Deep Tubewell Schemes' },
        { id: 'mices_surface_flow_scheme', name: 'Surface Flow Schemes' },
        { id: 'mices_surface_lift_scheme', name: 'Surface Lift Schemes' },
        { id: 'mices_total_water_scheme', name: 'Total Water Schemes' }
      ]
    },
    {
      id: 'nrega-reports',
      name: 'NREGA Socio-Economic Reports',
      variables: [
        { id: 'nrega_demand', name: 'Total Work Demand' },
        { id: 'nrega_employment_total', name: 'Total Households Employed' },
        { id: 'nrega_women_employment', name: 'Women Employed' },
        { id: 'nrega_persondays_total', name: 'Total Person-Days Generated' }
      ]
    },
    {
      id: 'land-use',
      name: 'Land Use & Environment (NICES)',
      variables: [
        { id: 'nices-cropland', name: 'Annual Cropland' },
        { id: 'nices-forest-class', name: 'Forest Class & Cover' },
        { id: 'nices-soil-carbon', name: 'Soil Carbon Content' },
        { id: 'nices-soil-moisture', name: 'Soil Moisture & Depth' }
      ]
    },
    {
      id: 'lulc-data',
      name: 'LULC Data (1:250K)',
      variables: [
        { id: 'lulc-2005', name: 'LULC 2005-06 Analysis' },
        { id: 'lulc-2009', name: 'LULC 2009-10 Analysis' },
        { id: 'lulc-2015', name: 'LULC 2015-16 Analysis' }
      ]
    },
    {
      id: 'shrug-devlab',
      name: 'SHRUG Dev Lab Data',
      variables: [
        { id: 'shrug-open', name: 'Open SHRUG Explorer →' }
      ]
    }
  ];

  return (
    <div className={`w-[380px] h-screen flex flex-col bg-[#1a2b3c] text-white shadow-xl flex-shrink-0 transition-all duration-300 ${
      tourHighlight === 'sidebar' || tourHighlight === 'year'
        ? 'z-[150] ring-4 ring-teal-400 ring-inset'
        : 'z-20'
    }`}>
      {/* Top Navigation Wrapper */}
      <div className="bg-[#f8f9fa] text-[#1a2b3c] flex flex-col border-b border-gray-300">
        <div className="p-4 flex items-center gap-2 border-b border-gray-200">
          <MapIcon className="w-6 h-6 text-[#007bff]" />
          <h1 className="text-xl font-bold tracking-tight">GeoMNREGA Research Portal</h1>
        </div>
      </div>

      {/* Accordion Control Panel */}
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        {categories.map((category) => (
          <div key={category.id} className="border-b border-gray-700">
            <button
              onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
              className="w-full text-left p-4 hover:bg-gray-800 transition-colors flex justify-between items-center"
            >
              <span className="font-semibold text-sm">{category.name}</span>
              <span className="text-gray-400 text-xl font-light">
                {activeCategory === category.id ? '−' : '+'}
              </span>
            </button>
            
            {activeCategory === category.id && (
              <div className="bg-gray-900 overflow-hidden">
                {category.variables.map((variable) => (
                  <button
                    key={variable.id}
                    onClick={() => setDataset(variable.id)}
                    className={`w-full text-left px-5 py-3 text-sm flex justify-between items-center transition-colors ${
                      dataset === variable.id 
                        ? 'bg-[#e1f5fe] text-[#007bff] font-bold border-l-4 border-[#007bff]' 
                        : 'text-gray-300 hover:bg-gray-800 border-l-4 border-transparent'
                    }`}
                  >
                    <span>{variable.name}</span>
                    <Info className="w-4 h-4 text-gray-500 hover:text-[#007bff]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Year Selector — only relevant for NREGA (MICES has no year-specific data) */}
        {(dataset?.startsWith('nrega_') || activeCategory === 'nrega-reports') && (
        <div className={`border-b border-gray-700 p-4 transition-all duration-300 ${tourHighlight === 'year' ? 'ring-2 ring-teal-400 ring-inset bg-gray-800/50 rounded' : ''}`}>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Financial Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-[#007bff]"
          >
            {['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023'].map(y => (
              <option key={y} value={y}>{y}–{String(parseInt(y)+1).slice(2)}</option>
            ))}
          </select>
        </div>
        )}
      </div>

      {/* Footer Utility Bar */}
      <div className="bg-[#aee6e6] text-[#1a2b3c] py-3 px-2 flex justify-evenly items-center text-xs font-semibold mt-auto">
        <button onClick={() => onOpenAbout && onOpenAbout()} className="flex flex-col items-center gap-1 hover:text-[#007bff] transition-colors flex-1 text-center">
          <Info className="w-5 h-5" />
          <span>About</span>
        </button>
        <button
          onClick={() => onOpenFAQ && onOpenFAQ()}
          className="flex flex-col items-center gap-1 hover:text-[#007bff] transition-colors flex-1 text-center"
        >
          <HelpCircle className="w-5 h-5" />
          <span>FAQ</span>
        </button>
        <button
          onClick={onStartTour}
          className="flex flex-col items-center gap-1 hover:text-[#007bff] transition-colors flex-1 text-center"
        >
          <Compass className="w-5 h-5" />
          <span>Tour</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:text-[#007bff] transition-colors flex-1 text-center">
          <BookOpen className="w-5 h-5" />
          <span>Docs</span>
        </button>
        <button onClick={onExportMap} className="flex flex-col items-center gap-1 hover:text-[#007bff] transition-colors flex-1 text-center">
          <Download className="w-5 h-5" />
          <span>Export Map</span>
        </button>
      </div>
    </div>
  );
}
