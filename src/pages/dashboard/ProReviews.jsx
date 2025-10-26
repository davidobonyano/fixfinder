import { useEffect, useState } from 'react';
import { FaStar, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../context/useAuth';
import { getProOverview } from '../../utils/api';

const ProReviews = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Try backend overview first for ratings summary; fall back to mock
        try {
          const res = await getProOverview();
          if (res?.success) {
            const { averageRating = 0, totalReviews = 0, recentReviews = [] } = res.data || {};
            setSummary({ averageRating, totalReviews });
            if (recentReviews.length) {
              setReviews(recentReviews);
              return;
            }
          }
        } catch (_) {}

        // Mock reviews
        const mock = [
          {
            _id: 'r1',
            reviewerName: 'John Doe',
            rating: 5,
            comment: 'Excellent service and quick response!',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            _id: 'r2',
            reviewerName: 'Amaka U.',
            rating: 4,
            comment: 'Great job, would hire again.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          }
        ];
        const avg = mock.reduce((s, r) => s + r.rating, 0) / mock.length;
        setSummary({ averageRating: Number(avg.toFixed(1)), totalReviews: mock.length });
        setReviews(mock);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?._id]);

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
              {new Date(rev.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProReviews;





