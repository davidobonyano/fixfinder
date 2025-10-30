# FixFinder Location System Documentation

## Overview

The FixFinder location system provides automatic, map-powered location detection and proximity-based features throughout the platform. It uses **Leaflet + OpenStreetMap + Nominatim** (no Google Maps required).

## Features

### ✅ Implemented Features

1. **Automatic Location Detection**
   - On signup/login with location permission
   - Stores coordinates, city, state, country, and address
   - No manual dropdowns required

2. **Proximity-Based Job Feed**
   - Jobs sorted by distance from user
   - Shows "X km away" for each job
   - Prioritizes urgent jobs first

3. **Location Autocomplete Search**
   - Search any city/state worldwide
   - Powered by OpenStreetMap Nominatim
   - Debounced for performance

4. **Nearby Professionals Finder**
   - Find professionals within specified radius
   - Real-time distance calculations
   - Filter by category and distance

5. **Distance Display**
   - Automatic distance calculations using Haversine formula
   - Formatted as "2.5 km away" or "800 m away"
   - Used throughout the app (job feed, professional cards, chat)

## Backend Implementation

### 1. Models

#### User Model (`models/User.js`)
```javascript
location: {
  latitude: Number,
  longitude: Number,
  city: String,
  state: String,
  country: String,
  address: String,
  lastUpdated: Date
}
```

#### Professional Model
Already has location field structure.

#### Job Model
Already has location field structure with coordinates.

### 2. Location Service (`utils/locationService.js`)

Functions available:
- `reverseGeocode(lat, lng)` - Convert coordinates to address
- `forwardGeocode(query)` - Convert address to coordinates
- `autocompleteAddress(query)` - Get location suggestions
- `calculateDistance(lat1, lon1, lat2, lon2)` - Calculate distance in km
- `findNearby(userLat, userLon, entities, maxDistance)` - Find nearby entities
- `formatDistance(distanceKm)` - Format distance for display

### 3. API Endpoints

**Base URL:** `/api/location`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/save` | POST | Save/update user location |
| `/my-location` | GET | Get current user's location |
| `/nearby-professionals` | GET | Find nearby professionals |
| `/nearby-jobs` | GET | Find nearby jobs |
| `/calculate-distance` | GET | Calculate distance between two points |

**Example: Save Location**
```javascript
POST /api/location/save
Body: { latitude: 9.0579, longitude: 7.4951 }
Response: { success: true, location: { ... } }
```

**Example: Find Nearby Jobs**
```javascript
GET /api/location/nearby-jobs?maxDistance=50&category=plumbing
Response: { 
  success: true, 
  count: 5,
  jobs: [{ ..., distance: 3.2, distanceFormatted: "3.2 km away" }],
  myLocation: { latitude: 9.0579, longitude: 7.4951 }
}
```

### 4. Updated Auth Controller

Location is automatically handled on:
- **Registration** - Accepts optional `latitude` and `longitude`
- **Login** - Updates location if provided

Example registration:
```javascript
POST /api/auth/register
Body: { 
  name, email, password, role,
  latitude: 9.0579,  // optional
  longitude: 7.4951   // optional
}
```

### 5. Updated Job Controller

Job feed now supports proximity-based sorting:
```javascript
GET /api/jobs/feed?latitude=9.0579&longitude=7.4951&scope=nearby
```

Jobs are sorted by:
1. Urgency (urgent first)
2. Distance from user (closest first)

## Frontend Implementation

### 1. Location Utilities (`utils/locationUtils.js`)

Available functions:
- `calculateDistance(lat1, lon1, lat2, lon2)` - Calculate distance in km
- `formatDistance(distanceKm)` - Format for display
- `getCurrentLocation()` - Get user's current GPS location
- `requestLocationPermission()` - Check/request permission
- `watchPosition(callback)` - Real-time position tracking
- `isValidCoordinates(lat, lng)` - Validate coordinates
- `formatLocation(location)` - Format location string

### 2. Location Hook (`hooks/useLocation.js`)

Easy-to-use React hook:
```javascript
const {
  location,         // { latitude, longitude }
  isLoading,        // boolean
  error,           // string|null
  permissionGranted, // boolean
  detectLocation,   // function
  requestAndDetect, // function
  updateLocation,   // function
  clearLocation     // function
} = useLocation(autoDetect);
```

### 3. Location Autocomplete Component

Ready-to-use component:
```javascript
<LocationAutocomplete
  onSelect={(location) => {
    console.log('Selected:', location);
    // { label, latitude, longitude, city, state, country }
  }}
  placeholder="Search for a location..."
