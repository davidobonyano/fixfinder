import { Link } from "react-router-dom";

const Terms = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700 dark:text-indigo-400">Terms and Conditions</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <p className="text-gray-700 dark:text-gray-300 mb-8">
        Welcome to FindYourFixer. By accessing or using our platform, you agree to be bound by these Terms and Conditions. 
        Please read them carefully before using our services.
      </p>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">1. Acceptance of Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            By accessing and using FindYourFixer, you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">2. Description of Service</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            FindYourFixer is a platform that connects users with verified service providers. We facilitate connections between 
            users seeking services and professionals offering those services. We do not provide the services ourselves, 
            but rather act as an intermediary platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">3. User Accounts</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            To use certain features of our platform, you must register for an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your information to keep it accurate, current, and complete</li>
            <li>Maintain the security of your password and identification</li>
            <li>Accept all responsibility for activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">4. Service Provider Verification</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Service providers on our platform may undergo a verification process. However, FindYourFixer does not guarantee 
            the quality, safety, or legality of services provided by verified professionals. Users are responsible for 
            conducting their own due diligence before engaging with any service provider.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">5. User Conduct</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            You agree not to use the platform to:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe upon the rights of others</li>
            <li>Post false, misleading, or fraudulent information</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Transmit any viruses, malware, or harmful code</li>
            <li>Attempt to gain unauthorized access to the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">6. Reviews and Ratings</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Users may post reviews and ratings of service providers. Reviews must be truthful and based on actual 
            experiences. FindYourFixer reserves the right to remove reviews that violate our policies or are deemed 
            inappropriate, fraudulent, or defamatory.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">7. Payments and Transactions</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Any payments made through the platform are subject to our payment terms. FindYourFixer may charge fees for 
            certain services. All fees are clearly disclosed before you complete a transaction. Refunds, if applicable, 
            will be processed according to our refund policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">8. Privacy Policy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Your use of FindYourFixer is also governed by our Privacy Policy. Please review our Privacy Policy to understand 
            how we collect, use, and protect your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">9. Limitation of Liability</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            FindYourFixer acts as an intermediary platform and is not responsible for the quality, safety, or legality of 
            services provided by third-party service providers. We are not liable for any damages, losses, or injuries 
            resulting from your use of the platform or services obtained through the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">10. Intellectual Property</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            All content on FindYourFixer, including text, graphics, logos, and software, is the property of FindYourFixer or 
            its content suppliers and is protected by copyright and other intellectual property laws. You may not 
            reproduce, distribute, or create derivative works without our express written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">11. Termination</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            We reserve the right to terminate or suspend your account and access to the platform at our sole discretion, 
            without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or 
            third parties, or for any other reason.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">12. Changes to Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            We reserve the right to modify these Terms at any time. We will notify users of any material changes by 
            posting the new Terms on this page and updating the "Last updated" date. Your continued use of the platform 
            after such modifications constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">13. Contact Information</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            If you have any questions about these Terms and Conditions, please contact us through our{" "}
            <Link to="/help/contact" className="text-indigo-600 dark:text-indigo-400 underline">Contact Support</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;

