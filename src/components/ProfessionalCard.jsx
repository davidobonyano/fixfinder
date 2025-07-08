import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faStar, faPhone } from '@fortawesome/free-solid-svg-icons';

const ProfessionalCard = ({ pro }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-xl">
      <img
        src={pro.image}
        alt={pro.name}
        className="w-full h-40 object-cover rounded-lg mb-4"
      />
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{pro.name}</h3>
      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-500" />
        {pro.location}
      </p>
      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
        <FontAwesomeIcon icon={faPhone} className="text-green-500" />
        {pro.phone}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
        <span className="text-sm font-medium text-gray-700">{pro.rating}</span>
      </div>
    </div>
  );
};

export default ProfessionalCard;
