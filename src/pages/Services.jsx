import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicesData from '../data/services.json';
import FilterSidebar from '../components/FilterSidebar';

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  const allCities = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin'];
  const allCategories = [...new Set(servicesData.map((s) => s.name))];

  useEffect(() => {
    const keyword = search.toLowerCase();

    const filtered = servicesData.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(keyword) ||
        service.description.toLowerCase().includes(keyword);

      const matchesCategory = category ? service.name === category : true;
      const matchesCity = city ? service.location === city : true;

      return matchesSearch && matchesCategory && matchesCity;
    });

    setServices(filtered);
  }, [search, category, city]);

  return (
    <section className="px-4 md:px-12 py-12 bg-white min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-800">
        All Services
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <FilterSidebar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          city={city}
          setCity={setCity}
          allCategories={allCategories}
          allCities={allCities}
        />

        {/* Service Cards */}
        <div className="flex-1">
          {services.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="border rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all"
                >
                  <img
                    src={`/images/${service.name.toLowerCase().replace(/\s+/g, '')}.jpeg`}
                    onError={(e) =>
                      (e.currentTarget.src = '/images/placeholder.jpeg')
                    }
                    alt={service.name}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {service.description}
                    </p>
                    <div className="mt-3">
                      <Link
                        to={`/services/${service.name.toLowerCase()}`}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        View More →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-10">
              No matching services found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
