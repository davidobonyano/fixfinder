import { z } from 'zod';

// Professional form validation schema
export const professionalFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number can only contain digits, spaces, hyphens, plus signs, and parentheses'),
  
  bio: z.string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio must be less than 500 characters'),
  
  hourlyRate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(1000000, 'Hourly rate seems too high'),
  
  experience: z.union([z.string(), z.number()])
    .transform(val => String(val))
    .refine(val => /^\d+$/.test(val), 'Experience must be a number')
    .refine(val => val.length > 0, 'Experience is required'),
  
  services: z.array(z.string())
    .min(1, 'At least one service is required'),
  
  certifications: z.array(z.object({
    name: z.string().min(1, 'Certification name is required'),
    school: z.string().optional(),
    year: z.string().optional()
  })).optional(),
  
  languages: z.array(z.string())
    .min(1, 'At least one language is required')
});

// Portfolio validation schema
export const portfolioValidationSchema = z.object({
  mediaType: z.enum(['image', 'video']),
  currentVideos: z.number().max(1, 'Only 1 video allowed'),
  currentImages: z.number().max(3, 'Only 3 images allowed')
});

// Validation helper functions
export const validateProfessionalForm = (data) => {
  try {
    // Ensure data has required fields with defaults
    const safeData = {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      bio: data.bio || '',
      hourlyRate: data.hourlyRate || 0,
      experience: data.experience || '',
      services: data.services || [],
      certifications: data.certifications || [],
      languages: data.languages || []
    };
    
    console.log('🔍 Safe data for validation:', safeData);
    professionalFormSchema.parse(safeData);
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    console.log('🔍 Validation error structure:', error);
    
    // Handle Zod error structure
    if (Array.isArray(error.issues)) {
      error.issues.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
    } else if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
    } else {
      // Fallback for different error structures
      console.error('Validation error structure:', error);
      errors.general = 'Validation failed';
    }
    return { isValid: false, errors };
  }
};

export const validatePortfolioUpload = (mediaType, currentVideos, currentImages) => {
  try {
    portfolioValidationSchema.parse({
      mediaType,
      currentVideos,
      currentImages
    });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    console.log('🔍 Portfolio validation error structure:', error);
    
    // Handle Zod error structure
    if (Array.isArray(error.issues)) {
      error.issues.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
    } else if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
    } else {
      console.error('Portfolio validation error structure:', error);
      errors.general = 'Portfolio validation failed';
    }
    return { isValid: false, errors };
  }
};
