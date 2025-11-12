import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTimes, FaChevronDown } from 'react-icons/fa';
import { searchServices, normalizeService, ALL_SERVICES } from '../data/services';

const ServiceSelector = ({ 
  value = '', 
  onChange,
  onSelect,
  onClear,
  placeholder = "Search for a service...",
  showSuggestions = true,
  allowCustom = true,
  className = "",
  inputProps = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update search query when value changes externally
  useEffect(() => {
    setSearchQuery(value);
    if (value && ALL_SERVICES[value]) {
      setSelectedService({ service: value, ...ALL_SERVICES[value] });
    }
  }, [value]);

  // Handle search
  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = searchServices(searchQuery);
      setSuggestions(results);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [searchQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length === 0) {
      setSelectedService(null);
      onChange?.('');
      onClear?.();
    }
  };

  const handleServiceSelect = (serviceData) => {
    setSelectedService(serviceData);
    setSearchQuery(serviceData.service);
    setIsOpen(false);
    onChange?.(serviceData.service);
    onSelect?.(serviceData.service, serviceData);
  };

  const handleCustomService = () => {
    if (searchQuery.trim() && allowCustom) {
      const normalizedService = normalizeService(searchQuery);
      setSelectedService({ service: normalizedService, category: 'Custom' });
      setSearchQuery(normalizedService);
      setIsOpen(false);
      onChange?.(normalizedService);
      onSelect?.(normalizedService, { service: normalizedService, category: 'Custom' });
    }
  };

  const clearSelection = () => {
    setSelectedService(null);
    setSearchQuery('');
    setIsOpen(false);
    onChange?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          {...inputProps}
        />
        {searchQuery && (
          <button
            onClick={clearSelection}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <FaTimes className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        {!searchQuery && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <FaChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {console.log('Rendering dropdown with suggestions:', suggestions.length)}
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleServiceSelect(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{suggestion.service}</span>
                    <span className="text-sm text-gray-500">{suggestion.category}</span>
                    {suggestion.matchType === 'synonym' && (
                      <span className="text-xs text-blue-600">Related to: {searchQuery}</span>
                    )}
                  </div>
                </button>
              ))}
              
              {allowCustom && searchQuery && !suggestions.find(s => s.service.toLowerCase() === searchQuery.toLowerCase()) && (
                <button
                  onClick={handleCustomService}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-t border-gray-200"
                >
                  <div className="flex items-center">
                    <span className="text-blue-600 font-medium">Add "{searchQuery}" as custom service</span>
                  </div>
                </button>
              )}
            </>
          ) : searchQuery.length > 0 ? (
            <div className="px-4 py-2 text-gray-500">
              No services found for "{searchQuery}"
              {allowCustom && (
                <button
                  onClick={handleCustomService}
                  className="block w-full mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add as custom service
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 py-2 text-gray-500">
              Start typing to search services...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;

