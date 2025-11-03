import { useEffect, useState } from 'react';
import { FaStar, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { getProfessional, getProfessionalReviews } from '../../utils/api';

const ProReviews = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        console.log('📝 ProReviews: Loading reviews for user:', user?.id);
        
        // Resolve professional id by user
        let proId = null;
        try {
          const p = await getProfessional(user?.id, { byUser: true });
          console.log('👤 ProReviews: Professional response:', p);
          proId = p?.data?._id || p?._id || p?.data?.professional?._id || p?.professional?._id;
          console.log('🆔 ProReviews: Resolved professional ID:', proId);
        } catch (err) {
          console.error('❌ ProReviews: Error getting professional:', err);
        }

        // Fetch all reviews
        if (proId) {
          try {
            console.log('📋 ProReviews: Fetching reviews for professional ID:', proId);
            const r = await getProfessionalReviews(proId, { limit: 50 });
            console.log('📊 ProReviews: Reviews API response:', r);
            
            // Handle different response formats
            let items = [];
            if (Array.isArray(r)) {
              items = r;
            } else if (r?.data?.reviews) {
              items = Array.isArray(r.data.reviews) ? r.data.reviews : [];
            } else if (r?.data) {
              items = Array.isArray(r.data) ? r.data : [];
            } else if (r?.reviews) {
              items = Array.isArray(r.reviews) ? r.reviews : [];
            }
            
            console.log('✅ ProReviews: Parsed reviews:', items.length, items);
            
            // Show all reviews - calculate summary from all reviews
            const avg = items.length ? (items.reduce((s, x) => s + Number(x.rating || 0), 0) / items.length) : 0;
            setSummary({ averageRating: Number(avg.toFixed(1)), totalReviews: items.length });
            setReviews(items.map(x => ({
              _id: x._id || x.id,
              reviewerName: x.user?.name || x.reviewerName || 'Anonymous',
              rating: Number(x.rating || 0),
              comment: x.comment || x.review || '',
              createdAt: x.createdAt || new Date().toISOString(),
              jobTitle: typeof x.jobId === 'object' && x.jobId?.title ? x.jobId.title : (x.job?.title || ''),
              jobId: typeof x.jobId === 'object' ? (x.jobId?._id || x.jobId) : (typeof x.job === 'string' ? x.job : (x.job?._id || x.jobId))
            })));
            return;
          } catch (e) {
            console.error('❌ ProReviews: Error fetching reviews:', e);
          }
        } else {
          console.warn('⚠️ ProReviews: No professional ID found for user:', user?.id);
        }

        // Removed overview fallback since overview was removed

        // Final fallback: empty
        console.warn('⚠️ ProReviews: No reviews found, showing empty state');
        setSummary({ averageRating: 0, totalReviews: 0 });
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <FaSpinner className="animate-spin text-gray-400 text-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reviews</h1>
        <p className="text-gray-600">What clients say about your work</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center text-yellow-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <FaStar key={i} className={i < Math.round(summary.averageRating) ? '' : 'text-gray-300'} />
            ))}
          </div>
          <span className="text-gray-900 font-semibold">{summary.averageRating}</span>
          <span className="text-gray-500">({summary.totalReviews} reviews)</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((rev) => (
          <div key={rev._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-gray-900">{rev.reviewerName}</p>
              <div className="flex items-center text-yellow-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FaStar key={i} className={i < rev.rating ? '' : 'text-gray-300'} />
                ))}
              </div>
            </div>
            <p className="text-gray-700 text-sm">{rev.comment}</p>
            <p className="text-gray-400 text-xs mt-2">
              {new Date(rev.createdAt).toLocaleDateString()} {rev.jobTitle ? `• ${rev.jobTitle}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProReviews;





