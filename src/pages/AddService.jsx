import React, { useState } from "react";
import services from "../data/services.json";
import { validateServiceForm } from "../utils/validateInput";
import { saveService } from "../utils/api";
import { FaPlusCircle } from "react-icons/fa";

// Extract unique category names from services.json
const uniqueCategories = [...new Set(services.map((s) => s.name))];

const AddService = () => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    businessName: "",
    location: "",
    phone: "",
    email: "",
    description: "",
    image: null,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateServiceForm(formData);
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setIsSubmitting(true);

    try {
      await saveService(formData); // mock save
      setSuccess("✅ Service added successfully!");
      setError("");
      setFormData({
        name: "",
        category: "",
        businessName: "",
        location: "",
        phone: "",
        email: "",
        description: "",
        image: null,
      });
  } catch (err) {
  setError(`❌ Failed to add service: ${err.message || 'Please try again later.'}`);
  setSuccess("");
}
 finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white flex items-center justify-center gap-2">
        <FaPlusCircle className="text-blue-600" /> Add Your Service
      </h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>

        {/* Service Category */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Service Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="input-field"
            required
          >
            <option value="">Select a category</option>
            {uniqueCategories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Business Name</label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Location (City/Area)</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Service Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input-field"
            rows="4"
            required
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Upload Image (optional)</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="input-field file:cursor-pointer file:px-4 file:py-2 file:rounded-md file:bg-blue-600 file:text-white"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Service"}
        </button>
      </form>
    </div>
  );
};

export default AddService;
