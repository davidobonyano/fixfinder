# Enhanced Chat System with Location Sharing

## Overview

This enhanced chat system provides real-time messaging with advanced location sharing capabilities, built with Socket.IO for real-time communication and Leaflet for map visualization.

## Core Features

### ✅ Text Messages
- Real-time messaging via Socket.IO
- Message pagination (20 messages per load)
- Message threading and replies
- Message editing (within 2 minutes)
- Message deletion (soft delete)

### ✅ Read Receipts
- Seen/delivered status per message
- Real-time read status updates
- Visual indicators (single/double checkmarks)

### ✅ Typing Indicators
- "User is typing..." feedback
- Auto-clear after 3 seconds
- Real-time typing status

### ✅ Online Status
- Real-time presence updates
- Last seen timestamps
- Online/offline indicators

### ✅ Location Sharing System
- **Share Location**: One-time location sharing with confirmation modal
- **Live Location**: Real-time location tracking with automatic updates
- **Stop Sharing**: Manual or automatic stop with privacy controls
- **Map Integration**: Interactive Leaflet maps with distance calculation
- **Privacy Controls**: Session management and automatic expiration

## Socket.IO Events

### Client → Server Events
```javascript
// Text messaging
socket.emit('send_message', { conversationId, ...message });

// Typing indicators
socket.emit('user_typing', { conversationId, userId, userName });

// Message read receipts
socket.emit('message_read', { conversationId, messageId, readAt });

// Location sharing
socket.emit('share_location', { senderId, receiverId, location });

// Live location updates
socket.emit('update_location', { userId, lat, lng, conversationId });

// Stop location sharing
socket.emit('stop_location_share', { userId, conversationId });

// User status
socket.emit('user_status', { conversationId, userId, status });
```

### Server → Client Events
```javascript
// Message delivery
socket.on('receive_message', (message) => {});

// Typing indicators
socket.on('user_typing', (data) => {});

// Read receipts
socket.on('message_read', (data) => {});

// Location sharing
socket.on('receive_location', (data) => {});

// Live location updates
socket.on('location_update', (data) => {});

// Stop location sharing
socket.on('stop_location_update', (data) => {});

// Presence updates
socket.on('presence:update', (data) => {});
```

