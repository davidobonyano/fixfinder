// Comprehensive services database with categories and synonyms
export const SERVICES = {
  // Beauty & Personal Care
  'Beauty & Personal Care': {
    'Hair Stylist': ['hairstylist', 'hair dresser', 'hair stylist', 'haircut', 'hair styling'],
    'Barber': ['barber', 'haircut', 'men hair', 'beard trim'],
    'Makeup Artist': ['makeup', 'makeup artist', 'beauty', 'cosmetics'],
    'Nail Technician': ['nail tech', 'manicure', 'pedicure', 'nail art'],
    'Massage Therapist': ['massage', 'therapist', 'spa', 'relaxation'],
    'Skincare Specialist': ['skincare', 'facial', 'beauty treatment', 'skin care']
  },

  // Home & Garden
  'Home & Garden': {
    'Electrician': ['electrician', 'electrical', 'wiring', 'power', 'electric'],
    'Plumber': ['plumber', 'plumbing', 'pipe', 'water', 'drain'],
    'Carpenter': ['carpenter', 'woodwork', 'furniture', 'carpentry'],
    'Painter': ['painter', 'painting', 'wall', 'decorating'],
    'Gardener': ['gardener', 'gardening', 'landscaping', 'plants'],
    'Cleaner': ['cleaner', 'cleaning', 'housekeeping', 'maid'],
    'AC Technician': ['ac technician', 'air conditioning', 'cooling', 'hvac'],
    'Generator Repair': ['generator', 'power backup', 'inverter', 'electrical repair']
  },

  // Education & Tutoring
  'Education & Tutoring': {
    'Math Tutor': ['math tutor', 'mathematics', 'math teacher', 'algebra'],
    'English Tutor': ['english tutor', 'english teacher', 'language', 'grammar'],
    'Science Tutor': ['science tutor', 'physics', 'chemistry', 'biology'],
    'Primary School Tutor': ['primary tutor', 'elementary', 'basic education'],
    'Secondary School Tutor': ['secondary tutor', 'high school', 'jss', 'sss'],
    'University Tutor': ['university tutor', 'university teacher', 'higher education'],
    'Language Teacher': ['language teacher', 'linguistics', 'foreign language'],
    'Yoruba Teacher': ['yoruba teacher', 'yoruba tutor', 'yoruba language'],
    'Igbo Teacher': ['igbo teacher', 'igbo tutor', 'igbo language'],
    'Hausa Teacher': ['hausa teacher', 'hausa tutor', 'hausa language'],
    'Isoko Teacher': ['isoko teacher', 'isoko tutor', 'isoko language'],
    'Tiv Teacher': ['tiv teacher', 'tiv tutor', 'tiv language'],
    'French Teacher': ['french teacher', 'french tutor', 'french language'],
    'Spanish Teacher': ['spanish teacher', 'spanish tutor', 'spanish language']
  },

  // Music & Entertainment
  'Music & Entertainment': {
    'Pianist': ['pianist', 'piano teacher', 'piano lessons', 'keyboard'],
    'Guitarist': ['guitarist', 'guitar teacher', 'guitar lessons', 'acoustic guitar'],
    'Saxophonist': ['saxophonist', 'saxophone teacher', 'saxophone lessons'],
    'Drummer': ['drummer', 'drum teacher', 'drum lessons', 'percussion'],
    'Vocalist': ['vocalist', 'singer', 'voice teacher', 'singing lessons'],
    'DJ': ['dj', 'disc jockey', 'music mixing', 'sound system'],
    'Event MC': ['mc', 'master of ceremonies', 'event host', 'announcer'],
    'Birthday Clown': ['birthday clown', 'party clown', 'children entertainer'],
    'Mascot': ['mascot', 'costume character', 'event mascot'],
    'Party Planner': ['party planner', 'event planner', 'celebration organizer']
  },

  // Food & Catering
  'Food & Catering': {
    'Baker': ['baker', 'baking', 'cake', 'pastry', 'bread'],
    'Caterer': ['caterer', 'catering', 'food service', 'event food'],
    'Chef': ['chef', 'cooking', 'culinary', 'food preparation'],
    'Home Cook': ['home cook', 'personal chef', 'meal prep', 'cooking service']
  },

  // Technology
  'Technology': {
    'Computer Repair': ['computer repair', 'laptop repair', 'pc repair', 'hardware'],
    'Phone Repair': ['phone repair', 'mobile repair', 'smartphone repair'],
    'Software Developer': ['software developer', 'programmer', 'coding', 'web development'],
    'IT Support': ['it support', 'technical support', 'computer help', 'tech support'],
    'Graphic Designer': ['graphic designer', 'designer', 'logo design', 'visual design']
  },

  // Transportation
  'Transportation': {
    'Driver': ['driver', 'chauffeur', 'personal driver', 'car service'],
    'Delivery Service': ['delivery', 'courier', 'package delivery', 'logistics'],
    'Taxi Service': ['taxi', 'cab', 'ride service', 'transport']
  },

  // Health & Fitness
  'Health & Fitness': {
    'Personal Trainer': ['personal trainer', 'fitness trainer', 'gym trainer', 'workout'],
    'Yoga Instructor': ['yoga instructor', 'yoga teacher', 'yoga teacher', 'meditation'],
    'Physiotherapist': ['physiotherapist', 'physical therapy', 'rehabilitation', 'physio']
  },

  // Fashion & Tailoring
  'Fashion & Tailoring': {
    'Tailor': ['tailor', 'sewing', 'clothing', 'fashion design', 'dressmaking'],
    'Fashion Designer': ['fashion designer', 'clothing designer', 'fashion', 'style'],
    'Shoe Repair': ['shoe repair', 'cobbler', 'footwear repair', 'shoe fixing']
  },

  // Photography & Media
  'Photography & Media': {
    'Photographer': ['photographer', 'photography', 'photo shoot', 'camera'],
    'Videographer': ['videographer', 'video production', 'filming', 'video editing'],
    'Event Photographer': ['event photographer', 'wedding photographer', 'party photos']
  },

  // Business & Professional
  'Business & Professional': {
    'Accountant': ['accountant', 'bookkeeping', 'financial', 'tax preparation'],
    'Lawyer': ['lawyer', 'attorney', 'legal', 'law'],
    'Consultant': ['consultant', 'business consultant', 'advisory', 'strategy'],
    'Translator': ['translator', 'translation', 'language services', 'interpreter']
  }
};