/>
```

### 4. API Functions (`utils/api.js`)

```javascript
import { 
  saveLocation, 
  getMyLocation, 
  findNearbyProfessionals, 
  findNearbyJobs 
} from '../utils/api';

// Save location
await saveLocation(latitude, longitude);

// Get my location
const location = await getMyLocation();

// Find nearby professionals (within 50km)
const pros = await findNearbyProfessionals({ 
  maxDistance: 50, 
  category: 'plumbing' 
});

// Find nearby jobs (within 30km)
const jobs = await findNearbyJobs({ 
  maxDistance: 30,
  category: 'electrician'
});
```

## Integration Examples

### 1. Signup/Login with Auto Location Detection

```javascript
import { useLocation } from '../hooks/useLocation';
import { registerUser, loginUser } from '../utils/api';

function AuthPage() {
  const { location, detectLocation, isLoading } = useLocation(true);

  const handleRegister = async (formData) => {
    try {
      // Detect location if available
      if (location) {
        formData.latitude = location.latitude;
        formData.longitude = location.longitude;
      }

      const response = await registerUser(formData);
      // Success...
    } catch (error) {
      // Error handling...
    }
  };

  return (
    <div>
      <button onClick={detectLocation} disabled={isLoading}>
        {isLoading ? 'Detecting...' : 'Use My Location'}
      </button>
      {/* Rest of form */}
    </div>
  );
}
```

### 2. Job Feed with Proximity Sorting

```javascript
import { getJobFeed } from '../utils/api';
import { useLocation } from '../hooks/useLocation';
import { formatDistance } from '../utils/locationUtils';

