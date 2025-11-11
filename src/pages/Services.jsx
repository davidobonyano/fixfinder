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
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const pageSize = 9;

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
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      return 0; // relevance default (no-op)
    });
    return sorted;
  }, [search, category, state, city, allServices, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage]);

  return (
    <section className="px-4 md:px-12 py-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-white" />
        <div className="max-w-6xl mx-auto py-12 md:py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">Explore Verified Local Services</h1>
            <p className="text-gray-600 text-lg mt-3 max-w-2xl mx-auto">Find trusted professionals near you. Filter by skill, location, and more.</p>
            {/* Quick category chips */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {allCategories.slice(0,8).map((c)=> (
                <button key={c} onClick={()=>{ setCategory(c); setPage(1); }} className={`px-3 py-1.5 rounded-full text-sm border ${category===c? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}`}>{c}</button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex justify-center mt-6">
              <div className="bg-white rounded-lg p-1 shadow-md border">
                <button onClick={() => setViewMode("list")} className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === "list"? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
                  <FaList size={16} /> List View
                </button>
                <button onClick={() => setViewMode("map")} className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === "map"? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
                  <FaMap size={16} /> Map View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <div className="lg:w-1/4 lg:sticky lg:top-20 self-start">
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
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">{filteredServices.length} results</p>
              <select value={sortBy} onChange={(e)=>{ setSortBy(e.target.value); setPage(1); }} className="border rounded-md px-3 py-2 text-sm">
                <option value="relevance">Sort: Relevance</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
            </div>

            {filteredServices.length ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedServices.map((service) => (
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

            {/* Pagination */}
            {filteredServices.length > pageSize && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button onClick={()=> setPage((p)=> Math.max(1, p-1))} disabled={currentPage===1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">Prev</button>
                {Array.from({length: totalPages}).slice(0,6).map((_, i)=> {
                  const num = i+1;
                  return (
                    <button key={num} onClick={()=> setPage(num)} className={`px-3 py-1.5 rounded border text-sm ${currentPage===num? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{num}</button>
                  );
                })}
                <button onClick={()=> setPage((p)=> Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">Next</button>
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
