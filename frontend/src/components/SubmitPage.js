import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuestion, parseQuestionTitle } from '../api';
import { Send, LinkIcon, Type, Globe, Tag } from 'lucide-react';
import AddToListModal from './AddToListModal';

const PLATFORMS = [
  'Auto-Detect', 'Codeforces', 'LeetCode', 'AtCoder', 'CSES',
  'HackerRank', 'GeeksForGeeks', 'SPOJ', 'CodeChef', 'HackerEarth', 'Other'
];

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

const TagPicker = ({ label, options, selected, onChange }) => (
  <div>
    <div className="form-label" style={{ marginBottom: 6 }}>{label}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(t => {
        const active = selected.includes(t);
        return (
          <button type="button" key={t} onClick={() => onChange(active ? selected.filter(x => x !== t) : [...selected, t])}
            style={{
              padding: '3px 9px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-light)'}`,
              background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: active ? 'var(--accent-secondary)' : 'var(--text-muted)',
            }}>{t}</button>
        );
      })}
    </div>
  </div>
);

const SubmitPage = ({ onToast }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Auto-Detect');
  const [loading, setLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState('');
  const [topicTags, setTopicTags] = useState([]);
  const [techniqueTags, setTechniqueTags] = useState([]);
  const [difficulty, setDifficulty] = useState('');

  // Post-submit list selection
  const [showListModal, setShowListModal] = useState(false);
  const [submittedQuestionId, setSubmittedQuestionId] = useState(null);

  const navigate = useNavigate();

  // Auto-detect platform from URL as user types
  const handleUrlChange = (value) => {
    setUrl(value);
    try {
      const urlObj = new URL(value);
      const domain = urlObj.hostname.replace('www.', '').toLowerCase();
      if (domain.includes('codeforces.com')) setDetectedPlatform('Codeforces');
      else if (domain.includes('leetcode.com')) setDetectedPlatform('LeetCode');
      else if (domain.includes('atcoder.jp')) setDetectedPlatform('AtCoder');
      else if (domain.includes('cses.fi')) setDetectedPlatform('CSES');
      else if (domain.includes('hackerrank.com')) setDetectedPlatform('HackerRank');
      else if (domain.includes('geeksforgeeks.org')) setDetectedPlatform('GeeksForGeeks');
      else if (domain.includes('spoj.com')) setDetectedPlatform('SPOJ');
      else if (domain.includes('codechef.com')) setDetectedPlatform('CodeChef');
      else if (domain.includes('hackerearth.com')) setDetectedPlatform('HackerEarth');
      else setDetectedPlatform('Other');
    } catch {
      setDetectedPlatform('');
    }
  };

  const fetchTitle = async (targetUrl) => {
    if (!targetUrl) return;
    try {
      new URL(targetUrl);
      setLoadingTitle(true);
      const data = await parseQuestionTitle(targetUrl);
      if (data.title) {
        setTitle(data.title);
      }
      if (data.platform) {
        setPlatform(data.platform);
      }
    } catch (err) {
      // Ignore
    } finally {
      setLoadingTitle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        original_url: url,
        title,
        topic_tags: topicTags.length ? topicTags : undefined,
        technique_tags: techniqueTags.length ? techniqueTags : undefined,
        difficulty: difficulty || undefined,
      };
      if (platform !== 'Auto-Detect') data.platform = platform;
      const newQuestion = await createQuestion(data);
      onToast?.('Problem submitted successfully!', 'success');

      // Prompt user to add the newly submitted question to a list
      setSubmittedQuestionId(newQuestion.id);
      setShowListModal(true);

      setUrl('');
      setTitle('');
      setPlatform('Auto-Detect');
      setDetectedPlatform('');
      setTopicTags([]);
      setTechniqueTags([]);
      setDifficulty('');
    } catch (err) {
      onToast?.(err.response?.data?.detail || 'Failed to submit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleListModalClose = () => {
     setShowListModal(false);
     setSubmittedQuestionId(null);
     navigate('/');
  };

  return (
    <div className="page-container" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Submit a Problem</h1>
        <p className="page-subtitle">
          Share a great DSA problem with the community
        </p>
      </div>

      <div className="card-glass">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="form-group">
            <label className="form-label">
              <LinkIcon size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Problem URL
            </label>
            <input
              className="input"
              type="url"
              placeholder="https://leetcode.com/problems/two-sum/"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={(e) => fetchTitle(e.target.value)}
              required
            />
            {detectedPlatform && platform === 'Auto-Detect' && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: 4 }}>
                ✓ Detected: {detectedPlatform}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Type size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Problem Title {loadingTitle && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>(fetching...)</span>}
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Two Sum"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loadingTitle}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Globe size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Platform
            </label>
            <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Optional tags section */}
          <div className="form-group">
            <label className="form-label">
              <Tag size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Difficulty <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DIFFICULTIES.map(d => (
                <button type="button" key={d} onClick={() => setDifficulty(p => p === d ? '' : d)}
                  style={{
                    padding: '6px 16px', borderRadius: 100, fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    border: `1px solid ${difficulty === d ? DIFF_COLORS[d] : 'var(--border-light)'}`,
                    background: difficulty === d ? `${DIFF_COLORS[d]}20` : 'transparent',
                    color: difficulty === d ? DIFF_COLORS[d] : 'var(--text-muted)',
                  }}>{d}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <TagPicker
              label={<><Tag size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />Topic Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></>}
              options={TOPIC_TAGS} selected={topicTags} onChange={setTopicTags}
            />
          </div>

          <div className="form-group">
            <TagPicker
              label={<><Tag size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />Technique Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></>}
              options={TECHNIQUE_TAGS} selected={techniqueTags} onChange={setTechniqueTags}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ padding: '14px', fontSize: '0.95rem' }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><Send size={16} /> Submit Problem</>}
          </button>
        </form>
      </div>

      {showListModal && submittedQuestionId && (
        <AddToListModal
          questionId={submittedQuestionId}
          onClose={handleListModalClose}
          onToast={onToast}
        />
      )}
    </div>
  );
};

export default SubmitPage;
