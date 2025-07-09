import { useState } from "react";

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can integrate with EmailJS, Formspree, or your backend
    setSubmitted(true);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Contact Support</h1>
      <p className="text-gray-700 mb-8">
        Facing an issue or have a question? Fill out the form below and our support team will get back to you within 24–48 hours.
      </p>

      {submitted ? (
        <div className="bg-green-100 text-green-800 p-4 rounded-md shadow">
          Thank you for reaching out! Our support team will get back to you shortly.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white border rounded-lg shadow p-6 max-w-2xl"
        >
          <div>
            <label htmlFor="name" className="block font-medium mb-1">
              Full Name
            </label>
            <input
              required
              type="text"
              id="name"
              className="w-full border rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block font-medium mb-1">
              Email Address
            </label>
            <input
              required
              type="email"
              id="email"
              className="w-full border rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="message" className="block font-medium mb-1">
              Your Message
            </label>
            <textarea
              required
              id="message"
              rows="5"
              className="w-full border rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            ></textarea>
          </div>

          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
};

export default Contact;
