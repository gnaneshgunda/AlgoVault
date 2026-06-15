import React, { useEffect, useState } from 'react';
import { getTrendingFeed, getBestFeed } from '../api';
import QuestionCard from './QuestionCard';

const FeedContainer = ({ userId }) => {
  const [feedType, setFeedType] = useState('trending');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        let data;
        if (feedType === 'trending') {
          data = await getTrendingFeed();
        } else {
          data = await getBestFeed();
        }
        setQuestions(data);
      } catch (e) {
        console.error("Failed to fetch feed", e);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [feedType]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <button
          onClick={() => setFeedType('trending')}
          style={{ fontWeight: feedType === 'trending' ? 'bold' : 'normal', padding: '8px' }}
        >
          Trending
        </button>
        <button
          onClick={() => setFeedType('best')}
          style={{ fontWeight: feedType === 'best' ? 'bold' : 'normal', padding: '8px' }}
        >
          All-Time Best
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : questions.length === 0 ? (
        <p>No questions found in this feed.</p>
      ) : (
        questions.map(q => <QuestionCard key={q.id} question={q} userId={userId} />)
      )}
    </div>
  );
};

export default FeedContainer;
