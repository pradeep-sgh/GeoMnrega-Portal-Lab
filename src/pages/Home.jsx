import React, { useState, useEffect } from 'react'
import { exportScreenshot } from '../components/exportScreenshot'
import Sidebar from '../components/Sidebar'
import MapView from '../components/MapView'
import Legend from '../components/Legend'
import StateDashboard from '../components/StateDashboard'
import PortalTour, { TOUR_STEPS } from '../components/PortalTour'
import FAQModal from '../components/FAQModal'
import AboutModal from '../components/AboutModal'

export default function Home({ onOpenReport, onOpenUseCase, resetKey }) {
  const [dataset, setDataset] = useState('geo-mnrega')
  const [year, setYear] = useState('2020')
  const [selectedState, setSelectedState] = useState(null)
  const [tourActive, setTourActive] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const tourHighlight = tourActive ? (TOUR_STEPS[tourStep]?.highlight || null) : null;

  const handleExportMap = () => exportScreenshot('GeoMNREGA_Map');

  // Reset state when returning from an overlay (SHRUG, LULC, etc.)
  useEffect(() => {
    if (resetKey) setSelectedState(null);
  }, [resetKey]);

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Left Sidebar Fixed Width */}
      <Sidebar
        dataset={dataset}
        setDataset={(id) => {
          if (id.startsWith('lulc-') || id === 'shrug-open') {
            setDataset(id)
            onOpenUseCase && onOpenUseCase(id)
          } else if (id.startsWith('mices_') || id.startsWith('nrega_') || id === 'geo-mnrega' || id.startsWith('era5-') || id.startsWith('pmgsy-') || id.startsWith('ind-')) {
            setDataset(id)
          } else {
            setDataset(id)
          }
        }}
        year={year}
        setYear={setYear}
        onStartTour={() => { setTourStep(0); setTourActive(true); }}
        tourHighlight={tourHighlight}
        onExportMap={handleExportMap}
        onOpenFAQ={() => setFaqOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />

      {/* Main Map Area (takes remaining width) */}
      <div className={`flex-1 relative h-full transition-all duration-300 ${
        tourHighlight === 'map' || tourHighlight === 'legend'
          ? 'z-[150] ring-4 ring-teal-400 ring-inset'
          : ''
      }`}>
        {/* Map */}
        <MapView
          dataset={dataset}
          year={year}
          onStateSelect={setSelectedState}
          selectedState={selectedState}
        />

        {/* Floating Legend Bottom Right */}
        <Legend dataset={dataset} year={year} highlighted={tourHighlight === 'legend'} />

        {/* State Dashboard Overlay */}
        <StateDashboard
          stateData={selectedState}
          dataset={dataset}
          year={year}
          onClose={() => setSelectedState(null)}
          onExpand={() => onOpenReport(selectedState, dataset, year)}
        />
      </div>

      {/* Portal Tour Modal */}
      {tourActive && (
        <PortalTour
          step={tourStep}
          onNext={() => setTourStep(s => Math.min(s + 1, TOUR_STEPS.length - 1))}
          onBack={() => setTourStep(s => Math.max(s - 1, 0))}
          onClose={() => setTourActive(false)}
        />
      )}

      {/* FAQ Modal */}
      <FAQModal open={faqOpen} onClose={() => setFaqOpen(false)} />

      {/* About Modal */}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
