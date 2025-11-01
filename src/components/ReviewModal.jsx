import React from 'react';

const ReviewModal = ({ isOpen, onClose, serviceName, onSubmit }) => {
  const [review, setReview] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState('');

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setReview('');
      setRating(0);
      setError('');
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Validate rating
    if (rating === 0) {
      setError('Please select a rating before submitting');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({ serviceName, review, rating });
      setSubmitted(true);
      // Keep modal open momentarily to show thank you
      setTimeout(() => { 
        onClose(); 
        setSubmitted(false);
        setReview('');
        setRating(0);
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Leave a Review for {serviceName}</h2>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          placeholder="Write your review..."
          className="w-full p-2 border border-gray-300 rounded mb-4"
          disabled={isSubmitting}
        />

        <div className="mb-4">
          <label className="block mb-1 font-medium text-sm text-gray-600">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRating(r);
                  setError(''); // Clear error when rating is selected
                }}
                disabled={isSubmitting || submitted}
                className={`focus:outline-none transition-transform ${!submitted && !isSubmitting ? 'hover:scale-110' : ''} ${isSubmitting || submitted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                aria-label={`${r} star`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={r <= rating ? '#FBBF24' : 'none'} stroke="#FBBF24" strokeWidth={r <= rating ? '0' : '1.5'} className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.035a1 1 0 00-1.176 0l-2.802 2.035c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81H6.93a1 1 0 00.95-.69l1.17-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          {rating === 0 && !submitted && (
            <p className="text-sm text-amber-600 mt-1">⚠️ Please select a rating by clicking the stars above</p>
          )}
          {rating > 0 && (
            <p className="text-sm text-green-600 mt-1">✓ {rating} {rating === 1 ? 'star' : 'stars'} selected</p>
          )}
          {error && rating === 0 && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className={`px-4 py-2 rounded text-white flex items-center justify-center min-w-[120px] transition-colors ${
              submitted 
                ? 'bg-green-600 cursor-not-allowed' 
                : rating === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isSubmitting || submitted || rating === 0}
            title={rating === 0 ? 'Please select a rating first' : submitted ? 'Review submitted successfully' : ''}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : submitted ? (
              '✓ Thanks for the review!'
            ) : (
              'Submit Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
