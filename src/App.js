import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const waypointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const movingLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map view changes
function MapViewUpdater({ bounds, center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

// Component to handle live location tracking
function LiveLocationTracker({ onLocationUpdate, isTracking }) {
  const map = useMap();
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { 
          lat: latitude, 
          lng: longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        };
        
        onLocationUpdate(newLocation);
        
        // Center map on new location if tracking is active
        map.setView([latitude, longitude], map.getZoom());
      },
      (error) => {
        console.error('Error watching location:', error);
        alert('Error tracking location: ' + error.message);
      },
      options
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTracking, onLocationUpdate, map]);

  return null;
}

// Main Navigation Component with Waypoints and Live Tracking
const NavigationApp = () => {
  // State management
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [stepByStepDirections, setStepByStepDirections] = useState([]);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const [zoom, setZoom] = useState(13);
  
  // New states for waypoints
  const [waypoints, setWaypoints] = useState([]);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  
  // Live location tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [liveLocation, setLiveLocation] = useState(null);
  
  // Dropdown functionality states
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Refs
  const mapRef = useRef();
  const originInputRef = useRef();
  const destinationInputRef = useRef();
  const originDropdownRef = useRef();
  const destinationDropdownRef = useRef();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originDropdownRef.current && !originDropdownRef.current.contains(event.target)) {
        setShowOriginDropdown(false);
      }
      if (destinationDropdownRef.current && !destinationDropdownRef.current.contains(event.target)) {
        setShowDestinationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

   // Add a waypoint at specified coordinates
  const addWaypoint = async (lat, lng) => {
    const address = await reverseGeocode(lat, lng);
    const newWaypoint = {
      id: Date.now(),
      lat,
      lng,
      address,
      isDraggable: true
    };
    
    setWaypoints(prev => [...prev, newWaypoint]);
  };

  // Handle map clicks for adding waypoints
  useEffect(() => {
    if (!isAddingWaypoint) return;

    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      addWaypoint(lat, lng);
      setIsAddingWaypoint(false);
    };

    map.addEventListener('click', handleMapClick);
    return () => {
      map.removeEventListener('click', handleMapClick);
    };
  }, [isAddingWaypoint, addWaypoint]);

  // Handle live location updates
  const handleLocationUpdate = (newLocation) => {
    setLiveLocation(newLocation);
    setLocationHistory(prev => {
      const updatedHistory = [...prev, { ...newLocation, timestamp: new Date() }];
      // Keep only last 100 points to prevent memory issues
      return updatedHistory.slice(-100);
    });
  };

  // Geocoding function to convert address to coordinates with multiple results
  const geocodeAddress = async (address, limit = 5) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=${limit}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(item => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: item.display_name,
          type: item.type,
          importance: item.importance
        }));
      }
      return [];
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  };

  // Reverse geocoding function to convert coordinates to address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || 'Address not found';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Address not found';
    }
  };

  // Handle origin input change with debouncing
  const handleOriginChange = async (value) => {
    setOrigin(value);
    
    if (value.length < 3) {
      setOriginSuggestions([]);
      setShowOriginDropdown(false);
      return;
    }
    
    setIsGeocoding(true);
    const results = await geocodeAddress(value);
    setOriginSuggestions(results);
    setShowOriginDropdown(results.length > 0);
    setIsGeocoding(false);
  };

  // Handle destination input change with debouncing
  const handleDestinationChange = async (value) => {
    setDestination(value);
    
    if (value.length < 3) {
      setDestinationSuggestions([]);
      setShowDestinationDropdown(false);
      return;
    }
    
    setIsGeocoding(true);
    const results = await geocodeAddress(value);
    setDestinationSuggestions(results);
    setShowDestinationDropdown(results.length > 0);
    setIsGeocoding(false);
  };

  // Handle origin selection from dropdown
  const handleOriginSelect = (suggestion) => {
    setOrigin(suggestion.address);
    setOriginCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setMapCenter([suggestion.lat, suggestion.lng]);
    setZoom(15);
    setShowOriginDropdown(false);
    setOriginSuggestions([]);
  };

  // Handle destination selection from dropdown
  const handleDestinationSelect = (suggestion) => {
    setDestination(suggestion.address);
    setDestinationCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setShowDestinationDropdown(false);
    setDestinationSuggestions([]);
  };

  // Remove a waypoint
  const removeWaypoint = (id) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  // Move waypoint up in order
  const moveWaypointUp = (index) => {
    if (index <= 0) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index], newWaypoints[index - 1]] = [newWaypoints[index - 1], newWaypoints[index]];
    setWaypoints(newWaypoints);
  };

  // Move waypoint down in order
  const moveWaypointDown = (index) => {
    if (index >= waypoints.length - 1) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index], newWaypoints[index + 1]] = [newWaypoints[index + 1], newWaypoints[index]];
    setWaypoints(newWaypoints);
  };

  // Handle waypoint drag end
  const handleWaypointDragEnd = async (id, event) => {
    const { lat, lng } = event.target.getLatLng();
    const address = await reverseGeocode(lat, lng);
    
    setWaypoints(prev => 
      prev.map(wp => 
        wp.id === id ? { ...wp, lat, lng, address } : wp
      )
    );
  };

  // Function to calculate route using OSRM with waypoints
  const getDirections = async () => {
    if (!originCoords || !destinationCoords) {
      alert('Please set both origin and destination');
      return;
    }

    setIsRouting(true);
    try {
      // Build coordinates array: origin -> waypoints -> destination
      const allCoordinates = [
        [originCoords.lng, originCoords.lat],
        ...waypoints.map(wp => [wp.lng, wp.lat]),
        [destinationCoords.lng, destinationCoords.lat]
      ];

      const coordinatesString = allCoordinates.map(coord => coord.join(',')).join(';');
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson&steps=true`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const routeGeometry = routeData.geometry.coordinates;
        
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const convertedRoute = routeGeometry.map(coord => [coord[1], coord[0]]);
        setRoute(convertedRoute);
        
        // Extract step-by-step directions
        const steps = routeData.legs.flatMap(leg => 
          leg.steps.map(step => ({
            instruction: step.maneuver.modifier ? 
              `${step.maneuver.type} ${step.maneuver.modifier}` : 
              step.maneuver.type,
            distance: (step.distance / 1000).toFixed(2) + ' km',
            duration: (step.duration / 60).toFixed(0) + ' min',
            name: step.name || 'Unnamed road'
          }))
        );
        
        setStepByStepDirections(steps);
        
        // Set route information
        setRouteInfo({
          distance: (routeData.distance / 1000).toFixed(2),
          duration: (routeData.duration / 60).toFixed(0),
          totalSteps: steps.length,
          waypointsCount: waypoints.length
        });

        // Create bounds for all points
        const allPoints = [
          [originCoords.lat, originCoords.lng],
          ...waypoints.map(wp => [wp.lat, wp.lng]),
          [destinationCoords.lat, destinationCoords.lng]
        ];
        
        const bounds = L.latLngBounds(allPoints);
        
        // Update map view to show entire route
        setMapCenter(bounds.getCenter());
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Error calculating route. Please try different locations.');
    } finally {
      setIsRouting(false);
    }
  };

  // Handle origin search (for the search button)
  const handleOriginSearch = async () => {
    if (!origin.trim()) return;

    const results = await geocodeAddress(origin, 1);
    if (results.length > 0) {
      const result = results[0];
      setOriginCoords({ lat: result.lat, lng: result.lng });
      setOrigin(result.address);
      setMapCenter([result.lat, result.lng]);
      setZoom(15);
    } else {
      alert('Origin address not found. Please try a different address.');
    }
  };

  // Handle destination search (for the search button)
  const handleDestinationSearch = async () => {
    if (!destination.trim()) return;

    const results = await geocodeAddress(destination, 1);
    if (results.length > 0) {
      const result = results[0];
      setDestinationCoords({ lat: result.lat, lng: result.lng });
      setDestination(result.address);
    } else {
      alert('Destination address not found. Please try a different address.');
    }
  };

  // Use current location for origin
  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { 
            lat: latitude, 
            lng: longitude,
            accuracy: position.coords.accuracy
          };
          
          setCurrentLocation(newLocation);
          setOriginCoords({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setZoom(15);
          
          // Reverse geocode to get address
          const address = await reverseGeocode(latitude, longitude);
          setOrigin(address);
          setShowOriginDropdown(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please ensure location services are enabled.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // Start/stop live location tracking
  const toggleLiveTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    if (isTracking) {
      setIsTracking(false);
      setLiveLocation(null);
    } else {
      setIsTracking(true);
    }
  };

  // Set current live location as origin
  const setLiveLocationAsOrigin = () => {
    if (liveLocation) {
      setOriginCoords({ lat: liveLocation.lat, lng: liveLocation.lng });
      setOrigin(`Live Location (${liveLocation.lat.toFixed(6)}, ${liveLocation.lng.toFixed(6)})`);
      setMapCenter([liveLocation.lat, liveLocation.lng]);
      setZoom(16);
    }
  };

  // Clear all inputs and route
  const clearAll = () => {
    setOrigin('');
    setDestination('');
    setOriginCoords(null);
    setDestinationCoords(null);
    setWaypoints([]);
    setRoute([]);
    setRouteInfo(null);
    setStepByStepDirections([]);
    setMapCenter([51.505, -0.09]);
    setZoom(13);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setShowOriginDropdown(false);
    setShowDestinationDropdown(false);
    setIsAddingWaypoint(false);
    setIsTracking(false);
    setLiveLocation(null);
    setLocationHistory([]);
  };

  // Swap origin and destination
  const swapLocations = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginCoords(destinationCoords);
    setDestinationCoords(originCoords);
    setRoute([]);
    setRouteInfo(null);
    setStepByStepDirections([]);
  };

  // Calculate bounds for map view
  const getMapBounds = () => {
    const points = [];
    if (originCoords) points.push([originCoords.lat, originCoords.lng]);
    if (destinationCoords) points.push([destinationCoords.lat, destinationCoords.lng]);
    waypoints.forEach(wp => points.push([wp.lat, wp.lng]));
    if (liveLocation) points.push([liveLocation.lat, liveLocation.lng]);
    
    if (points.length > 0) {
      return L.latLngBounds(points);
    }
    return null;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        zIndex: 1000 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Input Section */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Origin Input */}
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }} ref={originDropdownRef}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Origin:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={originInputRef}
                    type="text"
                    value={origin}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    placeholder="Enter origin address"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    onFocus={() => originSuggestions.length > 0 && setShowOriginDropdown(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleOriginSearch()}
                  />
                  
                  {/* Origin Dropdown */}
                  {showOriginDropdown && (
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
                      ) : (
                        originSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleOriginSelect(suggestion)}
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
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleOriginSearch}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Search
                </button>
                <button
                  onClick={useCurrentLocation}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Use Current Location"
                >
                  📍
                </button>
              </div>
            </div>

            {/* Destination Input */}
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }} ref={destinationDropdownRef}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Destination:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={destinationInputRef}
                    type="text"
                    value={destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    placeholder="Enter destination address"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    onFocus={() => destinationSuggestions.length > 0 && setShowDestinationDropdown(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleDestinationSearch()}
                  />
                  
                  {/* Destination Dropdown */}
                  {showDestinationDropdown && (
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
                      ) : (
                        destinationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleDestinationSelect(suggestion)}
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
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDestinationSearch}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={getDirections}
                disabled={!originCoords || !destinationCoords || isRouting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: originCoords && destinationCoords ? 'pointer' : 'not-allowed'
                }}
              >
                {isRouting ? 'Calculating...' : 'Get Directions'}
              </button>
              
              <button
                onClick={() => setIsAddingWaypoint(!isAddingWaypoint)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isAddingWaypoint ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isAddingWaypoint ? 'Cancel Add Point' : 'Add Waypoint'}
              </button>
              
              <button
                onClick={toggleLiveTracking}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isTracking ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isTracking ? 'Stop Tracking' : 'Live Track'}
              </button>
              
              <button
                onClick={swapLocations}
                disabled={!originCoords || !destinationCoords}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: originCoords && destinationCoords ? 'pointer' : 'not-allowed'
                }}
                title="Swap Locations"
              >
                🔄
              </button>
              
              <button
                onClick={clearAll}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Live Location Info */}
          {liveLocation && (
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              padding: '0.5rem',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              border: '1px solid #b3d9ff',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: 'bold' }}>📍 Live Location:</div>
              <div>Lat: {liveLocation.lat.toFixed(6)}, Lng: {liveLocation.lng.toFixed(6)}</div>
              {liveLocation.accuracy && (
                <div>Accuracy: ±{liveLocation.accuracy.toFixed(1)}m</div>
              )}
              {liveLocation.speed && (
                <div>Speed: {(liveLocation.speed * 3.6).toFixed(1)} km/h</div>
              )}
              <button
                onClick={setLiveLocationAsOrigin}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Set as Origin
              </button>
            </div>
          )}

          {/* Waypoints List */}
          {waypoints.length > 0 && (
            <div style={{ 
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Waypoints ({waypoints.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                {waypoints.map((waypoint, index) => (
                  <div
                    key={waypoint.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px'
                    }}
                  >
                    <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{index + 1}.</span>
                    <span style={{ flex: 1, fontSize: '0.9rem' }} title={waypoint.address}>
                      {waypoint.address.length > 50 
                        ? waypoint.address.substring(0, 50) + '...' 
                        : waypoint.address}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => moveWaypointUp(index)}
                        disabled={index === 0}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: index === 0 ? '#ccc' : '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveWaypointDown(index)}
                        disabled={index === waypoints.length - 1}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: index === waypoints.length - 1 ? '#ccc' : '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: index === waypoints.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeWaypoint(waypoint.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer'
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route Information */}
          {routeInfo && (
            <div style={{ 
              display: 'flex', 
              gap: '2rem', 
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <div><strong>Distance:</strong> {routeInfo.distance} km</div>
              <div><strong>Duration:</strong> {routeInfo.duration} minutes</div>
              <div><strong>Steps:</strong> {routeInfo.totalSteps} turns</div>
              {routeInfo.waypointsCount > 0 && (
                <div><strong>Waypoints:</strong> {routeInfo.waypointsCount}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 180px)' }}>
        {/* Map Container */}
        <div style={{ flex: 2, position: 'relative' }}>
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapViewUpdater bounds={getMapBounds()} center={mapCenter} zoom={zoom} />
            <LiveLocationTracker onLocationUpdate={handleLocationUpdate} isTracking={isTracking} />
            
            {/* Current Location Marker */}
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon}>
                <Popup>
                  <strong>Your Location</strong><br />
                  Accuracy: ±{currentLocation.accuracy?.toFixed(1)}m
                </Popup>
              </Marker>
            )}
            
            {/* Live Location Marker */}
            {liveLocation && (
              <Marker position={[liveLocation.lat, liveLocation.lng]} icon={movingLocationIcon}>
                <Popup>
                  <strong>Live Location</strong><br />
                  Lat: {liveLocation.lat.toFixed(6)}<br />
                  Lng: {liveLocation.lng.toFixed(6)}<br />
                  {liveLocation.accuracy && `Accuracy: ±${liveLocation.accuracy.toFixed(1)}m`}<br />
                  {liveLocation.speed && `Speed: ${(liveLocation.speed * 3.6).toFixed(1)} km/h`}<br />
                  <button 
                    onClick={setLiveLocationAsOrigin}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    Set as Origin
                  </button>
                </Popup>
              </Marker>
            )}
            
            {/* Location History Polyline */}
            {locationHistory.length > 1 && (
              <Polyline
                positions={locationHistory.map(loc => [loc.lat, loc.lng])}
                color="purple"
                weight={3}
                opacity={0.6}
                dashArray="5, 10"
              />
            )}
            
            {/* Origin Marker */}
            {originCoords && (
              <Marker position={[originCoords.lat, originCoords.lng]} icon={startIcon}>
                <Popup>
                  <strong>Origin</strong><br />
                  {origin}
                </Popup>
              </Marker>
            )}
            
            {/* Destination Marker */}
            {destinationCoords && (
              <Marker position={[destinationCoords.lat, destinationCoords.lng]} icon={endIcon}>
                <Popup>
                  <strong>Destination</strong><br />
                  {destination}
                </Popup>
              </Marker>
            )}
            
            {/* Waypoint Markers */}
            {waypoints.map((waypoint) => (
              <Marker
                key={waypoint.id}
                position={[waypoint.lat, waypoint.lng]}
                icon={waypointIcon}
                draggable={waypoint.isDraggable}
                eventHandlers={{
                  dragend: (event) => handleWaypointDragEnd(waypoint.id, event)
                }}
              >
                <Popup>
                  <strong>Waypoint</strong><br />
                  {waypoint.address}<br />
                  <button 
                    onClick={() => removeWaypoint(waypoint.id)}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </Popup>
              </Marker>
            ))}
            
            {/* Route Polyline */}
            {route.length > 0 && (
              <Polyline
                positions={route}
                color="blue"
                weight={6}
                opacity={0.7}
              />
            )}
          </MapContainer>
          
          {/* Add Waypoint Instructions */}
          {isAddingWaypoint && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 1000,
              border: '2px solid #ffc107'
            }}>
              <strong>Click anywhere on the map to add a waypoint</strong>
            </div>
          )}
          
          {/* Live Tracking Status */}
          {isTracking && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(220, 53, 69, 0.9)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="pulse-dot"></div>
              <strong>Live Tracking Active</strong>
            </div>
          )}
          
          {/* Loading Overlay */}
          {isRouting && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '1rem 2rem',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              zIndex: 1000
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner"></div>
                <span>Calculating best route...</span>
              </div>
            </div>
          )}
        </div>

        {/* Directions Panel */}
        {stepByStepDirections.length > 0 && (
          <div style={{ 
            flex: 1, 
            maxWidth: '400px',
            backgroundColor: 'white',
            borderLeft: '1px solid #dee2e6',
            overflowY: 'auto',
            padding: '1rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Step-by-Step Directions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stepByStepDirections.map((step, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    borderLeft: '3px solid #007bff'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    Step {index + 1}: {step.instruction}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {step.distance} • {step.duration}
                  </div>
                  {step.name && (
                    <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                      {step.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spinner CSS */}
      <style jsx>{`
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }
        
        .pulse-dot {
          width: 12px;
          height: 12px;
          background-color: #fff;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(0.8); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default NavigationApp;