## API Endpoints

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `POST /api/messages/conversations` - Create or get conversation
- `GET /api/messages/conversations/:id` - Get messages for conversation
- `POST /api/messages/conversations/:id` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/conversations/:id/read` - Mark as read

### Location Sharing
- `POST /api/messages/conversations/:id/location-share` - Start location sharing
- `POST /api/messages/conversations/:id/stop-location-share` - Stop location sharing

## Components

### Core Components
- **ChatWindow**: Main chat interface with message list and input
- **MessageBubble**: Individual message display with actions
- **ChatHeader**: Conversation header with user info and actions
- **LocationModal**: Location sharing confirmation modal
- **MapView**: Interactive map for viewing shared locations
- **LocationButton**: Toggle button for location sharing
- **PrivacySettings**: Privacy controls and session management

### Utility Components
- **useLocationSessionManager**: Hook for managing location sharing sessions
- **SocketContext**: Socket.IO connection management

## Location Sharing Flow

### 1. Share Location
```
User clicks "Share Location"
→ LocationModal appears with confirmation
→ User confirms and grants location permission
→ Location is fetched via navigator.geolocation
→ Message is sent via API
→ Socket.IO event is emitted to receiver
→ Map view shows shared location
```

### 2. Live Location Updates
```
User enables live location sharing
→ navigator.geolocation.watchPosition() starts
→ Location updates every 30 seconds
→ Socket.IO events broadcast updates
→ Map markers update in real-time
→ Distance calculations update
```

### 3. Stop Sharing
```
User clicks "Stop Sharing" OR timer expires
→ Stop sharing API call
→ Socket.IO stop event is emitted
→ Map markers are removed
→ Session is cleared
```

## Privacy & Security

### Location Privacy
- **Permission Required**: Each session requires explicit permission
- **Auto-Expiration**: Location sharing expires automatically (5min - 2hrs)
- **Manual Control**: Users can stop sharing anytime
- **No Storage**: Live coordinates are not permanently stored
- **Throttling**: Updates limited to once every 30 seconds

### Session Management
- **Automatic Cleanup**: Sessions expire based on user settings
- **Manual Override**: Users can stop sharing manually
- **Disconnect Handling**: Location sharing stops when user disconnects
- **Privacy Settings**: Granular control over sharing preferences

## Map Features

### Interactive Map (Leaflet)
- **Custom Markers**: Different colors for own vs others' locations
- **Distance Calculation**: Real-time distance between users
- **Popup Information**: User details, distance, accuracy, timestamp
- **External Maps**: Direct links to Google Maps, Apple Maps
- **Responsive Design**: Works on mobile and desktop

### Map Controls
- **Zoom Controls**: Standard Leaflet zoom controls
- **Center on User**: Auto-center on user's location
- **Fit Bounds**: Auto-fit to show all shared locations
- **Toggle Visibility**: Show/hide own location

## Usage Examples

### Basic Message Sending
```javascript
const sendMessage = async (conversationId, content) => {
  const response = await sendMessage(conversationId, {
    content: { text: content },
    messageType: 'text'
  });
  
  if (socket && isConnected) {
    socket.emit('send_message', {
      ...response.data,
      conversationId
    });
  }
};
```

### Location Sharing
```javascript
const shareLocation = async (conversationId) => {
  const location = await getCurrentPosition();
  
  const response = await shareLocation(conversationId, {
    lat: location.latitude,
    lng: location.longitude,
    accuracy: location.accuracy
  });
  
  if (socket && isConnected) {
    socket.emit('share_location', {
      senderId: user.id,
      receiverId: otherUserId,
      location: {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      }
    });
  }
};
```

### Live Location Updates
```javascript
const startLiveLocation = () => {
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      socket.emit('update_location', {
        userId: user.id,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        conversationId
      });
    },
    (error) => console.error('Location error:', error),
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
  
  return watchId;
};
```

## Configuration

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
MONGO_URI=your-mongodb-uri
```

### Socket.IO Configuration
```javascript
const socket = io(API_BASE_URL, {
  auth: {
    token: localStorage.getItem('token'),
    userId: user.id,
    userType: user.role
  }
});
```

## Performance Considerations

### Optimization
- **Message Pagination**: Load 20 messages at a time
- **Throttling**: Location updates limited to 30-second intervals
- **Memory Management**: Clear timers and intervals on unmount
- **Lazy Loading**: Map components load only when needed

### Storage
- **Minimal Storage**: Only essential message data stored
- **No Live Coordinates**: Real-time location not permanently stored
- **Session-Based**: Location sharing tied to active sessions

## Browser Compatibility

### Required APIs
- **Geolocation API**: For location access
- **WebSocket**: For Socket.IO communication
- **Canvas API**: For Leaflet map rendering

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Mobile Considerations

### Responsive Design
- **Touch-Friendly**: Large touch targets for mobile
- **Adaptive Layout**: Different layouts for mobile/desktop
- **Native Maps**: Direct links to native map apps

### Performance
- **Battery Optimization**: Efficient location tracking
- **Network Efficiency**: Minimal data usage
- **Background Handling**: Proper cleanup on app background

## Troubleshooting

### Common Issues
1. **Location Permission Denied**: Check browser permissions
2. **Socket Connection Failed**: Verify authentication token
3. **Map Not Loading**: Check Leaflet CSS/JS imports
4. **Location Updates Stop**: Check battery optimization settings

### Debug Mode
```javascript
// Enable Socket.IO debug logging
localStorage.debug = 'socket.io-client:*';
```

## Future Enhancements

### Planned Features
- **Group Location Sharing**: Share with multiple users
- **Location History**: View past shared locations
- **Geofencing**: Location-based notifications
- **Offline Support**: Queue messages when offline
- **Voice Messages**: Audio message support
- **File Sharing**: Document and media sharing

### Integration Opportunities
- **Push Notifications**: Real-time message alerts
- **Calendar Integration**: Location-based scheduling
- **Payment Integration**: Location-based payments
- **Analytics**: Usage and engagement metrics



