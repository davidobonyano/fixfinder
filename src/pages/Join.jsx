import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { createProfessional, uploadProfessionalMedia, registerUser, loginUser, getServicesApi, uploadProfilePicture } from '../utils/api';
import ServiceSelector from '../components/ServiceSelector';
import {
  FaUser,
  FaTools,
  FaCamera,
  FaBriefcase,
  FaSpinner,
  FaMapMarkerAlt,
  FaImage
} from 'react-icons/fa';

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

  // Image compression utility
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Get coordinates for city
  const getCityCoordinates = (state, city) => {
    const coordinates = {
      'Lagos': { lat: 6.5244, lng: 3.3792 },
      'Victoria Island': { lat: 6.4281, lng: 3.4219 },
      'Ikoyi': { lat: 6.4474, lng: 3.4203 },
      'Surulere': { lat: 6.4995, lng: 3.3550 },
      'Ikorodu': { lat: 6.6167, lng: 3.5167 },
      'Lekki': { lat: 6.4654, lng: 3.5653 },
      'Abuja': { lat: 9.0765, lng: 7.3986 },
      'Garki': { lat: 9.0765, lng: 7.3986 },
      'Port Harcourt': { lat: 4.8156, lng: 7.0498 },
      'Benin': { lat: 6.3333, lng: 5.6167 }
    };
    
    return coordinates[city] || coordinates[state] || { lat: 6.5244, lng: 3.3792 };
  };

  // Nigerian states and their cities
  const stateCities = {
    "Lagos": ["Lagos", "Victoria Island", "Ikoyi", "Surulere", "Yaba", "Mushin", "Oshodi", "Ikeja", "Apapa", "Lekki", "Ajah", "Badagry", "Epe", "Ikorodu", "Alimosho", "Kosofe"],
    "Abuja": ["Abuja", "Garki", "Wuse", "Maitama", "Asokoro", "Lugbe", "Kubwa", "Gwarinpa", "Nyanya", "Karu", "Jahi", "Lokogoma"],
    "Rivers": ["Port Harcourt", "Obio-Akpor", "Eleme", "Okrika", "Ogu-Bolo", "Degema", "Bonny", "Andoni", "Khana", "Oyigbo", "Opobo-Nkoro", "Tai"],
    "Edo": ["Benin", "Auchi", "Ekpoma", "Uromi", "Igarra", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Orhionmwon"],
    "Kano": ["Kano", "Gwale", "Nassarawa", "Fagge", "Dala", "Tarauni", "Kumbotso", "Ungogo", "Kano Municipal", "Gezawa", "Minjibir", "Bichi"],
    "Oyo": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki", "Kishi", "Igboho", "Eruwa", "Lanlate", "Igbo-Ora", "Idere", "Fiditi"],
    "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Saminaka", "Ikara", "Makarfi", "Kagoro", "Kagarku", "Kajuru", "Jema'a", "Kachia", "Kaura"],
    "Delta": ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor", "Oghara", "Oleh", "Koko", "Burutu", "Patani", "Bomadi", "Isoko"],
    "Enugu": ["Enugu", "Nsukka", "Oji-River", "Awgu", "Aninri", "Nkanu East", "Nkanu West", "Igbo-Etiti", "Igbo-Eze North", "Igbo-Eze South", "Isi-Uzo", "Nkanu"],
    "Akwa Ibom": ["Uyo", "Ikot Ekpene", "Eket", "Abak", "Oron", "Ibeno", "Mkpat-Enin", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot-Akara", "Okobo"],
    "Cross River": ["Calabar", "Ogoja", "Ikom", "Obudu", "Akamkpa", "Biase", "Boki", "Etung", "Yakuur", "Yala", "Abi", "Bakassi"],
    "Plateau": ["Jos", "Bukuru", "Barkin Ladi", "Riyom", "Mangu", "Pankshin", "Kanam", "Kanke", "Langtang North", "Langtang South", "Wase", "Mikang"],
    "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are", "Katagum", "Ningi", "Warji", "Ganjuwa", "Kirfi", "Alkaleri", "Tafawa Balewa", "Bogoro"],
    "Borno": ["Maiduguri", "Konduga", "Bama", "Gwoza", "Kukawa", "Mafa", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani", "Abadam"],
    "Adamawa": ["Yola", "Mubi", "Jimeta", "Numan", "Ganye", "Girei", "Gombi", "Hong", "Jada", "Lamurde", "Madagali", "Maiha"],
    "Benue": ["Makurdi", "Gboko", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo"],
    "Kogi": ["Lokoja", "Okene", "Kabba", "Ankpa", "Dekina", "Ibaji", "Idah", "Igalamela-Odolu", "Ijumu", "Koton-Karfe", "Mopa-Muro", "Ofu"],
    "Niger": ["Minna", "Bida", "Kontagora", "Suleja", "Agaie", "Agwara", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako"],
    "Katsina": ["Katsina", "Dutsin-Ma", "Faskari", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Kurfi", "Kusada"],
    "Sokoto": ["Sokoto", "Binji", "Bodinga", "Dange-Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware"],
    "Kebbi": ["Birnin Kebbi", "Aleiro", "Arewa-Dandi", "Argungu", "Augie", "Bagudo", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo"],
    "Zamfara": ["Gusau", "Anka", "Bakura", "Birnin-Magaji", "Bukkuyum", "Bungudu", "Chafe", "Gummi", "Kankara", "Kaura-Namoda", "Maradun", "Maru"],
    "Jigawa": ["Dutse", "Auyo", "Babura", "Biriniwa", "Birnin-Kudu", "Buji", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa"],
    "Yobe": ["Damaturu", "Bade", "Bursari", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere"],
    "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu"],
    "Imo": ["Owerri", "Aboh-Mbaise", "Ahiazu-Mbaise", "Ehime-Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte-Uboma", "Ikeduru", "Isiala-Mbano", "Isu", "Mbaitoli"],
    "Abia": ["Umuahia", "Aba", "Arochukwu", "Bende", "Ikwuano", "Isiala-Ngwa North", "Isiala-Ngwa South", "Isuikwuato", "Obi-Ngwa", "Ohafia", "Osisioma", "Ugwunagbo"],
    "Anambra": ["Awka", "Onitsha", "Nnewi", "Aguata", "Anambra East", "Anambra West", "Anaocha", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South"],
    "Ogun": ["Abeokuta", "Sagamu", "Ijebu-Ode", "Ilaro", "Ado-Odo-Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu-East", "Ijebu-North", "Ijebu-North-East"],
    "Ondo": ["Akure", "Ondo", "Owo", "Ikare", "Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese-Odo", "Idanre"],
    "Osun": ["Osogbo", "Ife", "Ilesha", "Ede", "Ikire", "Ile-Ife", "Atakunmosa East", "Atakunmosa West", "Aiyedaade", "Aiyedire", "Boluwaduro", "Boripe"],
    "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Oye-Ekiti", "Aramoko-Ekiti", "Efon", "Ekiti-East", "Ekiti-South-West", "Ekiti-West", "Emure", "Gbonyin", "Ido-Osi", "Ijero"],
    "Bayelsa": ["Yenagoa", "Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw"],
    "Taraba": ["Jalingo", "Ardo-Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Karim-Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro"],
    "Gombe": ["Gombe", "Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
    "Nasarawa": ["Lafia", "Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Nasarawa", "Nasarawa-Eggon", "Obi", "Toto", "Wamba"],
    "Kwara": ["Ilorin", "Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke-Ero", "Oyun", "Pategi"]
  };

  const filteredCategorySuggestions = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return q
      ? catalog.filter((c) => c.includes(q) && c !== formData.category).slice(0, 10)
      : catalog.slice(0, 10);
  }, [categoryQuery, catalog, formData.category]);

  const filteredServiceSuggestions = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    const chosen = new Set([formData.category, ...(formData.services || [])]);
    const pool = catalog.filter((c) => !chosen.has(c));
    return q ? pool.filter((c) => c.includes(q)).slice(0, 10) : pool.slice(0, 10);
  }, [serviceQuery, catalog, formData.category, formData.services]);

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
        // ignore: fallback to local list
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleChange = async (e) => {
    const { name, value, type, files } = e.target;
    if (name === 'state') {
      // Reset city when state changes
      setFormData(prev => ({ ...prev, state: value, city: '' }));
    } else if (name === 'profilePhoto' && files[0]) {
      // Handle image compression
      setCompressing(true);
      try {
        const compressedFile = await compressImage(files[0]);
        const compressedFileWithName = new File([compressedFile], files[0].name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        // Create preview
        const previewUrl = URL.createObjectURL(compressedFile);
        setImagePreview(previewUrl);
        
        setFormData(prev => ({ ...prev, [name]: compressedFileWithName }));
      } catch (error) {
        console.error('Image compression failed:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If user is not authenticated, register/login them as a professional first
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
          // If email already exists, try to log in
          try {
            const log = await loginUser({ email: formData.email, password });
            if (log?.token && log?.user) {
              login(log.token, log.user);
            }
          } catch (logErr) {
            throw regErr; // surface original registration error
          }
        }
      }

      // Get location coordinates
      const coordinates = getCityCoordinates(formData.state, formData.city);
      
      // Create professional profile with location
      const professionalData = {
        email: (isAuthenticated ? user?.email : formData.email),
        name: formData.name,
        category: formData.category.toLowerCase(),
        services: Array.from(new Set([formData.category, ...(formData.services || [])])).map(s => s.toLowerCase()),
        city: formData.city,
        location: {
          address: `${formData.city}, ${formData.state}`,
          coordinates: coordinates
        },
        bio: formData.bio,
        yearsOfExperience: formData.yearsOfExperience,
        pricePerHour: formData.price, // Use pricePerHour to match backend
        isActive: true, // Ensure professional is active
        isVerified: false, // Will be verified later
      };

      console.log('🚀 Creating professional with data:', professionalData);
      const response = await createProfessional(professionalData);
      console.log('📡 Professional creation response:', response);
      
      const created = response?.professional || response || {};
      const proId = created._id || created.id;

      if (!proId) {
        console.error('❌ No professional ID returned:', response);
        throw new Error('Failed to create professional profile');
      }
      
      console.log('✅ Professional created successfully with ID:', proId);

      // Upload profile photo if provided
      if (formData.profilePhoto) {
        try {
          // Upload as user profile picture
          const profileResponse = await uploadProfilePicture(formData.profilePhoto);
          if (profileResponse.success) {
            console.log('✅ Profile picture uploaded successfully');
            
            // Update auth context with new profile picture
            if (login) {
              login(user.token, {
                ...user,
                profilePicture: profileResponse.data.profilePicture,
                avatarUrl: profileResponse.data.avatarUrl
              });
            }
          }
          
          // Also upload as professional media for portfolio
          const fd = new FormData();
          fd.append('files', formData.profilePhoto);
          await uploadProfessionalMedia(proId, fd);
        } catch (uploadErr) {
          // Non-blocking: log and continue to profile page
          console.warn('Profile photo upload failed:', uploadErr);
        }
      }

      // Navigate to professional dashboard
      navigate('/dashboard/professional');
    } catch (err) {
      setError(err.message || 'Failed to create professional profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className=" p-8 md:p-12 bg-white shadow-2xl rounded-3xl relative overflow-hidden">
      {/* background image with light overlay */}
      <div className="absolute inset-0 bg-[url('/images/join-bg.jpeg')] bg-cover bg-center opacity-5 z-0" />
      
      <div className="relative z-10">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 leading-tight mb-4">
          Become a Verified Pro on FixFinder
        </h2>
        <p className="text-center text-gray-600 mb-10">
          Join thousands of professionals growing their businesses by connecting with local customers.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaUser className="text-[#003366]" /> Personal Information
            </h3>

            <div className="space-y-4">
              {/* Email (hidden if signed in) */}
              {!isAuthenticated && (
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    placeholder="you@example.com"
                  />
                </div>
              )}
              {!isAuthenticated && (
                <div className="flex flex-col">
                  <label className="font-medium mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This creates your pro account so you can log in later.</p>
                </div>
              )}
              {/* Full Name */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Full Name</label>
                <div className="flex items-center gap-3">
                  <FaUser className="text-[#003366]" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    placeholder="David Efe"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Short Bio</label>
                <textarea
                  name="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="Tell us about your experience, location, and passion."
                />
              </div>
            </div>
          </div>

          {/* Skill Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaTools className="text-[#003366]" /> Skill & Experience
            </h3>

            <div className="space-y-4">
              {/* Category */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Category / Specialty</label>
                <ServiceSelector
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  placeholder="Search for your specialty (e.g. plumber, electrician, hairstylist)"
                  allowCustom={true}
                  className="w-full"
                />
              </div>

              {/* Additional Services */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Additional Services (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.services.map((svc) => (
                    <span key={svc} className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {svc}
                      <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => removeService(svc)}>×</button>
                    </span>
                  ))}
                </div>
                <ServiceSelector
                  value={serviceQuery}
                  onChange={(value) => {
                    if (value && !formData.services.includes(value)) {
                      addService(value);
                    }
                    setServiceQuery('');
                  }}
                  placeholder="Add more services you offer"
                  allowCustom={true}
                  className="w-full"
                />
              </div>

              {/* City */}
            {/* State Selection */}
            <div className="flex flex-col">
              <label className="font-medium mb-1">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
              >
                <option value="">-- Select State --</option>
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
            </div>

            {/* City Selection */}
            <div className="flex flex-col">
              <label className="font-medium mb-1">City</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
              >
                <option value="">-- Select City --</option>
                {formData.state && stateCities[formData.state] ? (
                  stateCities[formData.state].map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))
                ) : (
                  <option value="" disabled>Please select a state first</option>
                )}

                            </select>
              </div>

              {/* Location Preview */}
              {formData.state && formData.city && (
                <div className="flex flex-col bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <FaMapMarkerAlt className="text-blue-600" />
                    <span className="font-medium">Location Set</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {formData.city}, {formData.state}
                  </p>
                  <p className="text-xs text-blue-600">
                    Coordinates: {getCityCoordinates(formData.state, formData.city).lat.toFixed(4)}, {getCityCoordinates(formData.state, formData.city).lng.toFixed(4)}
                  </p>
                </div>
              )}

              {/* Years of Experience */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Years of Experience</label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="0"
                />
              </div>

              {/* Price */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Price (₦)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="e.g. 10000"
                />
              </div>
            </div>
          </div>

          {/* Profile Photo Only (verification moved to dashboard) */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaCamera className="text-[#003366]" /> Profile Photo
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="font-medium mb-1">Upload Profile Picture</label>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-4">
                    <img 
                      src={imagePreview} 
                      alt="Profile preview" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <p className="text-xs text-green-600 mt-1">✓ Image compressed and ready</p>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <FaCamera className="text-[#003366]" />
                  <input
                    type="file"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full"
                    disabled={compressing}
                  />
                </div>
                
                {compressing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <FaSpinner className="animate-spin" />
                    <span className="text-sm">Compressing image...</span>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Images are automatically compressed for faster uploads. 
                  You can add certificates and ID later in your dashboard during verification.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaBriefcase />
            )}
            {loading ? 'Creating Profile...' : 'Join FixFinder Network'}
          </button>

          <p className="text-sm text-center text-gray-500 mt-4">
            By joining, you agree to FixFinder's{' '}
            <span className="underline text-[#003366] cursor-pointer">Terms & Privacy</span>.
          </p>
        </form>
      </div>
    </section>
  );
};

export default JoinAsPro;
