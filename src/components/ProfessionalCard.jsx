import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faStar, faPhone } from '@fortawesome/free-solid-svg-icons';

const ProfessionalCard = ({ pro, onReviewClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-xl flex flex-col justify-between">
      <img
        src={pro.image || '/pro/default.jpg'}
        alt={pro.name}
        className="w-full h-40 object-cover rounded-lg mb-4"
      />

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{pro.name}</h3>
        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-500" />
          {pro.location}
        </p>
        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
          <FontAwesomeIcon icon={faPhone} className="text-green-500" />
          {pro.phone}
        </p>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
          <span className="text-sm font-medium text-gray-700">
            {pro.rating} ({pro.reviewCount || 0} reviews)
          </span>
        </div>

        <button
          onClick={() => onReviewClick(pro)}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Leave Review
        </button>
      </div>

      {pro.reviews?.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <h4 className="text-sm font-semibold mb-2 text-gray-800">Recent Reviews:</h4>
          <ul className="space-y-2 max-h-32 overflow-auto text-sm text-gray-700">
            {pro.reviews.slice().reverse().map((r, idx) => (
              <li key={idx} className="bg-gray-100 p-2 rounded">
                <span className="block mb-1 text-yellow-500">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
                <p className="text-gray-600">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProfessionalCard;
