import districtDataUrl from './mices/india_mices_districts.json?url'

// Singleton cache — fetched once, shared across all components
let cache = null;
let promise = null;

export function loadDistrictData() {
  if (cache) return Promise.resolve(cache);
  if (!promise) {
    promise = fetch(districtDataUrl)
      .then(r => r.json())
      .then(data => { cache = data; return data; });
  }
  return promise;
}

export function getDistrictDataSync() {
  return cache;
}
