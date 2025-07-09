import { useState, useMemo, useEffect } from "react";
import ServiceCard from "../components/ServiceCard";
import FilterSidebar from "../components/FilterSidebar";
import { getAllServices } from "../utils/getAllServices";

const Services = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [allServices, setAllServices] = useState([]);

  useEffect(() => {
    const all = getAllServices();
    setAllServices(all);
  }, []);

  const allCities = [...new Set(allServices.map((s) => s.location))];
  const allCategories = [...new Set(allServices.map((s) => s.name))];

  const filteredServices = useMemo(() => {
    const keyword = search.toLowerCase();

    return allServices.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(keyword) ||
        service.description.toLowerCase().includes(keyword);

      const matchesCategory = category ? service.name === category : true;
      const matchesCity = city ? service.location === city : true;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [search, category, city, allServices]);

  return (
    <section className="px-4 md:px-12 py-16   bg-gray-100 bg-gradient-to-br from-white via-gray-50 to-gray-100 min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          Explore Verified Local Services
        </h1>
        <p className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">
          Find trusted professionals near you, filtered by skill and city.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        <div className="lg:w-1/4">
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
        </div>

        {/* Services Grid */}
        <div className="lg:w-3/4">
          {filteredServices.length ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id || service.name}
                  className="transition-all duration-300 transform hover:scale-105"
                >
                  <ServiceCard service={service} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center mt-16 text-gray-600">
              <img
                src="/images/empty.png"
                alt="No services"
                className="mx-auto w-40 h-40 mb-6 opacity-60"
              />
              <h2 className="text-2xl font-semibold mb-2">
                No matching services found
              </h2>
              <p className="text-sm text-gray-400">
                Try adjusting your search terms or filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
