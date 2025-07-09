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
    <section className="px-4 md:px-12 py-12 bg-gray-50 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gray-800">
        Find Local Services
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter Sidebar */}
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

        {/* Service Cards Section */}
        <div className="flex-1">
          {filteredServices.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id || service.name} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center mt-10 text-gray-500">
              <img
                src="/images/empty.png"
                alt="No services found"
                className="mx-auto w-32 h-32 mb-4 opacity-70"
              />
              <p className="text-lg">No matching services found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
