// ✅ Validate a generic non-empty string 
function isValidString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

// ✅ Validate Nigerian-style phone numbers (e.g., 080..., +234...)
function isValidPhone(phone) {
  const regex = /^(?:\+234|0)[789][01]\d{8}$/;
  return regex.test(phone);
}

// ✅ Validate email addresses
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ✅ Validate a rating between 1 and 5
function isValidRating(rating) {
  return typeof rating === 'number' && rating >= 1 && rating <= 5;
}

// ✅ Validate a known location string (optional: expand this list)
function isValidLocation(location) {
  const allowedLocations = ['Lagos', 'Abuja', 'Benin', 'Port Harcourt'];
  return isValidString(location) && allowedLocations.includes(location);
}

// ✅ Main form validator for AddService.jsx
function validateServiceForm(form) {
  if (!isValidString(form.name)) {
    return "Please enter your full name.";
  }

  if (!isValidString(form.category)) {
    return "Please select a service category.";
  }

  if (!isValidString(form.location)) {
    return "Please enter a valid location.";
  }

  if (!isValidPhone(form.phone)) {
    return "Please enter a valid Nigerian phone number.";
  }

  if (!isValidEmail(form.email)) {
    return "Please enter a valid email address.";
  }

  if (!isValidString(form.description)) {
    return "Please provide a brief service description.";
  }

  return ""; // No errors
}

// ✅ Default string validator used in Home.jsx for quick field checks
export default function validateInput(str) {
  return isValidString(str);
}

// Named exports
export {
  isValidString,
  isValidPhone,
  isValidEmail,
  isValidRating,
  isValidLocation,
  validateServiceForm // <- this is the one you’ll now import in AddService.jsx
};
