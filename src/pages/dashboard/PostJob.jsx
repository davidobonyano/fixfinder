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
import { createJob } from '../../utils/api';

const PostJob = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: {
      address: '',
      city: '',
      state: ''
    },
    budget: {
      min: '',
      max: ''
    },
    preferredDate: '',
    preferredTime: 'Flexible',
    urgency: 'Regular',
    media: []
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  // Load categories from services data
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // This would be an API call in real implementation
        const mockCategories = [
          'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Mechanic',
          'AC Technician', 'Generator Repairer', 'Tailor', 'Hair Stylist',
          'Barber', 'Makeup Artist', 'Caregiver', 'Photographer', 'Videographer',
          'Caterer', 'Driver Hire', 'Laptop Repair', 'Smartphone Repair',
          'CCTV Installation', 'Solar Panel Installation', 'Locksmith',
          'Refrigerator Repair', 'Washing Machine Repair', 'Nail Technician',
          'Website Design', 'Graphic Design', 'Event Planning', 'DJ', 'MC Host',
          'Massage Therapy', 'House Cleaning', 'Gardener', 'Security Guard',
          'Tutor', 'Translator', 'Accountant', 'Lawyer', 'Doctor', 'Nurse',
          'Pharmacist', 'Dentist', 'Veterinarian', 'Real Estate Agent',
          'Insurance Agent', 'Banking Consultant', 'Travel Agent',
          'Fitness Trainer', 'Yoga Instructor', 'Music Teacher', 'Art Teacher',
          'Language Teacher', 'Computer Repair', 'Network Engineer', 'App Developer'
        ];
        setCategories(mockCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

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
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }));
    
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
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

    // Location validation
    if (!formData.location.address.trim()) {
      newErrors['location.address'] = 'Address is required';
    } else if (formData.location.address.trim().length < 5) {
      newErrors['location.address'] = 'Address must be at least 5 characters';
    } else if (formData.location.address.trim().length > 200) {
      newErrors['location.address'] = 'Address must not exceed 200 characters';
    }

    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required';
    }

    if (!formData.location.state.trim()) {
      newErrors['location.state'] = 'State is required';
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
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        location: {
          address: formData.location.address.trim(),
          city: formData.location.city.trim(),
          state: formData.location.state.trim()
        },
        budget: {
          min: parseFloat(formData.budget.min),
          max: parseFloat(formData.budget.max)
        },
        preferredDate: new Date(formData.preferredDate).toISOString(),
        preferredTime: formData.preferredTime,
        urgency: formData.urgency,
        media: formData.media.map(item => ({
          type: item.type,
          url: item.preview, // In real implementation, this would be uploaded to Cloudinary first
          filename: item.file.name,
          size: item.file.size
        }))
      };

      console.log('Sending job data:', JSON.stringify(jobData, null, 2));
      console.log('User:', user);
      console.log('Auth token:', localStorage.getItem('token'));
      const response = await createJob(jobData);
      
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

          {/* Category */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                name="location.address"
                value={formData.location.address}
                onChange={handleChange}
                placeholder="Enter full address"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                  errors['location.address'] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors['location.address'] && (
                <p className="mt-1 text-sm text-red-600">{errors['location.address']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <select
                name="location.state"
                value={formData.location.state}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                  errors['location.state'] ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select State</option>
                <option value="Lagos">Lagos</option>
                <option value="Abuja">Abuja</option>
                <option value="Rivers">Rivers</option>
                <option value="Edo">Edo</option>
                <option value="Kano">Kano</option>
                <option value="Oyo">Oyo</option>
                <option value="Kaduna">Kaduna</option>
                <option value="Delta">Delta</option>
                <option value="Enugu">Enugu</option>
                <option value="Akwa Ibom">Akwa Ibom</option>
                <option value="Cross River">Cross River</option>
                <option value="Plateau">Plateau</option>
                <option value="Bauchi">Bauchi</option>
                <option value="Borno">Borno</option>
                <option value="Adamawa">Adamawa</option>
                <option value="Benue">Benue</option>
                <option value="Kogi">Kogi</option>
                <option value="Niger">Niger</option>
                <option value="Katsina">Katsina</option>
                <option value="Sokoto">Sokoto</option>
                <option value="Kebbi">Kebbi</option>
                <option value="Zamfara">Zamfara</option>
                <option value="Jigawa">Jigawa</option>
                <option value="Yobe">Yobe</option>
                <option value="Ebonyi">Ebonyi</option>
                <option value="Imo">Imo</option>
                <option value="Abia">Abia</option>
                <option value="Anambra">Anambra</option>
                <option value="Ogun">Ogun</option>
                <option value="Ondo">Ondo</option>
                <option value="Osun">Osun</option>
                <option value="Ekiti">Ekiti</option>
                <option value="Bayelsa">Bayelsa</option>
                <option value="Taraba">Taraba</option>
                <option value="Gombe">Gombe</option>
                <option value="Nasarawa">Nasarawa</option>
                <option value="Kwara">Kwara</option>
              </select>
              {errors['location.state'] && (
                <p className="mt-1 text-sm text-red-600">{errors['location.state']}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="location.city"
                value={formData.location.city}
                onChange={handleChange}
                placeholder="Enter city"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                  errors['location.city'] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors['location.city'] && (
                <p className="mt-1 text-sm text-red-600">{errors['location.city']}</p>
              )}
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

        {/* Media Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos/Videos (Optional)</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FaUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Upload photos or videos of your project</p>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="inline-block px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
            >
              Choose Files
            </label>
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.media.map((item, index) => (
                <div key={index} className="relative">
                  {item.type === 'image' ? (
                    <img
                      src={item.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={item.preview}
                      className="w-full h-24 object-cover rounded-lg"
                      controls
                    />
                  )}
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
