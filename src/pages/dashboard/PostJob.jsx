import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUpload,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiBriefcase,
  FiZap,
  FiLoader,
  FiImage,
  FiInfo,
  FiDollarSign
} from 'react-icons/fi';
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

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

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

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must not exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Service category is required';
    }

    if (!locationForm.state) {
      newErrors['location.state'] = 'State is required';
    }
    if (!locationForm.city) {
      newErrors['location.city'] = 'LGA is required';
    }

    if (!formData.budget.min) {
      newErrors['budget.min'] = 'Minimum budget is required';
    } else if (isNaN(formData.budget.min) || parseFloat(formData.budget.min) < 0) {
      newErrors['budget.min'] = 'Minimum budget must be positive';
    }

    if (!formData.budget.max) {
      newErrors['budget.max'] = 'Maximum budget is required';
    } else if (isNaN(formData.budget.max) || parseFloat(formData.budget.max) < 0) {
      newErrors['budget.max'] = 'Maximum budget must be positive';
    }

    if (formData.budget.min && formData.budget.max &&
      parseFloat(formData.budget.min) >= parseFloat(formData.budget.max)) {
      newErrors['budget.max'] = 'Max must be greater than min';
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Date is required';
    } else {
      const selectedDate = new Date(formData.preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.preferredDate = 'Cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      setErrors({ submit: 'Authentication required. Please log in.' });
      return;
    }

    setLoading(true);
    try {
      let lat = null, lon = null, lga = locationForm.city || '', state = locationForm.state || '';
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        if (!lga || !state) {
          try {
            const snap = await snapToLGAApi(lat, lon);
            lga = lga || snap?.data?.lga || '';
            state = state || snap?.data?.state || '';
          } catch { }
        }
      } catch { }

      const composedAddress = [locationForm.neighbourhood, lga, state, 'Nigeria'].filter(Boolean).join(', ');
      const form = new FormData();
      form.append('title', formData.title.trim());
      form.append('description', formData.description.trim());
      if (formData.requirements?.trim()) form.append('requirements', formData.requirements.trim());
      form.append('category', formData.category.trim());
      form.append('location.address', composedAddress);
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
        navigate('/dashboard/my-jobs');
      } else {
        setErrors({ submit: response.message || 'Transmission failure.' });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'System error during submission.' });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyStyles = (option) => {
    if (formData.urgency === option) {
      return option === 'Urgent'
        ? 'border-clay bg-clay/5 text-clay'
        : 'border-trust bg-trust/5 text-trust';
    }
    return 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200';
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      {/* Premium Hero Section */}
      <section className="mb-16">
        <div className="label-caps mb-4 text-trust">Direct Service Entry</div>
        <h1 className="text-4xl md:text-6xl font-tight font-bold text-charcoal tracking-tight leading-[0.95]">
          Secure expert help <br /> in minutes.
        </h1>
        <p className="mt-6 text-xl text-graphite max-w-2xl leading-relaxed">
          Describe your requirements, establish your timeframe, and broadcast to our verified network of local professionals.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Job Details Section */}
        <section className="card-premium bg-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <FiZap className="w-32 h-32 text-charcoal" />
          </div>

          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <FiBriefcase className="w-6 h-6 text-trust" />
            </div>
            <div>
              <h2 className="text-2xl font-tight font-bold text-charcoal">Project Scope</h2>
              <p className="text-stone-400 text-sm">Define the essential parameters of your request.</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="group">
              <label className="label-caps mb-3 block text-stone-400 group-focus-within:text-trust transition-colors">
                Primary Objective <span className="text-clay italic lowercase ">(required)</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Master Suite Electrical Overhaul"
                className={`input-field h-16 rounded-2xl text-lg font-medium ${errors.title ? 'border-clay' : 'border-stone-100'}`}
              />
              {errors.title && <p className="mt-2 text-xs font-bold text-clay uppercase tracking-widest">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group">
                <label className="label-caps mb-3 block text-stone-400">Classified Category</label>
                <div className="rounded-2xl border border-stone-100 focus-within:border-trust transition-all overflow-hidden">
                  <ServiceSelector
                    value={formData.category}
                    onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    placeholder="Search industry expertise..."
                    className="border-none h-16"
                  />
                </div>
                {errors.category && <p className="mt-2 text-xs font-bold text-clay uppercase tracking-widest">{errors.category}</p>}
              </div>

              <div className="group">
                <label className="label-caps mb-3 block text-stone-400">Preferred Timeline</label>
                <div className="relative">
                  <FiCalendar className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none" />
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    className="input-field h-16 pl-14 rounded-2xl font-medium"
                  />
                </div>
                {errors.preferredDate && <p className="mt-2 text-xs font-bold text-clay uppercase tracking-widest">{errors.preferredDate}</p>}
              </div>
            </div>

            <div className="group">
              <label className="label-caps mb-3 block text-stone-400">Detailed Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                placeholder="Provide a comprehensive breakdown of the necessary task, including any specific challenges or materials preferred..."
                className={`input-field p-6 rounded-2xl leading-relaxed ${errors.description ? 'border-clay' : 'border-stone-100'}`}
              />
              {errors.description && <p className="mt-2 text-xs font-bold text-clay uppercase tracking-widest">{errors.description}</p>}
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="card-premium bg-white p-8 md:p-12">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <FiMapPin className="w-6 h-6 text-trust" />
            </div>
            <div>
              <h2 className="text-2xl font-tight font-bold text-charcoal">Deployment Node</h2>
              <p className="text-stone-400 text-sm">Specify where the professional service will be rendered.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="label-caps mb-3 block text-stone-400">Regional Snap</label>
              <div className="rounded-2xl border border-stone-100 p-1 bg-stone-50/30">
                <LocationSelector
                  value={{ state: locationForm.state, city: locationForm.city, neighborhood: locationForm.neighbourhood }}
                  onChange={(val) => setLocationForm(prev => ({ ...prev, state: val.state || '', city: val.city || val.lga || '', neighbourhood: val.neighborhood || '' }))}
                />
              </div>
              {(errors['location.state'] || errors['location.city']) && <p className="mt-2 text-xs font-bold text-clay uppercase tracking-widest">Region identification required</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label-caps mb-3 block text-stone-400">Street / Neighbourhood Detail</label>
              <input
                type="text"
                value={locationForm.neighbourhood}
                onChange={(e) => setLocationForm(prev => ({ ...prev, neighbourhood: e.target.value }))}
                placeholder="e.g. 15 Admiralty Way, Lekki Phase 1"
                className="input-field h-16 rounded-2xl"
              />
            </div>
          </div>
        </section>

        {/* Investment Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="card-premium bg-white p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <FiDollarSign className="text-trust w-5 h-5" />
                <h3 className="text-lg font-tight font-bold uppercase tracking-widest">Budgeting</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    name="budget.min"
                    value={formData.budget.min}
                    onChange={handleChange}
                    placeholder="Min ₦"
                    className="input-field h-14 rounded-xl text-center font-bold"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    name="budget.max"
                    value={formData.budget.max}
                    onChange={handleChange}
                    placeholder="Max ₦"
                    className="input-field h-14 rounded-xl text-center font-bold"
                  />
                </div>
              </div>
            </div>
            {errors['budget.max'] && <p className="mt-4 text-[10px] font-bold text-clay uppercase">{errors['budget.max']}</p>}
          </div>

          <div className="card-premium bg-white p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <FiZap className="text-trust w-5 h-5" />
              <h3 className="text-lg font-tight font-bold uppercase tracking-widest">Priority</h3>
            </div>
            <div className="flex gap-4">
              {['Regular', 'Urgent'].map((option) => (
                <label
                  key={option}
                  className={`flex-1 flex items-center justify-center h-14 rounded-xl border font-bold text-[11px] uppercase tracking-widest cursor-pointer transition-all ${getUrgencyStyles(option)}`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={option}
                    checked={formData.urgency === option}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {option === 'Urgent' && <FiZap className="mr-2 w-3 h-3" />}
                  {option}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Media Upload */}
        <section className="card-premium bg-stone-50 p-8 border-dashed border-stone-200">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
              <FiImage className="text-trust w-6 h-6" />
            </div>
            <h3 className="text-lg font-tight font-bold text-charcoal">Visual Context</h3>
            <p className="text-stone-400 text-sm mb-8">A snapshot often clarifies requirements better than text alone.</p>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="btn-secondary px-8 py-3 text-[10px] uppercase tracking-widest cursor-pointer inline-flex items-center gap-2"
            >
              <FiUpload className="w-4 h-4" /> Upload Snapshot
            </label>

            {formData.media.length > 0 && (
              <div className="mt-8 flex gap-4">
                {formData.media.map((item, index) => (
                  <div key={index} className="relative group w-32 h-32 rounded-2xl overflow-hidden border-2 border-trust bg-white">
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute inset-0 bg-clay/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <FiX className="text-white w-6 h-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Status & Submit */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6">
          <div className="flex items-center gap-4 text-stone-400">
            <FiInfo className="w-5 h-5 text-trust" />
            <p className="text-sm font-medium">By broadcasting this request, you agree to our trust-ledger protocols.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto btn-primary bg-charcoal px-12 py-5 text-[11px] font-bold tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <FiLoader className="animate-spin w-4 h-4" /> TRANSMITTING...
              </span>
            ) : (
              "BROADCAST REQUEST"
            )}
          </button>
        </section>

        {errors.submit && (
          <div className="p-6 bg-clay/5 border border-clay/20 text-clay rounded-2xl text-center font-bold text-xs uppercase tracking-widest">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
};

export default PostJob;
