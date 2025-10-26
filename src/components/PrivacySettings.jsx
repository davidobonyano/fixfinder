import { useState, useEffect } from 'react';
import { 
  FaEye, 
  FaEyeSlash, 
  FaMapMarkerAlt, 
  FaClock, 
  FaShieldAlt,
  FaSave,
  FaSpinner
} from 'react-icons/fa';

const PrivacySettings = ({ 
  isOpen, 
  onClose, 
  onSave,
  currentSettings = {},
  isLoading = false 
}) => {
  const [settings, setSettings] = useState({
    locationSharingEnabled: true,
    locationSharingDuration: 30, // minutes
    autoStopLocationSharing: true,
    showOnlineStatus: true,
    showLastSeen: true,
    allowLocationRequests: true,
    requireLocationPermission: true,
    ...currentSettings
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings({
      locationSharingEnabled: true,
      locationSharingDuration: 30,
      autoStopLocationSharing: true,
      showOnlineStatus: true,
      showLastSeen: true,
      allowLocationRequests: true,
      requireLocationPermission: true,
      ...currentSettings
    });
  }, [currentSettings]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(settings);
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaShieldAlt className="w-5 h-5 text-blue-600" />
            Privacy Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Location Sharing Settings */}
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4 text-green-600" />
              Location Sharing
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Enable Location Sharing</p>
                  <p className="text-xs text-gray-500">Allow sharing your location with others</p>
                </div>
                <button
                  onClick={() => handleSettingChange('locationSharingEnabled', !settings.locationSharingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.locationSharingEnabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.locationSharingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.locationSharingEnabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Auto-stop After</p>
                      <p className="text-xs text-gray-500">Automatically stop sharing after specified time</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('autoStopLocationSharing', !settings.autoStopLocationSharing)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoStopLocationSharing ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.autoStopLocationSharing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.autoStopLocationSharing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <select
                        value={settings.locationSharingDuration}
                        onChange={(e) => handleSettingChange('locationSharingDuration', parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Require Permission Each Time</p>
                      <p className="text-xs text-gray-500">Ask for location permission every session</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('requireLocationPermission', !settings.requireLocationPermission)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.requireLocationPermission ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.requireLocationPermission ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Allow Location Requests</p>
                      <p className="text-xs text-gray-500">Let others request your location</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('allowLocationRequests', !settings.allowLocationRequests)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.allowLocationRequests ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.allowLocationRequests ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Presence Settings */}
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FaEye className="w-4 h-4 text-blue-600" />
              Online Status
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Online Status</p>
                  <p className="text-xs text-gray-500">Let others see when you're online</p>
                </div>
                <button
                  onClick={() => handleSettingChange('showOnlineStatus', !settings.showOnlineStatus)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showOnlineStatus ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Last Seen</p>
                  <p className="text-xs text-gray-500">Let others see when you were last active</p>
                </div>
                <button
                  onClick={() => handleSettingChange('showLastSeen', !settings.showLastSeen)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.showLastSeen ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showLastSeen ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FaShieldAlt className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Privacy Notice</p>
                <p className="text-xs text-blue-600 mt-1">
                  Your location data is only shared with people you explicitly choose to share with. 
                  Location sharing automatically expires based on your settings to protect your privacy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaSave className="w-4 h-4" />
            )}
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;



