import { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaTimes, FaSearch } from 'react-icons/fa';
import { professionalCertificates, getAllCertificates } from '../data/certificates';

const CertificateSelector = ({ 
  value = [], 
  onChange, 
  placeholder = "Select certificates...",
  maxSelections = 5,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const dropdownRef = useRef(null);

  // Get all certificates
  const allCertificates = getAllCertificates();

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allCertificates.filter(cert =>
        cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCertificates(filtered);
    } else {
      setFilteredCertificates(allCertificates);
    }
  }, [searchQuery]);

  useEffect(() => {
    setFilteredCertificates(allCertificates);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
    }
  };

  const handleSelect = (certificate) => {
    if (value.length >= maxSelections) {
      return;
    }
    
    if (!value.find(cert => cert.code === certificate.code)) {
      onChange([...value, certificate]);
    }
    setSearchQuery('');
  };

  const handleRemove = (certificateToRemove) => {
    onChange(value.filter(cert => cert.code !== certificateToRemove.code));
  };

  const isSelected = (certificate) => {
    return value.some(cert => cert.code === certificate.code);
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return value[0].name;
    return `${value.length} certificates selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Certificates Display */}
      <div
        onClick={handleToggle}
        className="w-full p-3 border border-gray-300 rounded-lg cursor-pointer bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {value.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              value.map((cert, index) => (
                <span
                  key={cert.code}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {cert.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(cert);
                    }}
                    className="ml-1 hover:text-blue-600"
                  >
                    <FaTimes className="w-2 h-2" />
                  </button>
                </span>
              ))
            )}
          </div>
          <FaChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Certificates List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCertificates.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">
                No certificates found
              </div>
            ) : (
              filteredCertificates.map((certificate) => (
                <div
                  key={certificate.code}
                  onClick={() => handleSelect(certificate)}
                  className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    isSelected(certificate) ? 'bg-blue-50' : ''
                  } ${value.length >= maxSelections && !isSelected(certificate) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{certificate.name}</div>
                      <div className="text-sm text-gray-500">
                        {certificate.code} • {certificate.category}
                      </div>
                    </div>
                    {isSelected(certificate) && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Max Selections Warning */}
          {value.length >= maxSelections && (
            <div className="p-3 bg-yellow-50 border-t border-yellow-200">
              <div className="text-sm text-yellow-800">
                Maximum {maxSelections} certificates selected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CertificateSelector;




