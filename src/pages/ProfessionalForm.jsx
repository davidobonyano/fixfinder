import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProfessional, createProfessional, updateProfessional, uploadProfessionalMedia } from '../utils/api';
import { FaUpload, FaTrash, FaPlus, FaSpinner } from 'react-icons/fa';

const ProfessionalForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    city: '',
    bio: '',
    yearsOfExperience: 0,
    pricePerHour: 0,
    languages: [],
    certifications: []
  });

  const [languageInput, setLanguageInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchProfessional = async () => {
        try {
          setLoading(true);
          const response = await getProfessional(id);
          const professional = response.professional;
          
          setFormData({
            name: professional.name || '',
            category: professional.category || '',
            city: professional.city || '',
            bio: professional.bio || '',
            yearsOfExperience: professional.yearsOfExperience || 0,
            pricePerHour: professional.pricePerHour || 0,
            languages: professional.languages || [],
            certifications: professional.certifications || []
          });
          
          setPhotos(professional.photos || []);
          setVideos(professional.videos || []);
        } catch (err) {
          setError(err.message || 'Failed to fetch professional details');
        } finally {
          setLoading(false);
        }
      };

      fetchProfessional();
    }
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, languageInput.trim()]
      }));
      setLanguageInput('');
    }
  };

  const handleRemoveLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const handleAddCertification = () => {
    if (certificationInput.trim() && !formData.certifications.includes(certificationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, certificationInput.trim()]
      }));
      setCertificationInput('');
    }
  };

  const handleRemoveCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (files, type) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      
      Array.from(files).forEach(file => {
        formData.append(type === 'photos' ? 'images' : 'videos', file);
      });

      const response = await uploadProfessionalMedia(id || 'new', formData);
      
      if (type === 'photos') {
        setPhotos(prev => [...prev, ...response.professional.photos.slice(prev.length)]);
      } else {
        setVideos(prev => [...prev, ...response.professional.videos.slice(prev.length)]);
      }
    } catch (err) {
      setError(err.message || `Failed to upload ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await updateProfessional(id, formData);
      } else {
        const response = await createProfessional(formData);
        navigate(`/professionals/${response.professional._id}`);
        return;
      }
      
      navigate(`/professionals/${id}`);
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} professional`);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'plumber', 'electrician', 'mechanic', 'hairdresser', 
    'carpenter', 'painter', 'tailor', 'barber'
  ];

  const cities = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin', 'Kano', 'Ibadan'];

  if (loading && isEdit) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading professional details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/professionals"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center mb-4"
        >
          ← Back to Professionals
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEdit ? 'Edit Professional' : 'Add New Professional'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isEdit ? 'Update professional information and media' : 'Create a new professional profile'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Professional name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select city</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Hour (₦)
              </label>
              <input
                type="number"
                name="pricePerHour"
                value={formData.pricePerHour}
                onChange={handleInputChange}
                min="0"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about your experience and services..."
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              name="yearsOfExperience"
              value={formData.yearsOfExperience}
              onChange={handleInputChange}
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Languages</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a language"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
            />
            <button
              type="button"
              onClick={handleAddLanguage}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((language, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {language}
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FaTrash className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Certifications</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={certificationInput}
              onChange={(e) => setCertificationInput(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a certification"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCertification())}
            />
            <button
              type="button"
              onClick={handleAddCertification}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.certifications.map((cert, index) => (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {cert}
                <button
                  type="button"
                  onClick={() => handleRemoveCertification(index)}
                  className="text-green-600 hover:text-green-800"
                >
                  <FaTrash className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Media Upload */}
        {isEdit && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Media</h2>
            
            {/* Photos */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Photos</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'photos')}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer flex flex-col items-center ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? (
                    <FaSpinner className="text-4xl text-gray-400 mb-2 animate-spin" />
                  ) : (
                    <FaUpload className="text-4xl text-gray-400 mb-2" />
                  )}
                  <span className="text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload photos'}
                  </span>
                </label>
              </div>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Videos</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'videos')}
                  className="hidden"
                  id="video-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="video-upload"
                  className={`cursor-pointer flex flex-col items-center ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? (
                    <FaSpinner className="text-4xl text-gray-400 mb-2 animate-spin" />
                  ) : (
                    <FaUpload className="text-4xl text-gray-400 mb-2" />
                  )}
                  <span className="text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload videos'}
                  </span>
                </label>
              </div>
              
              {videos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {videos.map((video, index) => (
                    <div key={index} className="relative">
                      <video
                        src={video}
                        controls
                        className="w-full rounded-lg"
                        poster={photos[0]}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link
            to="/professionals"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <FaSpinner className="animate-spin" />}
            {isEdit ? 'Update Professional' : 'Create Professional'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfessionalForm;









