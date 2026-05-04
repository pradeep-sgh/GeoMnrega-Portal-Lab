import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import indiaMicesData from '../data/mices/india_mices.json'
import { loadDistrictData, getDistrictDataSync } from '../data/districtDataLoader'



// Set your Mapbox access token here
// Get free token at: https://account.mapbox.com/auth/signin/

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
export default function MapView({ dataset, year, onStateSelect, selectedState }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')
  const currentStyleRef = useRef(mapStyle)
  const [styleLoadedTrigger, setStyleLoadedTrigger] = useState(0)
  const selectedStateIdRef = useRef(null)
  const [indiaMicesDistrictData, setIndiaMicesDistrictData] = useState(() => getDistrictDataSync())

  // Load the large district GeoJSON lazily (avoids bundling 100MB+ file)
  useEffect(() => {
    loadDistrictData().then(data => setIndiaMicesDistrictData(prev => prev || data))
  }, [])

  useEffect(() => {
    if (map.current) return // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [78, 21],
      zoom: 4.5,
      pitch: 0,
      bearing: 0,
      preserveDrawingBuffer: true,
    })

    map.current.on('error', (e) => {
      console.warn('Mapbox error event:', e)
    })

    map.current.on('render', () => {
      // render event handler
    })

    // Event listeners are bound here once
    
    // Click to select state
    map.current.on('click', 'states-fill', (e) => {
       const feature = e.features[0];
       
       if (onStateSelect) {
         // Pass both properties and the internal mapbox id so we can highlight it
         onStateSelect({ ...feature.properties, mapboxId: feature.id });
       }
    })
        
        let hoveredStateId = null;
        let hoveredDistId = null;
        
        map.current.on('mousemove', 'states-fill', (e) => {
          if (e.features.length > 0) {
            if (hoveredStateId !== null) {
              map.current.setFeatureState({ source: 'states', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = e.features[0].id;
            map.current.setFeatureState({ source: 'states', id: hoveredStateId }, { hover: true });
            
            const feature = e.features[0]
            setTooltip({
              x: e.point.x,
              y: e.point.y,
              data: feature.properties
            })
          }
        })
        
        map.current.on('mouseleave', 'states-fill', () => {
          if (hoveredStateId !== null) {
            map.current.setFeatureState({ source: 'states', id: hoveredStateId }, { hover: false });
          }
          hoveredStateId = null;
          setTooltip(null)
        })
        
        map.current.on('mousemove', 'districts-fill', (e) => {
          if (e.features.length > 0) {
            if (hoveredDistId !== null) {
              map.current.setFeatureState({ source: 'districts', id: hoveredDistId }, { hover: false });
            }
            hoveredDistId = e.features[0].id;
            map.current.setFeatureState({ source: 'districts', id: hoveredDistId }, { hover: true });

            const feature = e.features[0]
            setTooltip({
              x: e.point.x,
              y: e.point.y,
              data: feature.properties,
              isDistrict: true
            })
          }
        })
        
        map.current.on('mouseleave', 'districts-fill', () => {
          if (hoveredDistId !== null) {
            map.current.setFeatureState({ source: 'districts', id: hoveredDistId }, { hover: false });
          }
          hoveredDistId = null;
          setTooltip(null)
        })
        
    // We update the style trigger ONLY when the map is fully idle and all sources/layers are parsed
    // This fixes the bug where applying colors too early during a style switch gets wiped by WebGL
    map.current.on('idle', () => {
      if (map.current && map.current.isStyleLoaded()) {
         // Safe to apply dataset stylings
         setStyleLoadedTrigger(prev => prev + 1);
      }
    })

    return () => {
      // Cleanup is handled by Mapbox
    }
  }, []) // Empty dependency array, initializes once

  // Update map style when mapStyle state changes
  useEffect(() => {
    if (!map.current) return
        
    if (currentStyleRef.current !== mapStyle) {
       currentStyleRef.current = mapStyle;
       map.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  // Update data when dataset or year changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !indiaMicesDistrictData) return

    // Ensure all vector sources reliably exist
    if (!map.current.getSource('states')) {
      map.current.addSource('states', { type: 'geojson', data: indiaMicesData, generateId: true });
    }
    if (!map.current.getSource('districts')) {
      map.current.addSource('districts', { type: 'geojson', data: indiaMicesDistrictData, generateId: true });
    }
    
    // Ensure boundary outline layers reliably exist
    if (!map.current.getLayer('states-line')) {
      map.current.addLayer({
        id: 'states-line',
        type: 'line',
        source: 'states',
        maxzoom: 5.5,
        paint: {
          'line-color': '#000000',
          'line-width': [
            'case', 
            ['boolean', ['feature-state', 'selected'], false], 3,
            ['boolean', ['feature-state', 'hover'], false], 2.5, 
            0.5
          ],
          'line-opacity': [
            'case', 
            ['boolean', ['feature-state', 'selected'], false], 1,
            ['boolean', ['feature-state', 'hover'], false], 1, 
            0.3
          ]
        }
      });
    }
    if (!map.current.getLayer('districts-line')) {
      map.current.addLayer({
        id: 'districts-line',
        type: 'line',
        source: 'districts',
        minzoom: 5.5,
        paint: {
          'line-color': '#000000',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0.2],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.2]
        }
      });
    }

    const isNicesDataset = dataset === 'nices-cropland' || dataset === 'nices-forest'
    const isVectorDataset = dataset?.startsWith('mices_') || dataset?.startsWith('nrega_')

    if (map.current.getLayer('lulc-layer')) map.current.removeLayer('lulc-layer')
    if (map.current.getLayer('lulc-image-layer')) map.current.removeLayer('lulc-image-layer')
    if (map.current.getSource('lulc-tif')) map.current.removeSource('lulc-tif')
    if (map.current.getSource('lulc-image')) map.current.removeSource('lulc-image')

    if (isNicesDataset) {
      map.current.addSource('lulc-tif', {
        type: 'raster',
        tiles: [`http://localhost:8000/tiles/{z}/{x}/{y}.png?dataset=${dataset}`],
        tileSize: 256
      })
      map.current.addLayer({
        id: 'lulc-layer',
        type: 'raster',
        source: 'lulc-tif',
        paint: { 'raster-opacity': 0.8 }
      })
      map.current.flyTo({ center: [78, 21], zoom: 4.5 })
    }

    // Handle Vector Choropleth (MICES & NREGA)
    if (isVectorDataset) {
      let colors = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b']; // Defaults (Blues)
      if (dataset?.startsWith('mices_')) colors = ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f']; // Purples
      else if (dataset?.startsWith('nrega_demand')) colors = ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#8c2d04']; // Oranges
      else if (dataset?.startsWith('nrega_')) colors = ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b']; // Greens

      const yearKey = `${dataset}_${year}`;

      const getNumeric = (value) => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
        return null;
      };

      // Build state aggregates for nrega_demand using year-specific district values
      const nregaStateAggregates = {};
      if (dataset === 'nrega_demand') {
        indiaMicesDistrictData.features.forEach((district) => {
          const stateName = district.properties.NAME_1;
          const districtValue = getNumeric(district.properties[`nrega_demand_${year}`])
            ?? getNumeric(district.properties['nrega_demand'])
            ?? getNumeric(district.properties[`nrega_persondays_total_${year}`])
            ?? getNumeric(district.properties['nrega_persondays_total'])
            ?? 0;
          if (!nregaStateAggregates[stateName]) nregaStateAggregates[stateName] = 0;
          nregaStateAggregates[stateName] += districtValue;
        });
      }

      const getDatasetValue = (properties) => {
        // Always prefer the year-specific key; fall back to base key only if missing
        let value = getNumeric(properties[yearKey])
          ?? getNumeric(properties[dataset]);

        if ((!value || value === 0) && dataset === 'nrega_demand') {
          value = getNumeric(properties[`nrega_persondays_total_${year}`])
            ?? getNumeric(properties['nrega_persondays_total'])
            ?? 0;
        }

        if (dataset.startsWith('nrega_') && !value) {
          // Last resort: find any year-suffixed entry and use the closest year
          const suffixEntries = Object.entries(properties)
            .filter(([k]) => k.startsWith(`${dataset}_`))
            .map(([k, v]) => {
              const yearMatch = k.match(/_(\d{4})$/);
              const num = getNumeric(v);
              return yearMatch && num !== null ? [parseInt(yearMatch[1], 10), num] : null;
            })
            .filter(Boolean);

          if (suffixEntries.length > 0) {
            // Pick the entry whose year is closest to the selected year
            const targetYear = parseInt(year, 10);
            suffixEntries.sort((a, b) => Math.abs(a[0] - targetYear) - Math.abs(b[0] - targetYear));
            value = suffixEntries[0][1];
          }
        }

        return value || 0;
      };

      // Attach computed values to state features and compute max for display
      let maxStateVal = 0;
      indiaMicesData.features.forEach(f => {
        const value = getDatasetValue(f.properties);
        f.properties._nrega_value = value;
        if (value > maxStateVal) maxStateVal = value;
      });

      if (map.current.getSource('states')) {
        map.current.getSource('states').setData(indiaMicesData);
      }
      if (maxStateVal === 0) maxStateVal = 100;

      // Attach computed values to district features and compute max for display
      let maxDistVal = 0;
      indiaMicesDistrictData.features.forEach(f => {
        const value = getDatasetValue(f.properties);
        f.properties._nrega_value = value;
        if (value > maxDistVal) maxDistVal = value;
      });

      if (map.current.getSource('districts')) {
        map.current.getSource('districts').setData(indiaMicesDistrictData);
      }
      if (maxDistVal === 0) maxDistVal = 100;

      // debug: show dataset state/district max values for visual sanity
      console.log('MapView dataset', dataset, 'year', year, 'maxStateVal', maxStateVal, 'maxDistVal', maxDistVal);

      if (map.current.getLayer('states-fill')) {
        map.current.removeLayer('states-fill');
      }
      if (map.current.getSource('states')) {
        map.current.addLayer({
          id: 'states-fill',
          type: 'fill',
          source: 'states',
          maxzoom: 5.5,
          paint: {
            'fill-color': [
              'interpolate',
              ['exponential', 0.5],
              ['coalesce', ['get', '_nrega_value'], ['get', dataset], ['get', yearKey], 0],
              0, colors[0],
              maxStateVal * 0.1, colors[1],
              maxStateVal * 0.25, colors[2],
              maxStateVal * 0.5, colors[3],
              maxStateVal, colors[4]
            ],
            'fill-opacity': 0.8,
            'fill-outline-color': 'rgba(0,0,0,0)'
          }
        }, map.current.getLayer('states-line') ? 'states-line' : undefined);
      }

      if (map.current.getLayer('districts-fill')) {
        map.current.removeLayer('districts-fill');
      }
      if (map.current.getSource('districts')) {
        map.current.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts',
          minzoom: 5.5,
          paint: {
            'fill-color': [
              'interpolate',
              ['exponential', 0.5],
              ['coalesce', ['get', '_nrega_value'], ['get', dataset], ['get', yearKey], 0],
              0, colors[0],
              maxDistVal * 0.1, colors[1],
              maxDistVal * 0.25, colors[2],
              maxDistVal * 0.5, colors[3],
              maxDistVal, colors[4]
            ],
            'fill-opacity': 0.8,
            'fill-outline-color': 'rgba(0,0,0,0)'
          }
        }, map.current.getLayer('districts-line') ? 'districts-line' : undefined);
      }

    } else {
       if (map.current.getLayer('states-fill')) {
          map.current.setPaintProperty('states-fill', 'fill-opacity', 0);
       }
       if (map.current.getLayer('districts-fill')) {
          map.current.setPaintProperty('districts-fill', 'fill-opacity', 0);
       }
    }
  }, [year, dataset, styleLoadedTrigger, indiaMicesDistrictData])

  // Handle selected state styling
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    // Ensure source exists before attempting to set feature state
    if (!map.current.getSource('states')) return;

    // Clear previous
    if (selectedStateIdRef.current !== null) {
      map.current.setFeatureState(
        { source: 'states', id: selectedStateIdRef.current },
        { selected: false }
      );
    }
    
    // Set new
    if (selectedState && selectedState.mapboxId !== undefined) {
      map.current.setFeatureState(
        { source: 'states', id: selectedState.mapboxId },
        { selected: true }
      );
      selectedStateIdRef.current = selectedState.mapboxId;
    } else {
      selectedStateIdRef.current = null;
    }
  }, [selectedState, styleLoadedTrigger])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxgl.accessToken}&limit=5`
      )
      const data = await res.json()
      setSearchResults(data.features || [])
    } catch (err) {
      console.error('Error fetching geocoding results:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectLocation = (feature) => {
    const [lng, lat] = feature.center
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 10,
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
      })
    }
    setSearchQuery(feature.place_name)
    setSearchResults([]) // hide dropdown
  }

  return (
    <div className="relative w-full h-full">
      {/* Top Center Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-96 font-sans">
        <div className="bg-white rounded-md shadow-md flex items-center px-3 py-2 border border-gray-100">
          <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search Location Worldwide..." 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-transparent outline-none text-sm text-gray-800"
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#007bff] rounded-full animate-spin ml-2"></div>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-md shadow-lg border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-sm transition-colors"
              >
                <p className="font-medium text-gray-800 truncate">{result.text}</p>
                <p className="text-xs text-gray-500 truncate">{result.place_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top Right Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button 
          onClick={() => setMapStyle('mapbox://styles/mapbox/satellite-streets-v12')}
          className={`p-2 text-xl rounded shadow transition-colors ${mapStyle === 'mapbox://styles/mapbox/satellite-streets-v12' ? 'bg-[#007bff] text-white opacity-90' : 'bg-white hover:bg-gray-50'}`} 
          title="Satellite View"
        >
          🛰️
        </button>
        <button 
          onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')}
          className={`p-2 text-xl rounded shadow transition-colors ${mapStyle === 'mapbox://styles/mapbox/streets-v12' ? 'bg-[#007bff] text-white opacity-90' : 'bg-white hover:bg-gray-50'}`} 
          title="Street/Choropleth View"
        >
          🗺️
        </button>
      </div>

      {/* Map Controls & Components Below Top Bar */}
      {/* Dataset Info Overlays Removed as requested */}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip && tooltip.data && (
        <div
          className="fixed bg-white rounded shadow-lg px-3 py-2 z-50 pointer-events-none text-sm border border-gray-100"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
          }}
        >
          {tooltip.isDistrict && tooltip.data.NAME_2 ? (
             <p className="font-bold text-gray-800 border-b pb-1 mb-1">{tooltip.data.NAME_2}, {tooltip.data.NAME_1}</p>
          ) : tooltip.data.NAME_1 ? (
            <p className="font-bold text-gray-800 border-b pb-1 mb-1">{tooltip.data.NAME_1}</p>
          ) : null}
          
          {(dataset?.startsWith('mices_') || dataset?.startsWith('nrega_')) ? (
            <div className="mt-1 text-gray-600">
               <p>
                 <span className="font-medium mr-1">
                   {dataset.replace('mices_', '').replace('nrega_', '').replace(/_/g, ' ')}
                   {dataset?.startsWith('nrega_') && year ? ` (${year})` : ''}:
                 </span>
                 {(tooltip.data._nrega_value ?? tooltip.data[`${dataset}_${year}`] ?? tooltip.data[dataset] ?? 0).toLocaleString()}
               </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
