// components/SkeletonCard.jsx
const SkeletonCard = () => (
  <div className="animate-pulse bg-white rounded-xl shadow-md p-4 space-y-4 w-full">
    <div className="h-40 bg-gray-300 rounded-md" />
    <div className="h-4 bg-gray-300 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="h-4 bg-gray-100 rounded w-full" />
  </div>
);

export default SkeletonCard;
