import React from 'react';

const FilterSidebar = ({ search, setSearch, category, setCategory, city, setCity, allCategories, allCities }) => {
  return (
    <aside className="w-full md:w-64 bg-white border p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Filter Services</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">All Categories</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">All Cities</option>
          {allCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </aside>
  );
};

export default FilterSidebar;