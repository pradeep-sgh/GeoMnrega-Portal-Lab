import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function AboutModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

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
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* IIIT Delhi style logo mark */}
            <div className="flex items-end gap-0.5">
              <div className="w-1.5 h-5 bg-[#1a2b3c] rounded-sm" />
              <div className="w-1.5 h-7 bg-[#007bff] rounded-sm" />
              <div className="w-1.5 h-4 bg-[#1a2b3c] rounded-sm" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium tracking-wide uppercase">IIIT Delhi · ECO Lab</div>
              <div className="text-lg font-bold text-[#1a2b3c] leading-tight">GeoMNREGA Research Portal</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-[#1a2b3c]">About the Portal</h2>

          <p>
            The <strong>GeoMNREGA Research Portal</strong> is an open interactive geospatial platform developed
            at the <strong>Indraprastha Institute of Information Technology Delhi (IIIT Delhi)</strong> under
            the <strong>ECO Lab</strong>. The portal brings together multiple layers of India's rural
            development, socioeconomic, and environmental data and presents them on an interactive choropleth
            map at the state and district level.
          </p>

          <p>
            The portal currently integrates data from: MGNREGA employment and work-demand statistics
            (disaggregated by SC/ST households), MICES water-infrastructure scheme counts, SHRUG
            socioeconomic indicators (Population Census 1991/2001/2011, Economic Census 2005/2013, RBI
            Banking), ERA5 climate layers, PMGSY rural infrastructure, and LULC/NICES land-use datasets.
            Each variable is selectable from the dataset accordion in the left sidebar, and data is shown at
            both the state and district level. Click any state on the India map to drill into a district-level
            view.
          </p>

          <p>
            The purpose of this platform is to <strong>democratise access</strong> to high-resolution rural
            development data for researchers, policymakers, students, and the general public. All underlying
            datasets used on this portal are either published by the Government of India under its open-data
            policy or made available by partner research organisations for academic use.
          </p>

          <p>
            For an interactive walkthrough of the portal's features, click the <strong>Tour</strong> button
            in the sidebar footer. To download the currently displayed dataset as a CSV or generate a
            printable HTML report, use the <strong>Export</strong> buttons available on each page.
          </p>

          <p>
            This portal is a work in progress. The underlying data are sourced from government MIS systems
            and research repositories; we have corrected obvious errors but some data may still be
            inaccurate. <strong>Use at your own discretion.</strong> We are continually working to improve
            geographic name-matching coverage and add new datasets.
          </p>

          <p>
            To reach out with questions, data corrections, or collaboration inquiries, please contact the
            ECO Lab at IIIT Delhi.{' '}
            <a
              href="mailto:ecolab@iiitd.ac.in"
              className="text-[#007bff] underline hover:text-blue-800"
            >
              ecolab@iiitd.ac.in
            </a>
          </p>

          {/* Credits */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-[#1a2b3c] mb-2">Data Sources & Acknowledgements</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Ministry of Rural Development, Govt. of India — MGNREGA MIS</li>
              <li>Ministry of Jal Shakti — MICES Water Infrastructure</li>
              <li>Development Data Lab — SHRUG (Socioeconomic High-Resolution Rural-Urban Geographic)</li>
              <li>European Centre for Medium-Range Weather Forecasts — ERA5 Climate Reanalysis</li>
              <li>Ministry of Rural Development — PMGSY Rural Infrastructure</li>
              <li>National Remote Sensing Centre (ISRO) — LULC / NICES Land Use</li>
              <li>Survey of India / MapmyIndia — Administrative Boundary GeoJSON</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 flex justify-between items-center">
          <span>IIIT Delhi · ECO Lab · GeoMNREGA Research Portal</span>
          <span>Press Esc or click outside to close</span>
        </div>
      </div>
    </div>
  );
}
