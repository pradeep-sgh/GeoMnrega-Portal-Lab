import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: 'What is the GeoMNREGA Research Portal?',
    a: 'The GeoMNREGA Research Portal is an interactive geospatial platform for exploring India\'s rural development data. It brings together MGNREGA employment & demand statistics, MICES water infrastructure data, SHRUG socioeconomic indicators, climate layers (ERA5), and administrative boundaries — all visualised on a choropleth India map at the state and district level.'
  },
  {
    q: 'What datasets are available on this portal?',
    a: 'The portal currently hosts: (1) NREGA Socio-Economic Reports — work demand and employment data disaggregated by SC/ST; (2) Water Infrastructure (MICES) — seven scheme types including dugwell, tubewell and surface-flow schemes; (3) SHRUG Dev Lab Data — Population Census (1991/2001/2011), Economic Census (2005/2013), and RBI Banking statistics; (4) Climate & Environment — ERA5 evaporation, precipitation, and soil temperature; (5) Rural Infrastructure (PMGSY) — roads, facilities, habitations; (6) Land Use (LULC / NICES); and (7) Administrative boundaries at district and subdistrict level.'
  },
  {
    q: 'How do I explore data for a specific state?',
    a: 'Click on any state on the India map to open the State Report page. The report shows a district-level choropleth for the selected dataset, a ranked table of all districts, and summary statistics. Use the dataset accordion in the left sidebar to switch variables. Click "Back to India" to return to the national view.'
  },
  {
    q: 'What is MGNREGA and how is the data collected?',
    a: 'The Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA) guarantees 100 days of wage employment per year to rural households. The data on this portal is sourced from the Ministry of Rural Development\'s Management Information System (MIS) and covers financial years 2014–15 to 2023–24. District- and block-level figures are aggregated from individual job-card records.'
  },
  {
    q: 'What is the SHRUG Dev Lab Data?',
    a: 'SHRUG (Socioeconomic High-Resolution Rural-Urban Geographic) is a harmonised longitudinal dataset compiled by the Development Data Lab. It links multiple rounds of Population Census, Economic Census, and banking data to a consistent geographic identifier. On this portal the SHRUG explorer lets you compare indicators across states and districts over time.'
  },
  {
    q: 'How do I export data or maps?',
    a: 'Three export options are available on each page: (1) Export Map — downloads a full-page PNG screenshot of the current view; (2) Export Data / Export CSV — downloads the currently displayed table as a CSV file; (3) Export Report — generates a self-contained HTML report containing a map screenshot, summary statistics, and a data table that you can save or print to PDF.'
  },
  {
    q: 'Which financial years does the NREGA data cover?',
    a: 'The NREGA datasets currently span financial years 2014–15 through 2023–24 (ten years). Use the Financial Year selector that appears in the sidebar when the NREGA accordion is open to switch between years. Note: the Financial Year selector is only shown for NREGA datasets — other datasets like MICES do not have year-wise variants.'
  },
  {
    q: 'Why does some data show 0 or appear missing for certain states?',
    a: 'A value of 0 may mean genuine zero activity was reported in the source dataset for that state/district, or that the geographic name in the data did not match the GeoJSON boundary file (a known issue for a small number of districts). States with recently reorganised boundaries (e.g., Telangana was carved out of Andhra Pradesh in 2014) may show gaps in earlier years. Work is ongoing to improve name-matching coverage.'
  },
  {
    q: 'How do I use the Portal Tour?',
    a: 'Click "Portal Tour" in the sidebar footer. The tour walks you through each key interface element — the dataset sidebar, map, legend, state drill-down, and export tools — highlighting each area in sequence. Use the Next / Back buttons to move between steps, or click Skip Tour to exit at any time.'
  },
  {
    q: 'How accurate is the geographic matching between datasets?',
    a: 'For NREGA datasets, approximately 437 of 602 districts are matched to GeoJSON boundaries. State-level matching is around 30 of 36 states. Mismatches are mainly caused by spelling or transliteration differences between the official MIS names and the GeoJSON feature names. Improvements to the name-matching pipeline are planned.'
  },
  {
    q: 'Can I use this data for research or publications?',
    a: 'The portal is intended for research and educational use. MGNREGA data is published under the Government of India\'s open data policy. SHRUG data is provided by the Development Data Lab under its own terms of use. Please cite the original sources when using the data in publications. Export Report includes a documentation and references section to help with citations.'
  },
  {
    q: 'How do I report an error or suggest a new dataset?',
    a: 'This portal is under active development. If you notice incorrect data, a broken feature, or wish to suggest an additional dataset, please reach out to the development team through the institutional contact provided in the About section. Feedback on data quality and usability is especially welcome.'
  }
];

export default function FAQModal({ open, onClose }) {
  const [openIndex, setOpenIndex] = useState(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset expanded item when modal re-opens
  useEffect(() => { if (open) setOpenIndex(null); }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#1a2b3c]">
          <h2 className="text-xl font-bold text-white tracking-tight">GeoMNREGA Portal — FAQ</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Close FAQ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                className="w-full text-left px-6 py-4 flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-semibold text-sm text-[#1a2b3c]">{faq.q}</span>
                {openIndex === i
                  ? <ChevronUp className="w-4 h-4 text-[#007bff] flex-shrink-0 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                }
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed bg-blue-50/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 text-center">
          Click a question to expand its answer. Press Esc or click outside to close.
        </div>
      </div>
    </div>
  );
}
