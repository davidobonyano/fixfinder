import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faStar, faPhone } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const ProfessionalCard = ({ pro, onReviewClick, userLocation }) => {
  // Handle real professional data structure from backend
  const rating = pro.ratingAvg || 0;
  const reviewCount = pro.ratingCount || 0;
  const location = pro.location?.address || pro.city || 'Location not specified';
  
  // Debug logging
  console.log('ProfessionalCard - pro data:', {
    name: pro.name,
    photos: pro.photos,
    image: pro.image,
    user: pro.user,
    _id: pro._id
  });
  
  // Use professional photos first, then user profile picture, then placeholder
  let image = '/images/placeholder.jpeg';
  if (pro.photos && pro.photos.length > 0 && pro.photos[0] !== '/images/placeholder.jpeg') {
    image = pro.photos[0];
  } else if (pro.user?.profilePicture) {
    image = pro.user.profilePicture;
  } else if (pro.image && pro.image !== '/images/placeholder.jpeg') {
    image = pro.image;
  }

  // Calculate distance if user location is available
  const calculateDistance = (userLat, userLon, proLat, proLon) => {
    if (!proLat || !proLon) return null;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (proLat - userLat) * Math.PI / 180;
    const dLon = (proLon - userLon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(proLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const distance = userLocation && pro.coordinates 
    ? calculateDistance(userLocation[0], userLocation[1], pro.coordinates[0], pro.coordinates[1])
    : null;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 transition hover:shadow-xl flex flex-col justify-between">
      <img
        src={image}
        alt={pro.name}
        className="w-full h-40 object-cover rounded-lg mb-4"
        onError={(e) => {
          console.log('Image failed to load:', image);
          e.currentTarget.src = '/images/placeholder.jpeg';
        }}
        onLoad={() => console.log('Image loaded successfully:', image)}
      />

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{pro.name}</h3>
        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-500" />
          {location}
          {distance && (
            <span className="ml-2 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              {distance}km away
            </span>
          )}
        </p>
        {pro.pricePerHour && (
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">₦{pro.pricePerHour.toLocaleString()}/hour</span>
          </p>
        )}
        {pro.bio && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {pro.bio}
          </p>
        )}
        {pro.videos && pro.videos.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
            <span>📹 {pro.videos.length} video{pro.videos.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {pro.certifications && pro.certifications.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
            <span>🏆 {pro.certifications.length} certification{pro.certifications.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
          <span className="text-sm font-medium text-gray-700">
            {rating} ({reviewCount} reviews)
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/professionals/${pro._id || pro.id}`}
            state={{ professional: pro }}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            View Profile
          </Link>
          <button
            onClick={() => onReviewClick(pro)}
            className="text-sm text-green-600 hover:underline font-medium"
          >
            Review
          </button>
        </div>
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
