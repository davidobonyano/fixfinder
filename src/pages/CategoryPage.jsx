import { useParams } from 'react-router-dom';
import professionals from '../data/professionals.json';
import ProfessionalCard from '../components/ProfessionalCard';

const CategoryPage = () => {
  const { category } = useParams();

  // Filter professionals based on URL category
  const filteredPros = professionals.filter(
    (pro) => pro.category.toLowerCase() === category.toLowerCase()
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
        {category} Professionals
      </h2>

      {filteredPros.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPros.map((pro) => (
            <ProfessionalCard key={pro.id} pro={pro} />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">No professionals found for this category.</p>
      )}
    </div>
  );
};

export default CategoryPage;
