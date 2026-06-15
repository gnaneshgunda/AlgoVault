import React, { useState } from 'react';
import { ThumbsUp, Bookmark, ExternalLink, Eye, TrendingUp, Award } from 'lucide-react';
import { createInteraction, registerQuestionView } from '../api';
import AddToListModal from './AddToListModal';

const PLATFORM_CLASS = {
  'Codeforces': 'codeforces',
  'LeetCode': 'leetcode',
  'AtCoder': 'atcoder',
  'CSES': 'cses',
};

const QuestionCard = ({ question, isLoggedIn, onToast, style }) => {
  const [upvoted, setUpvoted] = useState(question.has_upvoted || false);
  const [saved, setSaved] = useState(question.has_saved || false);
  const [animateUpvote, setAnimateUpvote] = useState(false);
  const [animateSave, setAnimateSave] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  const handleUpvote = async () => {
    if (upvoted || !isLoggedIn) {
      if (!isLoggedIn) onToast?.('Please login to upvote', 'error');
      return;
    }
    try {
      await createInteraction({
        question_id: question.id,
        interaction_type: 'Upvote'
      });
      setUpvoted(true);
      setAnimateUpvote(true);
      setTimeout(() => setAnimateUpvote(false), 400);
      onToast?.('Upvoted!', 'success');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Failed to upvote';
      if (msg === 'Interaction already exists') {
        setUpvoted(true);
      }
      onToast?.(msg, 'error');
    }
  };

  const handleSave = async () => {
    if (!isLoggedIn) {
      onToast?.('Please login to save', 'error');
      return;
    }

    // Always show modal to pick a list, even if they already saved it
    setShowListModal(true);

    // If not already saved, register the Save interaction too
    if (!saved) {
      try {
        await createInteraction({
          question_id: question.id,
          interaction_type: 'Save'
        });
        setSaved(true);
        setAnimateSave(true);
        setTimeout(() => setAnimateSave(false), 400);
      } catch (e) {
        // Ignore interaction already exists error silently here since primary action is adding to list
        if (e.response?.data?.detail === 'Interaction already exists') {
           setSaved(true);
        }
      }
    }
  };

  const platformClass = PLATFORM_CLASS[question.platform] || 'other';

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="question-card" style={style}>
      <div className="question-card-header">
        <div style={{ flex: 1 }}>
          <div className="question-title">{question.title}</div>
          <div className="question-meta">
            <span className={`platform-badge ${platformClass}`}>
              {question.platform}
            </span>
            {question.submitter_username && (
              <span className="meta-item">
                by {question.submitter_username}
              </span>
            )}
            <span className="meta-item">
              <Eye size={12} /> {question.total_views}
            </span>
            <span className="meta-item">
              <TrendingUp size={12} /> {question.trending_score?.toFixed(2)}
            </span>
            <span className="meta-item">
              <Award size={12} /> {question.wilson_score?.toFixed(3)}
            </span>
            <span className="meta-item">
              {timeAgo(question.created_at)}
            </span>
          </div>
        </div>
        <a
          href={question.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ flexShrink: 0 }}
          onClick={(e) => {
            // Register view in background, don't await so it doesn't block the link
            registerQuestionView(question.id).catch(err => console.error("Failed to register view", err));
          }}
        >
          <ExternalLink size={14} /> Solve
        </a>
      </div>

      <div className="question-actions">
        <button
          className={`action-btn ${upvoted ? 'active-upvote' : ''} ${animateUpvote ? 'pulse-once' : ''}`}
          onClick={handleUpvote}
        >
          <ThumbsUp size={14} /> {upvoted ? 'Upvoted' : 'Upvote'}
        </button>
        <button
          className={`action-btn ${saved ? 'active-save' : ''} ${animateSave ? 'pulse-once' : ''}`}
          onClick={handleSave}
        >
          <Bookmark size={14} /> {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {showListModal && (
        <AddToListModal
          questionId={question.id}
          onClose={() => setShowListModal(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
};

export default QuestionCard;
