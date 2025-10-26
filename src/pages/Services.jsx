import { useState, useMemo, useEffect } from "react";
import ServiceCard from "../components/ServiceCard";
import FilterSidebar from "../components/FilterSidebar";
import ServicesMap from "../components/ServicesMap";
import { getProfessionals } from "../utils/api";
import servicesData from "../data/services.json";
import { FaList, FaMap } from "react-icons/fa";
import ServiceSelector from "../components/ServiceSelector";

const Services = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [allServices, setAllServices] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"

  useEffect(() => {
    const load = async () => {
      // For now, always use the full mock services until we have enough real professionals
      setAllServices(servicesData);
      
      // TODO: Later, when we have enough professionals, we can switch to this logic:
      // try {
      //   const response = await getProfessionals();
      //   const professionals = response.professionals || [];
      //   
      //   if (professionals.length >= 20) { // Only use real data when we have enough professionals
      //     const uniqueServices = [...new Set(professionals.map(pro => pro.category || pro.services?.[0]))]
      //       .filter(Boolean)
      //       .map(serviceName => ({
      //         id: serviceName.toLowerCase().replace(/\s+/g, '-'),
      //         name: serviceName,
      //         description: `Professional ${serviceName} services available in your area`,
      //         location: 'Multiple Locations'
      //       }));
      //     
      //     if (uniqueServices.length > 0) {
      //       setAllServices(uniqueServices);
      //     }
      //   }
      // } catch (e) {
      //   console.log('API Error, using fallback services:', e);
      // }
    };
    load();
  }, []);

  const allCities = [...new Set(allServices.map((s) => s.location))];
  const allCategories = [...new Set(allServices.map((s) => s.name))];

  const filteredServices = useMemo(() => {
    const keyword = search.toLowerCase();
    const filtered = allServices.filter((service) => {
      const matchesSearch =
        service.name?.toLowerCase().includes(keyword) ||
        service.description?.toLowerCase().includes(keyword);
      const matchesCategory = category ? service.category === category || service.name === category : true;
      const matchesState = state ? service.location?.toLowerCase().includes(state.toLowerCase()) : true;
      const matchesCity = city ? service.city === city || service.location === city : true;
      return matchesSearch && matchesCategory && matchesState && matchesCity;
    });
    
    // If no results after filtering, show some services anyway (for demo purposes)
    if (filtered.length === 0 && (state || city)) {
      return allServices.slice(0, 6); // Show first 6 services as fallback
    }
    
    return filtered;
  }, [search, category, state, city, allServices]);

  return (
    <section className="px-4 md:px-12 py-16   bg-gray-100 bg-gradient-to-br from-white via-gray-50 to-gray-100 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 leading-tight">
          Explore Verified Local Services
        </h1>
        <p className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">
          Find trusted professionals near you, filtered by skill and city.
        </p>
        
        {/* View Mode Toggle */}
        <div className="flex justify-center mt-6">
          <div className="bg-white rounded-lg p-1 shadow-md border">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <FaList size={16} />
              List View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                viewMode === "map"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <FaMap size={16} />
              Map View
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <div className="lg:w-1/4">
            <FilterSidebar
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              state={state}
              setState={setState}
              city={city}
              setCity={setCity}
              allCategories={allCategories}
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
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ServicesMap />
        </div>
      )}
    </section>
  );
};

export default Services;
