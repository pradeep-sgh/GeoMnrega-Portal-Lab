import React, { useState } from 'react'
import Home from './pages/Home'
import StateReport from './pages/StateReport'
import UseCaseReport from './pages/UseCaseReport'
import ShrugReport from './pages/ShrugReport'

function App() {
  const [reportState, setReportState] = useState(null)
  const [reportDataset, setReportDataset] = useState(null)
  const [reportYear, setReportYear] = useState('2020')
  const [useCaseDataset, setUseCaseDataset] = useState(null)
  const [homeResetKey, setHomeResetKey] = useState(0)

  const handleOpenReport = (stateData, dataset, year = '2020') => {
    setReportState(stateData)
    setReportDataset(dataset)
    setReportYear(year)
  }

  const handleCloseReport = () => {
    setReportState(null)
  }

  const isHidden = reportState || useCaseDataset;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Hide the Home page visully instead of unmounting/display:none to preserve map render cache and prevent resize glitches */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Home 
          onOpenReport={handleOpenReport} 
          onOpenUseCase={(datasetId) => setUseCaseDataset(datasetId)}
          resetKey={homeResetKey}
        />
      </div>

      {/* Render the State Report over it when active */}
      {reportState && (
        <div className="absolute inset-0 z-40 bg-white">
          <StateReport 
            stateData={reportState} 
            dataset={reportDataset} 
            year={reportYear}
            onBack={handleCloseReport} 
          />
        </div>
      )}

      {/* Render SHRUG Explorer when shrug-open is selected */}
      {useCaseDataset === 'shrug-open' && (
        <div className="absolute inset-0 z-50 bg-white">
          <ShrugReport onBack={() => { setUseCaseDataset(null); setHomeResetKey(k => k + 1); }} />
        </div>
      )}

      {/* Render the Use Case Report for LULC datasets */}
      {useCaseDataset && useCaseDataset !== 'shrug-open' && (
        <div className="absolute inset-0 z-50 bg-white">
          <UseCaseReport 
            datasetId={useCaseDataset} 
            onBack={() => { setUseCaseDataset(null); setHomeResetKey(k => k + 1); }} 
          />
        </div>
      )}
    </div>
  )
}

export default App
