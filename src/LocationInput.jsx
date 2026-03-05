
import React, { useRef, useEffect } from 'react';

const LocationInput = ({
  label,
  value,
  onChange,
  onSearch,
  onLocationSelect,
  onUseCurrentLocation,
  placeholder,
  suggestions = [],
  showDropdown = false,
  onDropdownToggle,
  isGeocoding = false,
  disabled = false,
  showCurrentLocationBtn = false
}) => {
  const inputRef = useRef();
  const dropdownRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onDropdownToggle(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDropdownToggle]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    if (e.target.value.length >= 3) {
      onDropdownToggle(true);
    } else {
      onDropdownToggle(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onLocationSelect(suggestion);
    onDropdownToggle(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      onDropdownToggle(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch();
      onDropdownToggle(false);
    }
  };

  return (
    <div style={{ flex: 1, minWidth: '250px' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        {label}:
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: disabled ? '#f8f9fa' : 'white'
            }}
          />
          
          {/* Dropdown Suggestions */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1001
            }}>
              {isGeocoding ? (
                <div style={{ padding: '0.5rem', textAlign: 'center', color: '#666' }}>
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white'}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {suggestion.address.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {suggestion.address.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '0.5rem', textAlign: 'center', color: '#666' }}>
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={onSearch}
          disabled={disabled}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1
          }}
        >
          Search
        </button>
        
        {showCurrentLocationBtn && (
          <button
            onClick={onUseCurrentLocation}
            disabled={disabled}
            style={{
              padding: '0.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
            title="Use Current Location"
          >
            📍
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationInput;