import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUpload, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { createJob, snapToLGAApi } from '../../utils/api';
import LocationSelector from '../../components/LocationSelector';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import ServiceSelector from '../../components/ServiceSelector';

const PostJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    category: '',
    location: {},
    budget: {
      min: '',
      max: ''
    },
    preferredDate: '',
    preferredTime: 'Flexible',
    urgency: 'Regular',
    media: []
  });
  const { location: detectedLocation } = useLocationHook(false);
  const [locationForm, setLocationForm] = useState({ state: '', city: '', neighbourhood: '' });
  const [errors, setErrors] = useState({});
  // Using unified ServiceSelector; no local categories list needed

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time validation for key fields
    if (name === 'title' && value.trim().length > 0 && value.trim().length < 5) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Title must be at least 5 characters'
      }));
    } else if (name === 'description' && value.trim().length > 0 && value.trim().length < 10) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Description must be at least 10 characters'
      }));
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const firstImage = files.find(f => f.type.startsWith('image/'));
    if (!firstImage) return;
    const newItem = {
      file: firstImage,
      preview: URL.createObjectURL(firstImage),
      type: 'image'
    };
    setFormData(prev => ({
      ...prev,
      media: [newItem]
    }));
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Title validation (5-100 characters)
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must not exceed 100 characters';
    }

    // Description validation (10-1000 characters)
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Service category is required';
    }

    // Location validation: require State & LGA
    if (!locationForm.state) {
      newErrors['location.state'] = 'State is required';
    }
    if (!locationForm.city) {
      newErrors['location.city'] = 'LGA is required';
    }

    // Budget validation
    if (!formData.budget.min) {
      newErrors['budget.min'] = 'Minimum budget is required';
    } else if (isNaN(formData.budget.min) || parseFloat(formData.budget.min) < 0) {
      newErrors['budget.min'] = 'Minimum budget must be a positive number';
    }

    if (!formData.budget.max) {
      newErrors['budget.max'] = 'Maximum budget is required';
    } else if (isNaN(formData.budget.max) || parseFloat(formData.budget.max) < 0) {
      newErrors['budget.max'] = 'Maximum budget must be a positive number';
    }

    // Validate budget range
    if (formData.budget.min && formData.budget.max && 
        parseFloat(formData.budget.min) >= parseFloat(formData.budget.max)) {
      newErrors['budget.max'] = 'Maximum budget must be greater than minimum';
    }

    // Date validation
    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Preferred date is required';
    } else {
      const selectedDate = new Date(formData.preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.preferredDate = 'Preferred date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setErrors({ submit: 'You must be logged in to post a job. Please log in first.' });
      return;
    }

    // Check if user has a valid token
    const token = localStorage.getItem('token');
    if (!token) {
      setErrors({ submit: 'No authentication token found. Please log in again.' });
      return;
    }

    setLoading(true);
    
    try {
      // Prepare job data for API
      // Get precise coords and snap to LGA/State (gesture: form submit)
      let lat = null, lon = null, lga = locationForm.city || '', state = locationForm.state || '';
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        // If selector empty or we want authoritative snap, try server snap
        if (!lga || !state) {
          try {
            const snap = await snapToLGAApi(lat, lon);
            lga = lga || snap?.data?.lga || '';
            state = state || snap?.data?.state || '';
          } catch {}
        }
      } catch {}

      const composedAddress = [locationForm.neighbourhood, lga, state, 'Nigeria'].filter(Boolean).join(', ');
      // Build multipart FormData for single image upload + JSON fields
      const form = new FormData();
      form.append('title', formData.title.trim());
      form.append('description', formData.description.trim());
      if (formData.requirements?.trim()) form.append('requirements', formData.requirements.trim());
      form.append('category', formData.category.trim());
      form.append('location.address', composedAddress || `${lga || ''}${lga && state ? ', ' : ''}${state || ''}`);
      form.append('location.city', lga || '');
      form.append('location.state', state || '');
      if (lat && lon) {
        form.append('location.coordinates.lat', String(lat));
        form.append('location.coordinates.lng', String(lon));
      }
      form.append('budget.min', String(parseFloat(formData.budget.min)));
      form.append('budget.max', String(parseFloat(formData.budget.max)));
      form.append('preferredDate', new Date(formData.preferredDate).toISOString());
      form.append('preferredTime', formData.preferredTime);
      form.append('urgency', formData.urgency);
      if (formData.media[0]?.file) {
        form.append('media', formData.media[0].file);
      }

      const response = await createJob(form);
      
      if (response.success) {
        // Redirect to my jobs page
        navigate('/dashboard/my-jobs');
      } else {
        setErrors({ submit: response.message || 'Failed to post job. Please try again.' });
      }
    } catch (error) {
      console.error('Error posting job:', error);
      console.error('Error data:', error.data);
      console.error('Error status:', error.status);
      
      // Handle validation errors from backend
      if (error.data && error.data.errors && Array.isArray(error.data.errors)) {
        console.log('Validation errors:', error.data.errors);
        console.log('Full error data:', JSON.stringify(error.data, null, 2));
        const validationErrors = {};
        error.data.errors.forEach(err => {
          console.log('Validation error details:', {
            path: err.path,
            msg: err.msg,
            value: err.value,
            location: err.location
          });
          if (err.path) {
            // Map backend field names to frontend field names
            const fieldMap = {
              'title': 'title',
              'description': 'description',
              'category': 'category',
              'location.address': 'location.address',
              'location.city': 'location.city',
              'location.state': 'location.state',
              'budget.min': 'budget.min',
              'budget.max': 'budget.max',
              'preferredDate': 'preferredDate',
              'preferredTime': 'preferredTime',
              'urgency': 'urgency'
            };
            const frontendField = fieldMap[err.path] || err.path;
            validationErrors[frontendField] = err.msg;
          }
        });
        setErrors(validationErrors);
      } else {
        setErrors({ submit: error.message || 'Failed to post job. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Post a Job</h1>
        <p className="text-gray-600">
          Describe your project and find the right professional for the job.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
          
          {/* Job Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title * ({formData.title.length}/100)
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Fix leaking kitchen sink"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description * ({formData.description.length}/1000)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide detailed information about what needs to be done..."
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Requirements (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements (optional) ({formData.requirements.length}/500)
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows={3}
              placeholder="List any specific requirements, materials, access, or constraints..."
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                errors.requirements ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={500}
            />
            {errors.requirements && (
              <p className="mt-1 text-sm text-red-600">{errors.requirements}</p>
            )}
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Category *
            </label>
            <ServiceSelector
              value={formData.category}
              onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              placeholder="Search and select a service..."
              showSuggestions={true}
              allowCustom={false}
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaMapMarkerAlt className="w-5 h-5" />
            Location
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State & LGA *</label>
              <LocationSelector
                value={{ state: locationForm.state, city: locationForm.city, neighborhood: locationForm.neighbourhood }}
                onChange={(val) => setLocationForm(prev => ({ ...prev, state: val.state || '', city: val.city || val.lga || '', neighbourhood: val.neighborhood || '' }))}
                enforceNigeria
              />
              {(errors['location.state'] || errors['location.city']) && (
                <p className="mt-1 text-sm text-red-600">{errors['location.state'] || errors['location.city']}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Neighbourhood / Address (optional)</label>
              <input
                type="text"
                value={locationForm.neighbourhood}
                onChange={(e) => setLocationForm(prev => ({ ...prev, neighbourhood: e.target.value }))}
                placeholder="e.g., Tajudeen Alli Street"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Budget & Schedule */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget & Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Range (₦) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    name="budget.min"
                    value={formData.budget.min}
                    onChange={handleChange}
                    placeholder="Min"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                      errors['budget.min'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['budget.min'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['budget.min']}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    name="budget.max"
                    value={formData.budget.max}
                    onChange={handleChange}
                    placeholder="Max"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                      errors['budget.max'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['budget.max'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['budget.max']}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4" />
                Preferred Date *
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                  errors.preferredDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.preferredDate && (
                <p className="mt-1 text-sm text-red-600">{errors.preferredDate}</p>
              )}
            </div>
          </div>

          {/* Preferred Time */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FaClock className="w-4 h-4" />
              Preferred Time
            </label>
            <select
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="Flexible">Flexible</option>
              <option value="Morning (6AM-12PM)">Morning (6AM-12PM)</option>
              <option value="Afternoon (12PM-6PM)">Afternoon (12PM-6PM)</option>
              <option value="Evening (6PM-10PM)">Evening (6PM-10PM)</option>
            </select>
          </div>

          {/* Urgency */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FaExclamationTriangle className="w-4 h-4" />
              Urgency Level
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="Regular"
                  checked={formData.urgency === 'Regular'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Regular
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="Urgent"
                  checked={formData.urgency === 'Urgent'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Urgent
              </label>
            </div>
          </div>
        </div>

        {/* Media Upload (single photo) */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo (Optional)</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FaUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Upload one photo of your project</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="inline-block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
            >
              Choose Photo
            </label>
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.media.map((item, index) => (
                <div key={index} className="relative">
                  <img
                    src={item.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <FaCheckCircle className="w-4 h-4 inline mr-2" />
              Your job will be visible to relevant professionals
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Posting Job...
                </>
              ) : (
                'Post Job'
              )}
            </button>
          </div>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{errors.submit}</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PostJob;
