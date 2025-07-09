import { useState } from 'react';
import {
  FaUser,
  FaTools,
  FaCamera,
  FaIdCard,
  FaClipboardCheck,
  FaBriefcase
} from 'react-icons/fa';

const JoinAsPro = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    skillset: '',
    experience: '',
    bio: '',
    profilePhoto: null,
    certification: null,
    idCard: null,
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'file' ? files[0] : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted:', formData);
  };

  return (
    <section className=" p-8 md:p-12 bg-white shadow-2xl rounded-3xl relative overflow-hidden">
      {/* background image with light overlay */}
      <div className="absolute inset-0 bg-[url('/images/join-bg.jpeg')] bg-cover bg-center opacity-5 z-0" />
      
      <div className="relative z-10">
        <h2 className="text-4xl font-extrabold text-center text-[#003366] mb-4">
          Become a Verified Pro on FixFinder
        </h2>
        <p className="text-center text-gray-600 mb-10">
          Join thousands of professionals growing their businesses by connecting with local customers.
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaUser className="text-[#003366]" /> Personal Information
            </h3>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Full Name</label>
                <div className="flex items-center gap-3">
                  <FaUser className="text-[#003366]" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    placeholder="David Efe"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Short Bio</label>
                <textarea
                  name="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="Tell us about your experience, location, and passion."
                />
              </div>
            </div>
          </div>

          {/* Skill Info */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaTools className="text-[#003366]" /> Skill & Experience
            </h3>

            <div className="space-y-4">
              {/* Skillset */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Skillset / Specialty</label>
                <select
                  name="skillset"
                  value={formData.skillset}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">-- Select Skillset --</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Plumber">Plumber</option>
                  <option value="Tailor">Tailor</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Painter">Painter</option>
                  <option value="AC Technician">AC Technician</option>
                  <option value="Carpenter">Carpenter</option>
                </select>
              </div>

              {/* Experience */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Experience Level</label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]"
                >
                  <option value="">-- Select Experience --</option>
                  <option value="Beginner (0-1 yrs)">Beginner (0-1 yrs)</option>
                  <option value="Intermediate (2-4 yrs)">Intermediate (2-4 yrs)</option>
                  <option value="Expert (5+ yrs)">Expert (5+ yrs)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Uploads */}
          <div>
            <h3 className="text-2xl font-semibold text-[#003366] mb-4 flex items-center gap-2">
              <FaClipboardCheck className="text-[#003366]" /> Verification & Uploads
            </h3>

            <div className="space-y-4">
              {/* Profile Photo */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Profile Photo</label>
                <div className="flex items-center gap-3">
                  <FaCamera className="text-[#003366]" />
                  <input
                    type="file"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Certification */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Upload Certifications (Optional)</label>
                <input
                  type="file"
                  name="certification"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              {/* ID Card */}
              <div className="flex flex-col">
                <label className="font-medium mb-1">Upload ID Card</label>
                <div className="flex items-center gap-3">
                  <FaIdCard className="text-[#003366]" />
                  <input
                    type="file"
                    name="idCard"
                    accept="image/*"
                    required
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-300"
          >
            <FaBriefcase className="inline-block mr-2" />
            Join FixFinder Network
          </button>

          <p className="text-sm text-center text-gray-500 mt-4">
            By joining, you agree to FixFinder’s{' '}
            <span className="underline text-[#003366] cursor-pointer">Terms & Privacy</span>.
          </p>
        </form>
      </div>
    </section>
  );
};

export default JoinAsPro;
