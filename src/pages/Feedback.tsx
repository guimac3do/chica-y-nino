import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '@/lib/axios';

interface Feedback {
  id: number;
  user_id: number;
  content: string;
  status: 'pending' | 'approved';
  user: { name: string };
}

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback | null>(null);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
    fetchMyFeedback();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const response = await axios.get('api/feedbacks');
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error.response?.data);
    }
  };

  const fetchMyFeedback = async () => {
    try {
      const response = await axios.get('api/my-feedback');
      setMyFeedback(response.data);
      setContent(response.data?.content || '');
    } catch (error) {
      console.error('Error fetching my feedback:', error.response?.data);
      setContent('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (myFeedback) {
        const response = await axios.put(`api/feedbacks/${myFeedback.id}`, { content });
        setMyFeedback(response.data);
        setIsEditing(false); // Exit edit mode after saving
      } else {
        const response = await axios.post('api/feedbacks', { content });
        setMyFeedback(response.data);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error.response?.data);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  if (!user) return <div>Please log in to submit feedback.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Feedback</h1>

      {/* User's Feedback */}
      {myFeedback ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Your Feedback</h2>
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows={4}
                placeholder="Write your feedback here..."
              />
              <button type="submit" className="mt-2 bg-blue-500 text-white p-2 rounded">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="mt-2 ml-2 bg-gray-500 text-white p-2 rounded"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="border p-4 rounded">
              <p>{myFeedback.content}</p>
              <p className="text-sm text-gray-500">
                Status: {myFeedback.status === 'pending' ? 'Pending Approval' : 'Approved'}
              </p>
              <button
                onClick={startEditing}
                className="mt-2 bg-yellow-500 text-white p-2 rounded"
              >
                Edit Feedback
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="Write your feedback here..."
          />
          <button type="submit" className="mt-2 bg-blue-500 text-white p-2 rounded">
            Submit Feedback
          </button>
        </form>
      )}

      {/* Approved Feedbacks */}
      <h2 className="text-xl font-semibold mb-2">Approved Feedbacks</h2>
      {feedbacks.length === 0 ? (
        <p>No feedback yet.</p>
      ) : (
        feedbacks
          .filter(f => f.user_id !== user.id) // Exclude user's own feedback
          .map((feedback) => (
            <div key={feedback.id} className="border p-4 mb-2 rounded">
              <p>{feedback.content}</p>
              <p className="text-sm text-gray-500">— {feedback.user.name}</p>
            </div>
          ))
      )}
    </div>
  );
};

export default FeedbackPage;