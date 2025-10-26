// Professional Certificates Data
export const professionalCertificates = [
  // Construction & Building
  {
    category: 'Construction & Building',
    certificates: [
      { name: 'Nigerian Institute of Building (NIOB)', code: 'NIOB' },
      { name: 'Council for the Regulation of Engineering in Nigeria (COREN)', code: 'COREN' },
      { name: 'Nigerian Society of Engineers (NSE)', code: 'NSE' },
      { name: 'International Building Code (IBC)', code: 'IBC' },
      { name: 'Occupational Safety and Health Administration (OSHA)', code: 'OSHA' },
      { name: 'Project Management Professional (PMP)', code: 'PMP' }
    ]
  },
  
  // Electrical & Electronics
  {
    category: 'Electrical & Electronics',
    certificates: [
      { name: 'Nigerian Society of Engineers - Electrical Division', code: 'NSE-ELEC' },
      { name: 'Institute of Electrical and Electronics Engineers (IEEE)', code: 'IEEE' },
      { name: 'National Electric Code (NEC)', code: 'NEC' },
      { name: 'Certified Electrician License', code: 'CEL' },
      { name: 'Industrial Electrician Certification', code: 'IEC' },
      { name: 'Solar Installation Certification', code: 'SIC' }
    ]
  },
  
  // Plumbing & Water Systems
  {
    category: 'Plumbing & Water Systems',
    certificates: [
      { name: 'Nigerian Institute of Plumbing (NIP)', code: 'NIP' },
      { name: 'International Association of Plumbing and Mechanical Officials (IAPMO)', code: 'IAPMO' },
      { name: 'Water Quality Association (WQA)', code: 'WQA' },
      { name: 'Certified Plumbing Professional (CPP)', code: 'CPP' },
      { name: 'Backflow Prevention Certification', code: 'BPC' }
    ]
  },
  
  // Automotive & Mechanical
  {
    category: 'Automotive & Mechanical',
    certificates: [
      { name: 'National Institute for Automotive Service Excellence (ASE)', code: 'ASE' },
      { name: 'Automotive Service Excellence (ASE)', code: 'ASE-CERT' },
      { name: 'Nigerian Institute of Mechanical Engineers (NIME)', code: 'NIME' },
      { name: 'Certified Automotive Technician (CAT)', code: 'CAT' },
      { name: 'Diesel Engine Specialist', code: 'DES' }
    ]
  },
  
  // Beauty & Personal Care
  {
    category: 'Beauty & Personal Care',
    certificates: [
      { name: 'National Association of Barber Boards of America (NABBA)', code: 'NABBA' },
      { name: 'Cosmetology License', code: 'COSMO' },
      { name: 'Barbering License', code: 'BARBER' },
      { name: 'Hair Styling Certification', code: 'HAIR' },
      { name: 'Makeup Artist Certification', code: 'MAC' },
      { name: 'Nail Technician License', code: 'NAIL' },
      { name: 'Esthetician License', code: 'ESTH' }
    ]
  },
  
  // IT & Technology
  {
    category: 'IT & Technology',
    certificates: [
      { name: 'CompTIA A+', code: 'COMPTIA-A' },
      { name: 'Microsoft Certified Solutions Expert (MCSE)', code: 'MCSE' },
      { name: 'Cisco Certified Network Associate (CCNA)', code: 'CCNA' },
      { name: 'Amazon Web Services (AWS)', code: 'AWS' },
      { name: 'Google Cloud Professional', code: 'GCP' },
      { name: 'Certified Information Systems Security Professional (CISSP)', code: 'CISSP' }
    ]
  },
  
  // Healthcare & Medical
  {
    category: 'Healthcare & Medical',
    certificates: [
      { name: 'Nigerian Medical Association (NMA)', code: 'NMA' },
      { name: 'Nursing and Midwifery Council of Nigeria (NMCN)', code: 'NMCN' },
      { name: 'Medical Laboratory Science Council of Nigeria (MLSCN)', code: 'MLSCN' },
      { name: 'Pharmacy Council of Nigeria (PCN)', code: 'PCN' },
      { name: 'Basic Life Support (BLS)', code: 'BLS' },
      { name: 'First Aid Certification', code: 'FA' }
    ]
  },
  
  // Food & Hospitality
  {
    category: 'Food & Hospitality',
    certificates: [
      { name: 'ServSafe Food Handler', code: 'SERVSAFE' },
      { name: 'Culinary Institute Certification', code: 'CIC' },
      { name: 'Hospitality Management Certification', code: 'HMC' },
      { name: 'Food Safety Management System (FSMS)', code: 'FSMS' },
      { name: 'Professional Chef Certification', code: 'PCC' }
    ]
  },
  
  // General Professional
  {
    category: 'General Professional',
    certificates: [
      { name: 'Project Management Professional (PMP)', code: 'PMP' },
      { name: 'Certified Public Accountant (CPA)', code: 'CPA' },
      { name: 'Chartered Financial Analyst (CFA)', code: 'CFA' },
      { name: 'Human Resources Certification Institute (HRCI)', code: 'HRCI' },
      { name: 'Six Sigma Certification', code: 'SIX-SIGMA' },
      { name: 'Lean Manufacturing Certification', code: 'LEAN' }
    ]
  }
];

// Get all certificates as a flat list
export const getAllCertificates = () => {
  return professionalCertificates.flatMap(category => 
    category.certificates.map(cert => ({
      ...cert,
      category: category.category
    }))
  );
};

// Get certificates by category
export const getCertificatesByCategory = (category) => {
  const cat = professionalCertificates.find(c => c.category === category);
  return cat ? cat.certificates : [];
};

// Search certificates
export const searchCertificates = (query) => {
  const allCerts = getAllCertificates();
  return allCerts.filter(cert => 
    cert.name.toLowerCase().includes(query.toLowerCase()) ||
    cert.code.toLowerCase().includes(query.toLowerCase()) ||
    cert.category.toLowerCase().includes(query.toLowerCase())
  );
};




