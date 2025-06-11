import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useToast } from "@/hooks/use-toast";

interface Feedback {
  id: number;
  user_id: number;
  content: string;
  status: 'pending' | 'approved';
  user?: { name: string };
}

const AdminFeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const response = await axios.get('api/admin/feedbacks');
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error.response?.data);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await axios.post(`api/admin/feedbacks/${id}/approve`);
      setFeedbacks(feedbacks.map(f => f.id === id ? response.data : f));
      toast({
        title: "Sucesso",
        description: "Feedback aprovado com sucesso!",
      });
    } catch (error) {
      console.error('Error approving feedback:', error.response?.data);
      toast({
        title: "Erro",
        description: "Falha ao aprovar o feedback.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Feedback</h1>
      {feedbacks.length === 0 ? (
        <p>No feedback yet.</p>
      ) : (
        feedbacks.map((feedback) => (
          <div key={feedback.id} className="border p-4 mb-2 rounded flex justify-between items-center">
            <div>
              <p>{feedback.content}</p>
              <p className="text-sm text-gray-500">
                — {feedback.user?.name || 'Unknown User'} ({feedback.status})
              </p>
            </div>
            {feedback.status === 'pending' && (
              <button
                onClick={() => handleApprove(feedback.id)}
                className="bg-green-500 text-white p-2 rounded"
              >
                Approve
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AdminFeedbackPage;