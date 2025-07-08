import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
const ServiceCard = ({ service }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
          <FontAwesomeIcon icon={faWrench} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
      </div>

      <p className="text-gray-600 text-sm mb-4">{service.description}</p>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
          {service.location}
        </span>
                            
        <Link
          to={`/services/${service.name.toLowerCase()}`}
          className="text-sm text-blue-600 font-medium hover:underline"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ServiceCard;
 