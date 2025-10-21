import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMapMarkerAlt,
  faWrench,
  faScissors,
  faBolt,
  faWater,
  faUtensils,
  faFan,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const iconMap = {
  electrician: faBolt,
  tailor: faScissors,
  plumber: faWater,
  chef: faUtensils,
  ac: faFan,
  default: faWrench,
};

const getIcon = (name) => {
  const key = name.toLowerCase().split(' ')[0];
  return iconMap[key] || iconMap.default;
};

const ServiceCard = ({ service }) => {
  const imageName = service.name.toLowerCase().replace(/\s+/g, '');
  const fallbackImageSrc = `/images/${imageName}.jpeg`;
  const imageSrc = service.image || fallbackImageSrc;

  return (
    <div
      className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-xl hover:scale-[1.02] focus:outline-blue-300"
      tabIndex={0}
      aria-label={`Service card for ${service.name} in ${service.location}`}
    >
      <img
        src={imageSrc}
        onError={(e) => (e.currentTarget.src = '/images/placeholder.jpeg')}
        alt={`Photo representing ${service.name}`}
        className="w-full h-32 object-cover rounded-md mb-3"
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
          <FontAwesomeIcon icon={getIcon(service.name)} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {service.description}
      </p>

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
