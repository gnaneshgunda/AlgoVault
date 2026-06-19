import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ThumbsUp, Bookmark, ExternalLink, Eye, TrendingUp, Award, Tag, X, Check } from 'lucide-react';
import { createInteraction, deleteInteraction, registerQuestionView, updateQuestionTags } from '../api';
import AddToListModal from './AddToListModal';

const PLATFORM_CLASS = {
  'Codeforces': 'codeforces', 'LeetCode': 'leetcode',
  'AtCoder': 'atcoder', 'CSES': 'cses',
};

const DIFF_COLORS = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' };

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

const timeAgo = (dateStr) => {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const m = Math.floor(seconds / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const TagChip = ({ label, color }) => (
  <span style={{
    padding: '2px 8px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600,
    background: `${color || 'var(--accent-primary)'}18`,
    color: color || 'var(--accent-secondary)',
    border: `1px solid ${color || 'var(--accent-primary)'}30`,
  }}>{label}</span>
);

const TagPicker = ({ label, options, selected, onChange }) => (
  <div style={{ marginBottom: 12 }}>
    <div className="form-label" style={{ marginBottom: 6 }}>{label}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map(t => {
        const active = selected.includes(t);
        return (
          <button key={t} onClick={() => onChange(active ? selected.filter(x => x !== t) : [...selected, t])}
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

// Rendered via portal so it always sits above everything
const TagEditorModal = ({ editTopics, setEditTopics, editTechniques, setEditTechniques, editDifficulty, setEditDifficulty, onSave, onClose, saving }) =>
  ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Tags</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="form-label" style={{ marginBottom: 6 }}>Difficulty</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setEditDifficulty(p => p === d ? '' : d)}
                style={{
                  padding: '4px 14px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  border: `1px solid ${editDifficulty === d ? DIFF_COLORS[d] : 'var(--border-light)'}`,
                  background: editDifficulty === d ? `${DIFF_COLORS[d]}20` : 'transparent',
                  color: editDifficulty === d ? DIFF_COLORS[d] : 'var(--text-muted)',
                }}>{d}</button>
            ))}
          </div>
        </div>

        <TagPicker label="Topic" options={TOPIC_TAGS} selected={editTopics} onChange={setEditTopics} />
        <TagPicker label="Technique" options={TECHNIQUE_TAGS} selected={editTechniques} onChange={setEditTechniques} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            <Check size={14} /> {saving ? 'Saving...' : 'Save Tags'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}><X size={14} /> Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );

const QuestionCard = ({ question, isLoggedIn, currentUserId, onToast, style }) => {
  const [upvoted, setUpvoted] = useState(question.has_upvoted || false);
  const [saved, setSaved] = useState(question.has_saved || false);
  const [animateUpvote, setAnimateUpvote] = useState(false);
  const [animateSave, setAnimateSave] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editTopics, setEditTopics] = useState(question.topic_tags || []);
  const [editTechniques, setEditTechniques] = useState(question.technique_tags || []);
  const [editDifficulty, setEditDifficulty] = useState(question.difficulty || '');
  const [displayTopics, setDisplayTopics] = useState(question.topic_tags || []);
  const [displayTechniques, setDisplayTechniques] = useState(question.technique_tags || []);
  const [displayDifficulty, setDisplayDifficulty] = useState(question.difficulty || '');
  const [savingTags, setSavingTags] = useState(false);

  // Tags button visible only to the question submitter
  const isSubmitter = isLoggedIn && currentUserId && String(question.submitter_id) === String(currentUserId);

  const handleUpvote = async () => {
    if (!isLoggedIn) { onToast?.('Please login to upvote', 'error'); return; }
    if (upvoted) {
      try { await deleteInteraction(question.id, 'Upvote'); setUpvoted(false); onToast?.('Upvote removed', 'success'); }
      catch (e) { onToast?.(e.response?.data?.detail || 'Failed to remove upvote', 'error'); }
    } else {
      try {
        await createInteraction({ question_id: question.id, interaction_type: 'Upvote' });
        setUpvoted(true); setAnimateUpvote(true); setTimeout(() => setAnimateUpvote(false), 400);
        onToast?.('Upvoted!', 'success');
      } catch (e) {
        const msg = e.response?.data?.detail || 'Failed to upvote';
        if (msg === 'Interaction already exists') setUpvoted(true);
        onToast?.(msg, 'error');
      }
    }
  };

  const handleSave = async () => {
    if (!isLoggedIn) { onToast?.('Please login to save', 'error'); return; }
    if (saved) {
      try { await deleteInteraction(question.id, 'Save'); setSaved(false); onToast?.('Removed from saved', 'success'); }
      catch (e) { onToast?.(e.response?.data?.detail || 'Failed to unsave', 'error'); }
    } else {
      setShowListModal(true);
      try {
        await createInteraction({ question_id: question.id, interaction_type: 'Save' });
        setSaved(true); setAnimateSave(true); setTimeout(() => setAnimateSave(false), 400);
      } catch (e) { if (e.response?.data?.detail === 'Interaction already exists') setSaved(true); }
    }
  };

  const handleSaveTags = async () => {
    setSavingTags(true);
    try {
      await updateQuestionTags(question.id, {
        topic_tags: editTopics, technique_tags: editTechniques,
        difficulty: editDifficulty || null,
      });
      setDisplayTopics(editTopics);
      setDisplayTechniques(editTechniques);
      setDisplayDifficulty(editDifficulty);
      setShowTagEditor(false);
      onToast?.('Tags updated!', 'success');
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to update tags', 'error');
    } finally { setSavingTags(false); }
  };

  const platformClass = PLATFORM_CLASS[question.platform] || 'other';

  return (
    <div className="question-card" style={style}>
      <div className="question-card-header">
        <div style={{ flex: 1 }}>
          <div className="question-title">{question.title}</div>

          <div className="question-meta">
            <span className={`platform-badge ${platformClass}`}>{question.platform}</span>
            {displayDifficulty && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: DIFF_COLORS[displayDifficulty] }}>
                {displayDifficulty}
              </span>
            )}
            {question.submitter_username && <span className="meta-item">by {question.submitter_username}</span>}
            <span className="meta-item"><Eye size={12} /> {question.total_views}</span>
            <span className="meta-item"><TrendingUp size={12} /> {question.trending_score?.toFixed(2)}</span>
            <span className="meta-item"><Award size={12} /> {question.wilson_score?.toFixed(3)}</span>
            <span className="meta-item">{timeAgo(question.created_at)}</span>
          </div>

          {(displayTopics.length > 0 || displayTechniques.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {displayTopics.map(t => <TagChip key={t} label={t} color="var(--accent-primary)" />)}
              {displayTechniques.map(t => <TagChip key={t} label={t} color="var(--accent-secondary)" />)}
            </div>
          )}
        </div>

        <a href={question.original_url} target="_blank" rel="noopener noreferrer"
          className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}
          onClick={() => registerQuestionView(question.id).catch(() => {})}>
          <ExternalLink size={14} /> Solve
        </a>
      </div>

      <div className="question-actions">
        <button className={`action-btn ${upvoted ? 'active-upvote' : ''} ${animateUpvote ? 'pulse-once' : ''}`} onClick={handleUpvote}>
          <ThumbsUp size={14} /> {upvoted ? 'Upvoted' : 'Upvote'}
        </button>
        <button className={`action-btn ${saved ? 'active-save' : ''} ${animateSave ? 'pulse-once' : ''}`} onClick={handleSave}>
          <Bookmark size={14} /> {saved ? 'Saved' : 'Save'}
        </button>
        {isSubmitter && (
          <button className="action-btn" onClick={() => setShowTagEditor(true)}>
            <Tag size={14} /> Tags
          </button>
        )}
      </div>

      {showTagEditor && (
        <TagEditorModal
          editTopics={editTopics} setEditTopics={setEditTopics}
          editTechniques={editTechniques} setEditTechniques={setEditTechniques}
          editDifficulty={editDifficulty} setEditDifficulty={setEditDifficulty}
          onSave={handleSaveTags} onClose={() => setShowTagEditor(false)}
          saving={savingTags}
        />
      )}

      {showListModal && (
        <AddToListModal questionId={question.id} onClose={() => setShowListModal(false)} onToast={onToast} />
      )}
    </div>
  );
};

export default QuestionCard;
