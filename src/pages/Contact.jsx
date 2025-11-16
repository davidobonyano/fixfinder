import { useState } from "react";
import { sendContactMessage } from "../utils/api";
import { FaCheckCircle, FaSpinner } from "react-icons/fa";

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await sendContactMessage(formData);
      if (response.success) {
        setSubmitted(true);
        setFormData({ name: "", email: "", message: "" });
      } else {
        setError(response.message || "Failed to send message. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700 dark:text-indigo-400">Contact Support</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Facing an issue or have a question? Fill out the form below and our support team will get back to you within 24–48 hours.
      </p>

      {submitted ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-semibold text-lg mb-1">Message Sent Successfully!</h3>
              <p>Thank you for reaching out! We've received your message and our support team will get back to you within 24-48 hours. A confirmation email has been sent to your inbox.</p>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6 max-w-2xl"
        >
          <div>
            <label htmlFor="name" className="block font-medium mb-1 text-gray-700 dark:text-gray-300">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="message" className="block font-medium mb-1 text-gray-700 dark:text-gray-300">
              Your Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              id="message"
              rows="6"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white"
              placeholder="Please describe your issue or question..."
            ></textarea>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default Contact;
