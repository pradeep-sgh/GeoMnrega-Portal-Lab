import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { loadDistrictData, getDistrictDataSync } from '../data/districtDataLoader';

export default function MiniMap({ stateName, dataset, year, stateData }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [noData, setNoData] = useState(false);
  const [indiaMicesDistrictData, setIndiaMicesDistrictData] = useState(() => getDistrictDataSync());

  useEffect(() => {
    loadDistrictData().then(data => setIndiaMicesDistrictData(prev => prev || data));
  }, []);

  useEffect(() => {
    if (!stateName || !dataset || !indiaMicesDistrictData) return;
    
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [78, 21], 
      zoom: 3,
      interactive: false,
      attributionControl: false
    });

    map.current.on('load', () => {
      if (!map.current) return;
      
      const stateFeatures = indiaMicesDistrictData.features.filter(f => f.properties.NAME_1 === stateName);
      
      // State-level values for proportional MICES distribution
      const stateSchemeVal    = Number(stateData?.[dataset]) || Number(stateData?.[`${dataset}_${year}`]) || 0;
      const stateTotalSchemes = Number(stateData?.['mices_total_water_scheme']) || 1;

      const valueKey = dataset?.startsWith('nrega_') && year ? `${dataset}_${year}` : dataset;

      // Get effective district value with MICES proportional fallback
      const getVal = (props) => {
        const raw = props[valueKey] ?? props[dataset];
        const num = typeof raw === 'number' ? raw : (raw !== undefined && raw !== null ? parseFloat(raw) || 0 : null);
        if (num !== null && num > 0) return num;

        if (dataset?.startsWith('mices_') && dataset !== 'mices_total_water_scheme') {
          const distTotal = Number(props['mices_total_water_scheme']) || 0;
          if (distTotal > 0 && stateSchemeVal > 0) {
            return (distTotal / stateTotalSchemes) * stateSchemeVal;
          }
        }
        return 0;
      };

      let maxVal = 0;
      stateFeatures.forEach(f => {
        const val = getVal(f.properties);
        if (val > maxVal) maxVal = val;
      });

      const allZero = maxVal === 0;
      setNoData(allZero && dataset?.startsWith('nrega_'));
      if (allZero) maxVal = 100;

      // Embed computed value so Mapbox expressions can access it
      const geojson = {
        type: 'FeatureCollection',
        features: stateFeatures.map(f => ({
          ...f,
          properties: { ...f.properties, _value: getVal(f.properties) }
        }))
      };

      // Color scheme matches the legend
      let colors = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'];
      if (dataset.startsWith('mices_')) colors = ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'];
      else if (dataset.startsWith('nrega_demand')) colors = ['#fff5eb', '#fdd0a2', '#fd8d3c', '#d94801', '#8c2d04'];
      else if (dataset.startsWith('nrega_')) colors = ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'];

      map.current.addSource('state-districts', { type: 'geojson', data: geojson });

      map.current.addLayer({
        id: 'districts-fill',
        type: 'fill',
        source: 'state-districts',
        paint: {
          'fill-color': [
              'interpolate',
              ['exponential', 0.5],
              ['coalesce', ['get', '_value'], 0],
              0, colors[0],
              maxVal * 0.1, colors[1],
              maxVal * 0.25, colors[2],
              maxVal * 0.5, colors[3],
              maxVal, colors[4]
          ],
          'fill-opacity': 0.8
        }
      });
      map.current.addLayer({
        id: 'districts-line',
        type: 'line',
        source: 'state-districts',
        paint: { 'line-color': '#ffffff', 'line-width': 0.5 }
      });

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
        map.current.fitBounds(bounds, { padding: 10, duration: 0 });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [stateName, dataset, year, stateData, indiaMicesDistrictData]);

  return (
    <div className="w-full h-full rounded relative">
      <div ref={mapContainer} className="w-full h-full rounded" />
      {noData && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded pointer-events-none">
          <p className="text-[10px] text-gray-500 text-center px-2 leading-tight">
            No district data<br />Run <code className="bg-gray-100 px-1 rounded">process_all_nrega.py</code>
          </p>
        </div>
      )}
    </div>
  );
}
