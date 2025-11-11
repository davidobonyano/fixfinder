import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "How do I find a verified professional on FindYourFixer?",
    answer:
      "Simply go to the home page, use the search bar, select a category (e.g., plumber, electrician), and filter by your location to see verified professionals.",
  },
  {
    question: "Is FindYourFixer free to use?",
    answer:
      "Yes! Browsing and connecting with professionals is completely free for users. Service providers may choose to pay for premium listing options.",
  },
  {
    question: "How can I become a verified service provider?",
    answer:
      "To get verified, sign up and complete your profile. Then upload your valid ID and a recent utility bill. Our team will review and approve your verification within 48 hours.",
  },
  {
    question: "Can I leave reviews for professionals?",
    answer:
      "Absolutely! After hiring a professional, you’ll be prompted to rate and review them. This helps others make informed decisions.",
  },
  {
    question: "What should I do if I have a complaint?",
    answer:
      "Please visit our Contact Support page and provide detailed information. We’ll investigate the issue and take necessary actions.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Frequently Asked Questions</h1>
      <p className="text-gray-700 mb-8">
        Here are answers to some of the most common questions about FindYourFixer. If you need more help, feel free to{" "}
        <Link to="/help/contact" className="text-indigo-600 underline">contact us</Link>.
      </p>

      <div className="space-y-4">
        {faqs.map((item, index) => (
          <div key={index} className="border rounded-lg shadow-sm bg-white overflow-hidden">
            <button
              onClick={() => toggle(index)}
              className="w-full flex justify-between items-center px-5 py-4 text-left text-gray-800 font-medium focus:outline-none hover:bg-gray-50"
            >
              <span>{item.question}</span>
              {openIndex === index ? (
                <FaChevronUp className="text-indigo-600" />
              ) : (
                <FaChevronDown className="text-indigo-600" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-5 py-3 text-gray-600 border-t bg-gray-50 animate-fade-in">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
