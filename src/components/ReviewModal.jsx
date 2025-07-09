import React from 'react';

const ReviewModal = ({ isOpen, onClose, serviceName, onSubmit }) => {
  const [review, setReview] = React.useState('');
  const [rating, setRating] = React.useState(5);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsSubmitting(true);

    // Simulate delay like an API call
    setTimeout(() => {
      onSubmit({ serviceName, review, rating });
      setReview('');
      setRating(5);
      setIsSubmitting(false);
      onClose();
    }, 1000); // 1 second fake delay
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
          <label className="block mb-1 font-medium text-sm text-gray-600">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
            disabled={isSubmitting}
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Star{r !== 1 && 's'}</option>
            ))}
          </select>
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
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center min-w-[90px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
