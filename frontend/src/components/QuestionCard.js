import React, { useState } from 'react';
import { ThumbsUp, Bookmark } from 'lucide-react';
import { createInteraction } from '../api';

const QuestionCard = ({ question, userId }) => {
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUpvote = async () => {
    if (upvoted) return;
    try {
      await createInteraction({
        user_id: userId,
        question_id: question.id,
        interaction_type: 'Upvote'
      });
      setUpvoted(true);
    } catch (e) {
      console.error(e);
      alert("Failed to upvote or already upvoted");
    }
  };

  const handleSave = async () => {
    if (saved) return;
    try {
      await createInteraction({
        user_id: userId,
        question_id: question.id,
        interaction_type: 'Save'
      });
      setSaved(true);
      alert("Question saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save or already saved");
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '16px', margin: '16px 0', borderRadius: '8px' }}>
      <h3>{question.title}</h3>
      <p style={{ color: 'gray' }}>{question.platform} | Views: {question.total_views}</p>
      <a href={question.original_url} target="_blank" rel="noopener noreferrer">View Problem</a>

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        <button onClick={handleUpvote} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: upvoted ? '#e0e0e0' : 'transparent', padding: '8px' }}>
          <ThumbsUp size={16} color={upvoted ? "blue" : "black"} /> Upvote
        </button>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: saved ? '#e0e0e0' : 'transparent', padding: '8px' }}>
          <Bookmark size={16} color={saved ? "green" : "black"} /> Save
        </button>
      </div>
    </div>
  );
};

export default QuestionCard;
