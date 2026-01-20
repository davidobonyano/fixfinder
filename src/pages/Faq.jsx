import { useState } from "react";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "How do I find a service provider?",
    answer:
      "Simply go to the home page, use the search bar, select a category (e.g., plumber, electrician), and filter by your location to see verified professionals.",
  },
  {
    question: "Is FYF free to use?",
    answer:
      "Yes! Browsing and connecting with professionals is completely free for users. Service providers may choose to pay for premium listing options.",
  },
  {
    question: "How do I become a service provider?",
    answer:
      "You can sign up as a professional by clicking the 'Join as Pro' button in the navigation bar. You'll need to provide details about your skills and experience.",
  },
  {
    question: "Are the professionals verified?",
    answer:
      "We encourage all professionals to undergo our verification process, which includes identity checks and skill assessments. Look for the 'Verified' badge on their profiles.",
  },
  {
    question: "How do I pay for services?",
    answer:
      "You can negotiate and pay for services directly with the professional. We're currently working on an integrated payment system for added security.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Frequently Asked Questions</h1>
      <p className="text-gray-700 mb-8">
        Here are answers to some of the most common questions about FYF. If you need more help, feel free to{" "}
        <Link to="/help/contact" className="text-indigo-600 underline">contact us</Link>.
      </p>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              className="w-full text-left px-6 py-4 bg-gray-50 hover:bg-gray-100 font-semibold flex justify-between items-center transition-colors"
              onClick={() => toggleFaq(index)}
            >
              <span>{faq.question}</span>
              <span>{openIndex === index ? "−" : "+"}</span>
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 bg-white text-gray-700 border-t border-gray-200">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
