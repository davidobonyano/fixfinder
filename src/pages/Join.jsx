import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { createProfessional, uploadProfessionalMedia, registerUser, loginUser, getServicesApi, uploadProfilePicture, snapToLGAApi } from '../utils/api';
import ServiceSelector from '../components/ServiceSelector';
import LocationSelector from '../components/LocationSelector';
import {
  FaUser,
  FaTools,
  FaCamera,
  FaBriefcase,
  FaSpinner,
  FaMapMarkerAlt,
  FaImage
} from 'react-icons/fa';
import { useLocation } from '../hooks/useLocation';
import plumberIllustration from '../assets/animations/plumber.png';

const JoinAsPro = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const ALL_CATEGORIES = useMemo(() => [
    'plumber','electrician','carpenter','painter','mechanic','ac-technician','generator-repair',
    'tailor','hairdresser','barber','house-cleaning','photography','videographer','caterer',
    'driver-hire','laptop-repair','smartphone-repair','cctv-installation','solar-panel-installation',
    'locksmith','refrigerator-repair','washing-machine-repair','makeup-artist','nail-technician',
    'website-design','graphic-design','event-planning','dj','mc-host','massage-therapy'
  ], []);
  const [catalog, setCatalog] = useState(ALL_CATEGORIES);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    category: '',
    services: [],
    state: '',
    city: '',
    neighborhood: '',
    bio: '',
    yearsOfExperience: 0,
    price: 0,
    profilePhoto: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [showCategorySug, setShowCategorySug] = useState(false);
  const [showServiceSug, setShowServiceSug] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [detectError, setDetectError] = useState('');

  // Wizard state
  const steps = ['Account', 'Profile', 'Skills', 'Location', 'Experience', 'Photo', 'Review'];
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length - 1;
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // Auto-detect GPS location
  const { location: detected } = useLocation(true);
  const [autoDetectedPlace, setAutoDetectedPlace] = useState(null);
  useEffect(() => {
    const run = async () => {
      if (!detected?.latitude || !detected?.longitude) return;
      setDetectError('');
      setDetectingLoc(true);
      try {
        console.log('📍 GPS detected:', {
          latitude: detected.latitude,
          longitude: detected.longitude
        });
        // Use backend snap-to-LGA for authoritative LGA/State
        const snap = await snapToLGAApi(detected.latitude, detected.longitude);
        const snapped = snap?.data || null;
        console.log('🧭 Snap-to-LGA response:', snap);

        const normState = (snapped?.state === 'Federal Capital Territory') ? 'FCT' : (snapped?.state || '');
        const lga = snapped?.lga || '';

        console.log('✅ Prefill candidates:', { state: normState, lga });
        setAutoDetectedPlace({ city: lga, state: normState, country: 'Nigeria' });
        if ((lga || normState) && !formData.city && !formData.state) {
          console.log('✍️ Setting form prefill with detected State/LGA');
          setFormData(prev => ({ ...prev, city: lga, state: normState }));
        }
      } catch (e) {
        console.warn('⚠️ Auto-detect failed:', e);
        setDetectError('Could not auto-detect your State/LGA. Please select manually.');
      } finally {
        setDetectingLoc(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected?.latitude, detected?.longitude]);

  // Image compression utility
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getServicesApi();
        const names = Array.isArray(res) ? res.map((s) => (s?.name || '').toLowerCase().trim()).filter(Boolean) : [];
        const unique = Array.from(new Set(names));
        if (isMounted && unique.length) {
          setCatalog(unique);
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleChange = async (e) => {
    const { name, value, type, files } = e.target;
    if (name === 'profilePhoto' && files[0]) {
      setCompressing(true);
      try {
        const compressedFile = await compressImage(files[0]);
        const compressedFileWithName = new File([compressedFile], files[0].name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        const previewUrl = URL.createObjectURL(compressedFile);
        setImagePreview(previewUrl);
        setFormData(prev => ({ ...prev, [name]: compressedFileWithName }));
      } catch (err) {
        setFormData(prev => ({ ...prev, [name]: files[0] }));
      } finally {
        setCompressing(false);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'file' ? files[0] : value }));
    }
  };

  const addService = (svc) => {
    const v = (svc || '').toLowerCase().trim();
    if (!v) return;
    if (v === formData.category) return;
    if ((formData.services || []).includes(v)) return;
    setFormData({ ...formData, services: [...(formData.services || []), v] });
    setServiceQuery('');
  };

  const removeService = (svc) => {
    setFormData({ ...formData, services: (formData.services || []).filter((s) => s !== svc) });
  };

  const isInternational = (autoDetectedPlace?.country && autoDetectedPlace.country.toLowerCase() !== 'nigeria');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isInternational) {
        throw new Error('We currently serve Nigeria only. Please set a Nigerian state and city.');
      }

      if (!isAuthenticated) {
        if (!formData.email || !password || !formData.name) {
          throw new Error('Please provide name, email and password');
        }
        try {
          const reg = await registerUser({ name: formData.name, email: formData.email, password, role: 'professional' });
          if (reg?.token && reg?.user) {
            login(reg.token, reg.user);
          }
        } catch (regErr) {
          try {
            const log = await loginUser({ email: formData.email, password });
            if (log?.token && log?.user) {
              login(log.token, log.user);
            }
          } catch (logErr) {
            throw regErr;
          }
        }
      }

      const coordinates = (detected?.latitude && detected?.longitude)
        ? { lat: detected.latitude, lng: detected.longitude }
        : { lat: undefined, lng: undefined };

      const professionalData = {
        email: (isAuthenticated ? user?.email : formData.email),
        name: formData.name,
        category: (formData.category || '').toLowerCase(),
        services: Array.from(new Set([formData.category, ...(formData.services || [])])).map(s => (s || '').toLowerCase()),
        city: formData.city,
        state: formData.state,
        country: 'Nigeria',
        location: {
          address: [formData.neighborhood, formData.city, formData.state].filter(Boolean).join(', '),
          neighbourhood: formData.neighborhood || undefined,
          coordinates
        },
        bio: formData.bio,
        yearsOfExperience: formData.yearsOfExperience,
        pricePerHour: formData.price,
        isActive: true,
        isVerified: false,
      };

      const response = await createProfessional(professionalData);
      const created = response?.professional || response || {};
      const proId = created._id || created.id;
      if (!proId) {
        throw new Error('Failed to create professional profile');
      }

      if (formData.profilePhoto) {
        try {
          const profileResponse = await uploadProfilePicture(formData.profilePhoto);
          if (profileResponse.success && login) {
            login(user.token, {
              ...user,
              profilePicture: profileResponse.data.profilePicture,
              avatarUrl: profileResponse.data.avatarUrl
            });
          }
          const fd = new FormData();
          fd.append('files', formData.profilePhoto);
          await uploadProfessionalMedia(proId, fd);
        } catch (_) {}
      }

      navigate('/dashboard/professional');
    } catch (err) {
      setError(err.message || 'Failed to create professional profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className=" p-0 md:p-0 bg-transparent relative overflow-hidden">
      {/* Hero: JOIN US */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-white" />
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-10 md:pt-16 md:pb-16">
          <div className="flex flex-col items-center text-center relative">
            {/* Plumber illustration image */}
            <div className="hidden md:block absolute -left-2 md:left-6 top-1/2 -translate-y-1/2">
              <img src={plumberIllustration} alt="Professional plumber" className="w-[200px] h-[220px] object-contain drop-shadow" />
            </div>
            <div className="relative">
              <h1 className="font-extrabold tracking-tight text-[#0b1220]" style={{fontSize:'clamp(48px,8vw,100px)'}}>
                <span className="text-[#0b1220]">JO</span>
                <span className="text-emerald-500">IN</span>
                <span className="ml-2 text-[#0b1220]">US</span>
              </h1>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-24 rounded bg-emerald-400" />
            </div>
            <p className="mt-6 max-w-2xl text-gray-700 text-base md:text-lg">Earn more with verified leads, build trust with reviews, and manage jobs in one place.</p>
            {/* Mobile illustration (shown on small screens) */}
            <div className="mt-6 md:hidden">
              <img src={plumberIllustration} alt="Professional plumber" className="mx-auto w-40 h-44 object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Why Join - Benefits */}
      <div className="mx-auto max-w-6xl px-6 -mt-10 md:-mt-14">
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {[{title:'Verified Leads',desc:'We connect you with customers ready to hire now.'},{title:'Build Reputation',desc:'Collect reviews and stand out in your city.'},{title:'Simple Tools',desc:'Manage requests, chat, and bookings easily.'}].map((b, i)=> (
            <div key={b.title} className="rounded-2xl border border-white/50 bg-white/80 backdrop-blur shadow-sm p-5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">{i+1}</div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{b.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-6xl px-6 mt-10 md:mt-12">
        <div className="rounded-2xl border border-white/50 bg-white/90 shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 text-center">How it works</h3>
          <div className="mt-5 grid md:grid-cols-3 gap-6">
            {[{t:'Create your profile',d:'Tell customers what you do and where you work.'},{t:'Get requests',d:'Receive leads matched to your skills and location.'},{t:'Do great work',d:'Deliver quality and grow with reviews and repeat jobs.'}].map((s, i)=> (
              <div key={s.t} className="relative">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">{i+1}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.t}</p>
                    <p className="text-sm text-gray-600">{s.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wizard Card */}
      <div className="mt-10 md:mt-12 p-8 md:p-12 bg-white shadow-2xl rounded-3xl relative overflow-hidden mx-4 md:mx-auto md:max-w-5xl">
        <div className="absolute inset-0 bg-[url('/images/join-bg.jpeg')] bg-cover bg-center opacity-5 z-0" />
        <div className="relative z-10">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 leading-tight mb-3">Become a Verified Pro on FixFinder</h2>
        <p className="text-center text-gray-600 mb-8">Join thousands of professionals growing their businesses by connecting with local customers.</p>

        {/* Progress */}
        <div className="mx-auto max-w-3xl mb-8">
          <div className="flex items-center justify-between">
            {steps.map((label, i) => (
              <div key={label} className="flex-1 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentStep ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{i+1}</div>
                {i < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${i < currentStep ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-sm text-gray-600">Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</div>
        </div>

        {detectingLoc && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">Detecting your State and LGA...</div>
        )}
        {!detectingLoc && detectError && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">{detectError}</div>
        )}
        {isInternational && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">We currently serve Nigeria only. Please set a Nigerian state/city.</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
        )}

        {/* Wizard content */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="min-h-[320px]">
            {currentStep === 0 && (
              <div className="space-y-4">
                {!isAuthenticated && (
                  <div className="flex flex-col">
                    <label className="font-medium mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="you@example.com" />
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="flex flex-col">
                    <label className="font-medium mb-1">Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} name="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="Create a password" />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">This creates your pro account so you can log in later.</p>
                  </div>
                )}
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Full Name</label>
                  <div className="flex items-center gap-3">
                    <FaUser className="text-[#003366]" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="David Efe" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Short Bio</label>
                  <textarea name="bio" rows="4" value={formData.bio} onChange={handleChange} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="Tell us about your experience, location, and passion." />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Category / Specialty</label>
                  <ServiceSelector value={formData.category} onChange={(value) => setFormData({ ...formData, category: value })} placeholder="Search for your specialty (e.g. plumber, electrician, hairstylist)" allowCustom={true} className="w-full" />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Additional Services (optional)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.services.map((svc) => (
                      <span key={svc} className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{svc}<button type="button" className="text-gray-500 hover:text-red-600" onClick={() => removeService(svc)}>×</button></span>
                    ))}
                  </div>
                  <ServiceSelector value={serviceQuery} onChange={(value) => { if (value && !formData.services.includes(value)) { addService(value); } setServiceQuery(''); }} placeholder="Add more services you offer" allowCustom={true} className="w-full" />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Location (Nigeria only)</label>
                  <LocationSelector value={{ state: formData.state, city: formData.city }} autoDetected={autoDetectedPlace} enforceNigeria showNeighborhood onChange={(loc) => setFormData(prev => ({ ...prev, state: loc.state || '', city: loc.lga || loc.city || '', neighborhood: loc.neighborhood || '' }))} />
                </div>
                {formData.state && formData.city && (
                  <div className="flex flex-col bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800"><FaMapMarkerAlt className="text-blue-600" /><span className="font-medium">Location Set</span></div>
                    <p className="text-sm text-blue-700">{formData.neighborhood ? `${formData.neighborhood}, ` : ''}{formData.city}, {formData.state}</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Years of Experience</label>
                  <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} min="0" required className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="0" />
                </div>
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Price (₦)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} min="0" className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]" placeholder="e.g. 10000" />
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Upload Profile Picture (optional)</label>
                  {imagePreview && (
                    <div className="mb-2">
                      <img src={imagePreview} alt="Profile preview" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                      <p className="text-xs text-green-600 mt-1">✓ Image compressed and ready</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <FaCamera className="text-[#003366]" />
                    <input type="file" name="profilePhoto" accept="image/*" onChange={handleChange} className="w-full" disabled={compressing} />
                  </div>
                  {compressing && (
                    <div className="flex items-center gap-2 text-blue-600"><FaSpinner className="animate-spin" /><span className="text-sm">Compressing image...</span></div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Images are automatically compressed for faster uploads. You can add certificates and ID later in your dashboard during verification.</p>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="rounded-xl border p-4 bg-gray-50">
                  <h4 className="font-semibold mb-2">Review your details</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li><strong>Name:</strong> {formData.name}</li>
                    {!isAuthenticated && <li><strong>Email:</strong> {formData.email}</li>}
                    <li><strong>Category:</strong> {formData.category || '—'}</li>
                    <li><strong>Services:</strong> {(formData.services || []).join(', ') || '—'}</li>
                    <li><strong>Location:</strong> {[formData.neighborhood, formData.city, formData.state].filter(Boolean).join(', ') || '—'}</li>
                    <li><strong>Experience:</strong> {formData.yearsOfExperience || 0} years</li>
                    <li><strong>Price:</strong> {formData.price ? `₦${formData.price}` : '—'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={goBack} disabled={currentStep === 0 || loading} className="px-4 py-2 rounded-lg border text-gray-700 disabled:opacity-40">Back</button>
            {isLastStep ? (
              <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-[#003366] hover:bg-[#002244] text-white font-semibold flex items-center gap-2 disabled:opacity-50">
                {loading ? <FaSpinner className="animate-spin" /> : <FaBriefcase />} {loading ? 'Creating Profile...' : 'Finish & Join'}
              </button>
            ) : (
              <button type="button" onClick={() => {
                // minimal per-step validation
                if (currentStep === 0 && ((!isAuthenticated && (!formData.email || !password)) || !formData.name)) { setError('Please fill name, email and password'); return; }
                if (currentStep === 2 && !formData.category) { setError('Please select your main category'); return; }
                if (currentStep === 3 && (!formData.state || !formData.city)) { setError('Please set your state and city'); return; }
                if (currentStep === 4 && (formData.yearsOfExperience === '' || formData.yearsOfExperience === null)) { setError('Please enter your years of experience'); return; }
                setError('');
                goNext();
              }} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Next</button>
            )}
          </div>

          <p className="text-sm text-center text-gray-500 mt-6">By joining, you agree to FixFinder's <span className="underline text-[#003366] cursor-pointer">Terms & Privacy</span>.</p>
        </form>
        </div>
      </div>
    </section>
  );
};

export default JoinAsPro;
