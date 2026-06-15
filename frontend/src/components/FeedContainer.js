import React, { useEffect, useState } from 'react';
import { getTrendingFeed, getBestFeed } from '../api';
import QuestionCard from './QuestionCard';
import { Flame, Trophy, Search } from 'lucide-react';

const FeedPage = ({ isLoggedIn, onToast }) => {
  const [feedType, setFeedType] = useState('trending');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
        console.error('Failed to fetch feed', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [feedType]);

  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          {feedType === 'trending' ? '🔥 Trending Problems' : '🏆 Hall of Fame'}
        </h1>
        <p className="page-subtitle">
          {feedType === 'trending'
            ? 'Fresh, high-activity problems bubbling up right now'
            : 'All-time best problems mathematically proven by community saves'}
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${feedType === 'trending' ? 'active' : ''}`}
          onClick={() => setFeedType('trending')}
        >
          <Flame size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
          Trending
        </button>
        <button
          className={`tab ${feedType === 'best' ? 'active' : ''}`}
          onClick={() => setFeedType('best')}
        >
          <Trophy size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
          Hall of Fame
        </button>
      </div>

      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)'
        }} />
        <input
          className="input"
          type="text"
          placeholder="Search problems by title or platform..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No problems found</div>
          <p>Be the first to submit a problem!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredQuestions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              isLoggedIn={isLoggedIn}
              onToast={onToast}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedPage;
