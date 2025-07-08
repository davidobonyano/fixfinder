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

// ✅ Validate a known location string (you can expand this list)
function isValidLocation(location) {
  const allowedLocations = ['Lagos', 'Abuja', 'Benin', 'Port Harcourt'];
  return allowedLocations.includes(location);
}

// ✅ Default validator used in Home.jsx for name & description
export default function validateInput(str) {
  return isValidString(str);
}

// Optional named exports for future use
export {
  isValidString,
  isValidPhone,
  isValidEmail,
  isValidRating,
  isValidLocation
};
