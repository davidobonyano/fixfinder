import React from 'react';

const ReviewModal = ({ isOpen, onClose, serviceName, onSubmit }) => {
  const [review, setReview] = React.useState('');
  const [rating, setRating] = React.useState(5);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ serviceName, review, rating });
    setReview('');
    setRating(5);
    onClose();
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
        />
        <div className="mb-4">
          <label className="block mb-1 font-medium text-sm text-gray-600">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Star{r !== 1 && 's'}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