// Flatten all services for easy searching
export const ALL_SERVICES = Object.values(SERVICES).reduce((acc, category) => {
  Object.entries(category).forEach(([service, synonyms]) => {
    acc[service] = {
      name: service,
      synonyms: synonyms,
      category: Object.keys(SERVICES).find(cat => SERVICES[cat][service])
    };
  });
  return acc;
}, {});

// Get all service names
export const SERVICE_NAMES = Object.keys(ALL_SERVICES);

// Get all categories
export const CATEGORIES = Object.keys(SERVICES);

// Search services with fuzzy matching
export const searchServices = (query) => {
  if (!query) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  const results = [];
  
  // Direct matches
  Object.entries(ALL_SERVICES).forEach(([service, data]) => {
    if (service.toLowerCase().includes(normalizedQuery)) {
      results.push({ service, ...data, matchType: 'direct' });
    }
  });
  
  // Synonym matches
  Object.entries(ALL_SERVICES).forEach(([service, data]) => {
    if (data.synonyms.some(synonym => synonym.toLowerCase().includes(normalizedQuery))) {
      if (!results.find(r => r.service === service)) {
        results.push({ service, ...data, matchType: 'synonym' });
      }
    }
  });
  
  // Fuzzy matches (partial word matching)
  if (results.length < 5) {
    Object.entries(ALL_SERVICES).forEach(([service, data]) => {
      const words = service.toLowerCase().split(' ');
      const queryWords = normalizedQuery.split(' ');
      
      if (queryWords.some(qWord => words.some(word => word.includes(qWord)))) {
        if (!results.find(r => r.service === service)) {
          results.push({ service, ...data, matchType: 'fuzzy' });
        }
      }
    });
  }
  
  return results.slice(0, 10); // Limit to 10 results
};

// Get related services
export const getRelatedServices = (serviceName) => {
  const service = ALL_SERVICES[serviceName];
  if (!service) return [];
  
  const category = service.category;
  const categoryServices = SERVICES[category];
  
  return Object.keys(categoryServices).filter(s => s !== serviceName);
};

// Normalize service name (for search matching)
export const normalizeService = (serviceName) => {
  const normalized = serviceName.toLowerCase().trim();
  
  // Find exact match
  const exactMatch = Object.keys(ALL_SERVICES).find(service => 
    service.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Find synonym match
  const synonymMatch = Object.entries(ALL_SERVICES).find(([service, data]) =>
    data.synonyms.some(synonym => synonym.toLowerCase() === normalized)
  );
  if (synonymMatch) return synonymMatch[0];
  
  // Return original if no match found
  return serviceName;
};

