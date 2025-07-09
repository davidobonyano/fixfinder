import { useState } from 'react';
import { useParams } from 'react-router-dom';
import professionalsData from '../data/professionals.json';
import ProfessionalCard from '../components/ProfessionalCard';
import ReviewModal from '../components/ReviewModal';

const CategoryPage = () => {
  const { category } = useParams();
  const [pros, setPros] = useState(professionalsData);
  const [selectedPro, setSelectedPro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredPros = pros.filter(
    (pro) => pro.category.toLowerCase() === category.toLowerCase()
  );

  const handleReviewSubmit = ({ serviceName, rating }) => {
    setPros((prev) =>
      prev.map((pro) =>
        pro.name === serviceName
          ? {
              ...pro,
              rating: (
                (pro.rating * (pro.reviewCount || 0) + rating) /
                ((pro.reviewCount || 0) + 1)
              ).toFixed(1),
              reviewCount: (pro.reviewCount || 0) + 1,
            }
          : pro
      )
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
        {category} Professionals
      </h2>

      {filteredPros.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPros.map((pro) => (
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
        <p className="text-gray-600 text-sm">No professionals found for this category.</p>
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