function JobFeedPage() {
  const { location } = useLocation();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, [location]);

  const fetchJobs = async () => {
    const params = { scope: 'nearby' };
    
    if (location) {
      params.latitude = location.latitude;
      params.longitude = location.longitude;
    }

    const response = await getJobFeed(params);
    setJobs(response.data);
  };

  return (
    <div>
      {jobs.map(job => (
        <div key={job._id}>
          <h3>{job.title}</h3>
          {job.distance && (
            <p>{job.distanceFormatted}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 3. Location Search for Manual Selection

```javascript
import LocationAutocomplete from '../components/LocationAutocomplete';
import { forwardGeocode } from '../utils/api';

function LocationSearchPage() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleSelect = async (location) => {
    setSelectedLocation(location);
    
    // Save selected location
    await saveLocation(location.latitude, location.longitude);
  };

  return (
    <div>
      <LocationAutocomplete onSelect={handleSelect} />
      
      {selectedLocation && (
        <div>
          <p>Selected: {selectedLocation.label}</p>
          <p>City: {selectedLocation.city}, {selectedLocation.state}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. Find Nearby Professionals on Map

```javascript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { findNearbyProfessionals } from '../utils/api';
import { calculateDistance, formatDistance } from '../utils/locationUtils';

function ProfessionalsMap() {
  const [pros, setPros] = useState([]);
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    fetchNearbyPros();
  }, []);

  const fetchNearbyPros = async () => {
    const response = await findNearbyProfessionals({ maxDistance: 50 });
    setPros(response.professionals);
    setMyLocation(response.myLocation);
  };

  return (
    <MapContainer center={[9.0579, 7.4951]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {myLocation && (
        <Marker position={[myLocation.latitude, myLocation.longitude]}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      
      {pros.map(pro => (
        <Marker 
          key={pro._id}
          position={[pro.location.coordinates.lat, pro.location.coordinates.lng]}
        >
          <Popup>
            <p>{pro.name}</p>
            <p>{pro.distanceFormatted}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

## Usage Flow

### 1. On App Launch

```javascript
// In your main app component
import { useLocation } from './hooks/useLocation';

function App() {
  const { location, detectLocation } = useLocation(true); // auto-detect

  useEffect(() => {
    // Location is automatically detected and saved to backend
    // User's location is now available throughout the app
  }, [location]);

  return (
    // Your app components
  );
}
```

### 2. Display Distance on Cards

```javascript
import { calculateDistance, formatDistance } from '../utils/locationUtils';

function ProfessionalCard({ pro, myLocation }) {
  const distance = myLocation && pro.location?.coordinates
    ? calculateDistance(
        myLocation.latitude, 
        myLocation.longitude,
        pro.location.coordinates.lat,
        pro.location.coordinates.lng
      )
    : null;

  return (
    <div>
      <h3>{pro.name}</h3>
      {distance && <p>{formatDistance(distance)}</p>}
    </div>
  );
}
```

### 3. Chat with Location Sharing

```javascript
import { shareLocation, stopLocationShare } from '../utils/api';

function ChatWindow({ conversationId }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShareLocation = async () => {
    const position = await getCurrentLocation();
    await shareLocation(conversationId, {
      latitude: position.latitude,
      longitude: position.longitude
    });
    setIsSharing(true);
  };

  const handleStopShare = async () => {
    await stopLocationShare(conversationId);
    setIsSharing(false);
  };

  return (
    <div>
      <button onClick={handleShareLocation}>
        Share Location
      </button>
      {isSharing && (
        <div>You are sharing your location...</div>
      )}
    </div>
  );
}
```

## Environment Setup

No additional API keys required! The system uses OpenStreetMap Nominatim which is free and doesn't require authentication.

However, for production, consider:
1. Adding rate limiting (Nominatim: 1 request/second)
2. Setting proper User-Agent header (required by Nominatim)

## Performance Tips

1. **Caching**: Cache reverse geocode results to avoid repeated API calls
2. **Debouncing**: Use debounced search for autocomplete (already implemented)
3. **Rate Limiting**: Respect Nominatim's 1 request/second limit
4. **Batch Operations**: Combine multiple distance calculations in one API call

## Testing

### Test Location Detection
```javascript
import { getCurrentLocation } from './utils/locationUtils';

// Test getting current location
getCurrentLocation()
  .then(location => console.log('Location:', location))
  .catch(error => console.error('Error:', error));
```

### Test Distance Calculation
```javascript
import { calculateDistance, formatDistance } from './utils/locationUtils';

// Calculate distance between Abuja and Lagos
const distance = calculateDistance(9.0579, 7.4951, 6.5244, 3.3792);
console.log(formatDistance(distance)); // "457.2 km away"
```

## Troubleshooting

### Issue: Location permission denied
**Solution**: Show fallback manual location selection using LocationAutocomplete component.

### Issue: Nominatim rate limiting
**Solution**: Implement caching or increase delay between requests.

### Issue: Inaccurate distance calculations
**Solution**: Ensure coordinates are in decimal degrees format (not DMS).

## Next Steps

To fully implement the location system:

1. ✅ Backend location service (done)
2. ✅ API endpoints (done)
3. ✅ Frontend utilities (done)
4. ✅ Location hooks (done)
5. ✅ Autocomplete component (done)
6. ⏳ Update signup/login pages to use location detection
7. ⏳ Update job feed to display distances
8. ⏳ Update professional cards to show distances
9. ⏳ Add location sharing to chat
10. ⏳ Add map integration to dashboards

## Support

For issues or questions about the location system, refer to this documentation or check the implementation files.

---

**Created**: 2024
**Version**: 1.0
**Tech Stack**: React, Node.js, MongoDB, Leaflet, OpenStreetMap

