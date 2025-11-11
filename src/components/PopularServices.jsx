import { Link } from 'react-router-dom';

const ITEMS = [
  { slug: 'borehole-drilling', title: 'Borehole Drilling', subtitle: 'borehole drilling service' },
  { slug: 'ac-installation', title: 'AC Installation', subtitle: 'AC installation services' },
  { slug: 'truck-hire', title: 'Truck Hire and Rental', subtitle: 'truck rental for construction' },
  { slug: 'event-planning', title: 'Event Planning', subtitle: 'Event Planning' },
  { slug: 'makeup', title: 'Makeup', subtitle: 'Makeup' },
  { slug: 'dispatch-rider', title: 'Dispatch Rider and Delivery Service', subtitle: 'Dispatch Rider and Delivery Service' },
  { slug: 'house-cleaning', title: 'House Cleaning', subtitle: 'man cleaning floor - House Cleaning Service on VisCorner' },
  { slug: 'tv-repair', title: 'TV Repair', subtitle: 'tv repair service' },
];

export default function PopularServices() {
  return (
    <section className="px-4 md:px-12 py-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">Popular services</h2>
        <p className="text-center text-gray-600 mt-3">Discover the most in-demand services trusted by thousands of satisfied clients.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <Link
              key={item.slug}
              to={`/services/${item.slug}`}
              className="group block rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="p-5">
                <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">{item.subtitle}</p>
                <h3 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{item.title}</h3>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600">
                  View details
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}









