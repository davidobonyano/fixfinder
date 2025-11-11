import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUpload, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaMagic
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

  const inputClasses = (hasError = false) =>
    `w-full px-4 py-3 border-2 rounded-xl bg-white transition-all focus:outline-none ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`;

  const textareaClasses = (hasError = false) =>
    `w-full px-4 py-3 border-2 rounded-xl bg-white transition-all focus:outline-none resize-none ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`;

  const selectClasses = (hasError = false) =>
    `w-full px-4 py-3 border-2 rounded-xl bg-white transition-all focus:outline-none appearance-none ${
      hasError
        ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`;

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 opacity-10 rounded-full -ml-24 -mb-24" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 uppercase text-sm tracking-[0.2em] text-amber-200">
            <FaMagic className="w-5 h-5 animate-pulse" />
            <span>Post a job</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
            Describe your project and we’ll match you with the perfect professional
          </h1>
          <p className="text-indigo-100 text-lg max-w-2xl">
            Capture the essentials, set your timeline, and go live in minutes. Your request lands instantly with verified FixFinder experts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md">
              <FaMagic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
              <p className="text-sm text-gray-500">Share what you need help with — the more specific, the better.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>Job Title *</span>
                <span className="text-xs font-medium text-gray-400">{formData.title.length}/100</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Fix leaking kitchen sink"
                className={inputClasses(!!errors.title)}
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>Description *</span>
                <span className="text-xs font-medium text-gray-400">{formData.description.length}/1000</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Provide detailed information about what needs to be done..."
                className={textareaClasses(!!errors.description)}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                <span>Requirements (optional)</span>
                <span className="text-xs font-medium text-gray-400">{formData.requirements.length}/500</span>
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={3}
                placeholder="List specific requirements, materials, access details, or constraints..."
                className={textareaClasses(!!errors.requirements)}
                maxLength={500}
              />
              {errors.requirements && (
                <p className="mt-2 text-sm text-red-500">{errors.requirements}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Service Category *</label>
              <div className="rounded-xl border-2 border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <ServiceSelector
                  value={formData.category}
                  onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  placeholder="Search and select a service..."
                  showSuggestions={true}
                  allowCustom={false}
                />
              </div>
              {errors.category && (
                <p className="mt-2 text-sm text-red-500">{errors.category}</p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md">
              <FaMapMarkerAlt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Location</h2>
              <p className="text-sm text-gray-500">Help your professional understand where the job will happen.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">State & LGA *</label>
              <div className="rounded-xl border-2 border-gray-200 p-1 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <LocationSelector
                  value={{ state: locationForm.state, city: locationForm.city, neighborhood: locationForm.neighbourhood }}
                  onChange={(val) => setLocationForm(prev => ({ ...prev, state: val.state || '', city: val.city || val.lga || '', neighbourhood: val.neighborhood || '' }))}
                  enforceNigeria
                />
              </div>
              {(errors['location.state'] || errors['location.city']) && (
                <p className="mt-2 text-sm text-red-500">{errors['location.state'] || errors['location.city']}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Neighbourhood / Address (optional)</label>
              <input
                type="text"
                value={locationForm.neighbourhood}
                onChange={(e) => setLocationForm(prev => ({ ...prev, neighbourhood: e.target.value }))}
                placeholder="e.g., Tajudeen Alli Street"
                className={inputClasses(false)}
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md">
              <FaClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Budget & Schedule</h2>
              <p className="text-sm text-gray-500">Set expectations for time and investment.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Budget Range (₦) *</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    name="budget.min"
                    value={formData.budget.min}
                    onChange={handleChange}
                    placeholder="Min"
                    className={inputClasses(!!errors['budget.min'])}
                  />
                  {errors['budget.min'] && (
                    <p className="mt-2 text-sm text-red-500">{errors['budget.min']}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    name="budget.max"
                    value={formData.budget.max}
                    onChange={handleChange}
                    placeholder="Max"
                    className={inputClasses(!!errors['budget.max'])}
                  />
                  {errors['budget.max'] && (
                    <p className="mt-2 text-sm text-red-500">{errors['budget.max']}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
                Preferred Date *
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={inputClasses(!!errors.preferredDate)}
              />
              {errors.preferredDate && (
                <p className="mt-2 text-sm text-red-500">{errors.preferredDate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FaClock className="w-4 h-4 text-indigo-500" />
                Preferred Time
              </label>
              <div className="relative">
                <select
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                  className={selectClasses(false)}
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Morning (6AM-12PM)">Morning (6AM-12PM)</option>
                  <option value="Afternoon (12PM-6PM)">Afternoon (12PM-6PM)</option>
                  <option value="Evening (6PM-10PM)">Evening (6PM-10PM)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FaExclamationTriangle className="w-4 h-4 text-amber-500" />
                Urgency Level
              </label>
              <div className="flex flex-wrap gap-3">
                {['Regular', 'Urgent'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.urgency === option
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={option}
                      checked={formData.urgency === option}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md">
              <FaUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Photo (Optional)</h2>
              <p className="text-sm text-gray-500">A quick snapshot helps pros understand the task at a glance.</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center bg-gradient-to-br from-indigo-50 to-indigo-100 hover:border-indigo-400 transition-all">
            <FaUpload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Upload one clear photo of your project</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-md hover:shadow-lg cursor-pointer transition-all"
            >
              Choose Photo
            </label>
          </div>

          {formData.media.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.media.map((item, index) => (
                <div key={index} className="relative group">
                  <img
                    src={item.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-28 object-cover rounded-xl border border-indigo-100 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute -top-2 -right-2 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg hover:from-red-500 hover:to-red-600 transition-all"
                  >
                    <FaTimes className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl text-indigo-600">
                <FaCheckCircle className="w-4 h-4" />
              </div>
              <span>Your job goes live instantly for nearby, verified professionals.</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Job'
              )}
            </button>
          </div>
        </section>

        {errors.submit && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 rounded-xl p-4 shadow-sm">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
};

export default PostJob;
