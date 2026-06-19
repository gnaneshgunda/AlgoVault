import React, { useEffect, useState, useCallback } from 'react';
import { getTrendingFeed, getBestFeed } from '../api';
import QuestionCard from './QuestionCard';
import { Flame, Trophy, Search, Filter, X, ChevronDown } from 'lucide-react';

const TOPIC_TAGS = [
  'Array','String','Matrix','Graph','Tree','Binary Tree','Binary Search Tree',
  'N-ary Tree','Linked List','Math','Geometry','Dynamic Programming','Strings','Network Flow',
];
const TECHNIQUE_TAGS = [
  'Simulation','Sorting','Searching','Greedy','Implementation',
  'Stack','Queue','Deque','Hash Table','Set','Heap / Priority Queue',
  'Ordered Set','Trie','Union Find (DSU)','Segment Tree','Fenwick Tree',
  'Binary Indexed Tree','Tree DP','Lowest Common Ancestor',
  'DFS','BFS','Topological Sort','Shortest Path','Minimum Spanning Tree',
  'Strongly Connected Components','Bridges & Articulation Points','Euler Tour',
  'Functional Graph','Knapsack','Bitmask DP','Digit DP','Interval DP',
  'Memoization','Prefix Sum','Difference Array','Sliding Window','Two Pointers',
  'Binary Search','Sparse Table',"Mo's Algorithm",'Number Theory','Combinatorics',
  'Probability','Game Theory','Bit Manipulation','String Matching','KMP',
  'Z Algorithm','Rolling Hash','Suffix Array','Manacher','Palindrome',
  'Convex Hull','Line Sweep','Maximum Flow','Minimum Cost Flow','Bipartite Matching',
  'Divide & Conquer','Backtracking','Meet in the Middle','Convex Hull Trick',
  'Heavy-Light Decomposition','Centroid Decomposition','Persistent Data Structure',
  'Interactive','Ad Hoc','Constructive','Brute Force','Recursion',
  'Offline Queries','Online Queries',
];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DIFF_COLORS = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' };

const TagPill = ({ label, active, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600,
      cursor: 'pointer', border: `1px solid ${active ? (color || 'var(--accent-primary)') : 'var(--border-light)'}`,
      background: active ? `${color || 'var(--accent-primary)'}20` : 'transparent',
      color: active ? (color || 'var(--accent-secondary)') : 'var(--text-muted)',
      transition: 'all 0.15s',
      fontFamily: 'Inter, sans-serif',
    }}
  >
    {label}
  </button>
);

const FeedPage = ({ isLoggedIn, currentUserId, onToast }) => {
  const [feedType, setFeedType] = useState('trending');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedTechniques, setSelectedTechniques] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const activeFilterCount = selectedTopics.length + selectedTechniques.length + (selectedDifficulty ? 1 : 0);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        topic_tags: selectedTopics,
        technique_tags: selectedTechniques,
        difficulty: selectedDifficulty,
      };
      const data = feedType === 'trending'
        ? await getTrendingFeed(0, 20, filters)
        : await getBestFeed(0, 20, filters);
      setQuestions(data);
    } catch (e) {
      console.error('Failed to fetch feed', e);
    } finally {
      setLoading(false);
    }
  }, [feedType, selectedTopics, selectedTechniques, selectedDifficulty]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const toggleTopic = (tag) => setSelectedTopics(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  const toggleTechnique = (tag) => setSelectedTechniques(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  const clearFilters = () => { setSelectedTopics([]); setSelectedTechniques([]); setSelectedDifficulty(''); };

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
        <button className={`tab ${feedType === 'trending' ? 'active' : ''}`} onClick={() => setFeedType('trending')}>
          <Flame size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />Trending
        </button>
        <button className={`tab ${feedType === 'best' ? 'active' : ''}`} onClick={() => setFeedType('best')}>
          <Trophy size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />Hall of Fame
        </button>
      </div>

      {/* Search + Filter toggle row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input" type="text"
            placeholder="Search problems by title or platform..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button
          className={`btn btn-secondary`}
          onClick={() => setShowFilters(o => !o)}
          style={{ flexShrink: 0, position: 'relative', borderColor: activeFilterCount ? 'var(--accent-primary)' : undefined }}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              background: 'var(--accent-primary)', color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: '0.7rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{activeFilterCount}</span>
          )}
          <ChevronDown size={12} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Filter by Tags</span>
            {activeFilterCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          {/* Difficulty */}
          <div style={{ marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Difficulty</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DIFFICULTIES.map(d => (
                <TagPill key={d} label={d} active={selectedDifficulty === d} color={DIFF_COLORS[d]}
                  onClick={() => setSelectedDifficulty(p => p === d ? '' : d)} />
              ))}
            </div>
          </div>

          {/* Topic tags */}
          <div style={{ marginBottom: 12 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Topic</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TOPIC_TAGS.map(t => (
                <TagPill key={t} label={t} active={selectedTopics.includes(t)} onClick={() => toggleTopic(t)} />
              ))}
            </div>
          </div>

          {/* Technique tags */}
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Technique</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TECHNIQUE_TAGS.map(t => (
                <TagPill key={t} label={t} active={selectedTechniques.includes(t)} onClick={() => toggleTechnique(t)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No problems found</div>
          <p>{activeFilterCount > 0 ? 'Try removing some filters.' : 'Be the first to submit a problem!'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredQuestions.map((q, i) => (
            <QuestionCard
              key={q.id} question={q} isLoggedIn={isLoggedIn}
              currentUserId={currentUserId} onToast={onToast}
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedPage;
