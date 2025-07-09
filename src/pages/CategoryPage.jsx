import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import professionalsData from '../data/professionals.json';
import ProfessionalCard from '../components/ProfessionalCard';
import ReviewModal from '../components/ReviewModal';
import SkeletonCard from '../components/SkeletonCard';

const LOCAL_KEY = 'fixfinder-reviews';

const CategoryPage = () => {
  const { category } = useParams();
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPro, setSelectedPro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load professionals and attach saved reviews from localStorage
  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      const stored = localStorage.getItem(LOCAL_KEY);
      const storedReviews = stored ? JSON.parse(stored) : {};

      const filtered = professionalsData.filter(
        (pro) => pro.category.toLowerCase() === category.toLowerCase()
      );

      const enriched = filtered.map((pro) => {
        const saved = storedReviews[pro.name] || {};
        return {
          ...pro,
          rating: saved.rating || pro.rating,
          reviewCount: saved.reviewCount || pro.reviewCount || 0,
          reviews: saved.reviews || [],
        };
      });

      setPros(enriched);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [category]);

  const handleReviewSubmit = ({ serviceName, review, rating }) => {
    setPros((prev) =>
      prev.map((pro) => {
        if (pro.name === serviceName) {
          const newReviews = [...(pro.reviews || []), { text: review, rating }];
          const newCount = (pro.reviewCount || 0) + 1;
          const newRating = (
            (pro.rating * (pro.reviewCount || 0) + rating) / newCount
          ).toFixed(1);

          // Save to localStorage
          const stored = localStorage.getItem(LOCAL_KEY);
          const parsed = stored ? JSON.parse(stored) : {};
          parsed[pro.name] = {
            rating: newRating,
            reviewCount: newCount,
            reviews: newReviews,
          };
          localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed));

          return {
            ...pro,
            rating: newRating,
            reviewCount: newCount,
            reviews: newReviews,
          };
        }
        return pro;
      })
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
        {category} Professionals
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : pros.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pros.map((pro) => (
            <ProfessionalCard
              key={pro.id}
              pro={pro}
              onReviewClick={(pro) => {
                setSelectedPro(pro);
                setIsModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">
          No professionals found for this category.
        </p>
      )}

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serviceName={selectedPro?.name}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default CategoryPage;
