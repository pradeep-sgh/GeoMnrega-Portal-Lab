import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const TOUR_STEPS = [
  {
    title: 'Welcome',
    desc: 'Welcome to the GeoMNREGA Research Portal — your interactive platform for exploring NREGA, MICES, and SHRUG datasets across India. Click Next or press the right arrow key to begin the tour.',
    highlight: null,
  },
  {
    title: 'Dataset Panel',
    desc: 'This left panel lets you choose which dataset to visualize on the map. Switch between GeoMNREGA, NREGA demand & employment, MICES water schemes, SHRUG Dev Lab Data, and more.',
    highlight: 'sidebar',
  },
  {
    title: 'Financial Year',
    desc: 'Use this selector to pick the financial year for NREGA reports. The map and all statistics update automatically when you change the year.',
    highlight: 'year',
  },
  {
    title: 'India Map',
    desc: 'The main choropleth map colors states by the selected indicator. Hover to see values in a tooltip. Click any state to drill down into district-level data.',
    highlight: 'map',
  },
  {
    title: 'Legend',
    desc: 'The legend shows the color scale for the currently selected indicator. It updates automatically when you switch datasets or years.',
    highlight: 'legend',
  },
  {
    title: 'State Dashboard',
    desc: 'After clicking a state, a dashboard appears with key statistics and a mini district map. Hit "Expand Report" for a full-screen district-level breakdown.',
    highlight: 'map',
  },
  {
    title: 'SHRUG Dev Lab Data',
    desc: 'Find historical census and economic data (1991–2013) under the SHRUG entry in the sidebar. It opens a full-screen explorer with state and district rankings.',
    highlight: 'sidebar',
  },
  {
    title: "You're all set",
    desc: 'You now know the key features of the GeoMNREGA Research Portal. Start by selecting a dataset from the sidebar and clicking a state to explore the data.',
    highlight: null,
  },
];

export default function PortalTour({ step, onNext, onBack, onClose }) {
  const s = TOUR_STEPS[step] || TOUR_STEPS[0];
  const total = TOUR_STEPS.length;
  const isLast = step === total - 1;

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') isLast ? onClose() : onNext();
      if (e.key === 'ArrowLeft' && step > 0) onBack();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, isLast, onNext, onBack, onClose]);

  return (
    <>
      {/* Dimming backdrop — z-[140], sits BELOW highlighted elements at z-[150] */}
      <div
        className="fixed inset-0 z-[140] bg-black/45 pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal — z-[160], sits ABOVE the highlighted element */}
      <div className="fixed inset-0 z-[160] flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-6 pointer-events-auto relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <h2 className="text-lg font-bold text-gray-900 mb-3 pr-8">{s.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{s.desc}</p>

          {/* Step dots */}
          <div className="flex justify-center items-center gap-1.5 mb-5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 h-2 bg-teal-500' : 'w-2 h-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              disabled={step === 0}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={isLast ? onClose : onNext}
              className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 transition-colors shadow-sm"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>

);
}
