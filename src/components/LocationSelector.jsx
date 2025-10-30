import { useEffect, useMemo, useState } from 'react';
import LGA_MAP from '../data/nigeria_lgas.json';

const NIGERIA_STATE_CITIES = LGA_MAP;

const allStates = Object.keys(NIGERIA_STATE_CITIES);

export default function LocationSelector({
  value,
  onChange,
  autoDetected, // { state, city|lga, country }
  enforceNigeria = true,
  className = '',
  showNeighborhood = true
}) {
  const [stateInput, setStateInput] = useState(value?.state || autoDetected?.state || '');
  const [lgaInput, setLgaInput] = useState(value?.city || autoDetected?.city || '');
  const [neighborhood, setNeighborhood] = useState('');
  const [country, setCountry] = useState(autoDetected?.country || '');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!autoDetected) return;
    setCountry(autoDetected.country || '');
    if (autoDetected.state && !value?.state) setStateInput(autoDetected.state);
    if (autoDetected.city && !value?.city) setLgaInput(autoDetected.city);
  }, [autoDetected]);

  // Keep inputs in sync when parent value changes (e.g., prefill from Join form)
  useEffect(() => {
    if (value?.state) setStateInput(value.state);
    if (value?.city) setLgaInput(value.city);
  }, [value?.state, value?.city]);

  useEffect(() => {
    if (enforceNigeria && country && country.toLowerCase() !== 'nigeria') {
      setWarning('We currently serve Nigeria only. Your location appears outside Nigeria.');
    } else {
      setWarning('');
    }
  }, [country, enforceNigeria]);

  useEffect(() => {
    onChange?.({ 
      state: stateInput, 
      city: lgaInput, // using city field to carry LGA for backward compatibility
      lga: lgaInput,
      neighborhood,
      country: country || 'Nigeria' 
    });
  }, [stateInput, lgaInput, neighborhood, country]);

  const stateSuggestions = useMemo(() => {
    const q = (stateInput || '').toLowerCase();
    return q ? allStates.filter(s => s.toLowerCase().includes(q)) : allStates;
  }, [stateInput]);

  const citySuggestions = useMemo(() => {
    const list = NIGERIA_STATE_CITIES[stateInput] || [];
    const q = (lgaInput || '').toLowerCase();
    return q ? list.filter(c => c.toLowerCase().includes(q)) : list;
  }, [stateInput, lgaInput]);

  return (
    <div className={className}>
      {warning && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {warning}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <input
            type="text"
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder="Start typing your state (e.g., Lagos)"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            list="ng-state-list"
          />
          <datalist id="ng-state-list">
            {stateSuggestions.map(s => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">LGA</label>
          <input
            type="text"
            value={lgaInput}
            onChange={(e) => setLgaInput(e.target.value)}
            placeholder="Start typing LGA (e.g., Ikorodu)"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            list="ng-city-list"
          />
          <datalist id="ng-city-list">
            {citySuggestions.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {showNeighborhood && (
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">Neighbourhood / Area (optional)</label>
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="e.g., Tajudeen Alli Street"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2 space-y-1">
        <p>Tip: We prefill from your GPS. You can correct State/LGA or add your neighbourhood.</p>
        <p>If it looks off, clear the fields and retype your exact State/LGA.</p>
      </div>
    </div>
  );
}
