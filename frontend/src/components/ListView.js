import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getListDetail, removeQuestionFromList, forkList } from '../api';
import { ArrowLeft, GitFork, Globe, Lock, Trash2, ExternalLink } from 'lucide-react';

const PLATFORM_CLASS = {
  'Codeforces': 'codeforces',
  'LeetCode': 'leetcode',
  'AtCoder': 'atcoder',
  'CSES': 'cses',
};

const ListView = ({ currentUserId, onToast }) => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [listData, setListData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getListDetail(listId);
      setListData(data);
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to load list', 'error');
      navigate('/lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [listId]);

  const handleRemove = async (questionId) => {
    try {
      await removeQuestionFromList(listId, questionId);
      onToast?.('Question removed', 'success');
      fetchList();
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to remove', 'error');
    }
  };

  const handleFork = async () => {
    try {
      const forked = await forkList(listId);
      onToast?.('List forked! Check your lists.', 'success');
      navigate(`/lists/${forked.id}`);
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to fork', 'error');
    }
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!listData) return null;

  const isOwner = currentUserId === listData.user_id;

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/lists')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Lists
      </button>

      <div className="card-glass" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {listData.is_public ? <Globe size={16} color="var(--accent-secondary)" /> : <Lock size={16} color="var(--text-muted)" />}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {listData.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>
              {listData.title}
            </h1>
            {listData.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{listData.description}</p>
            )}
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              by <span style={{ color: 'var(--accent-secondary)' }}>@{listData.owner_username}</span> · {listData.question_count} problems
            </div>
          </div>
          {!isOwner && (
            <button className="btn btn-secondary" onClick={handleFork}>
              <GitFork size={14} /> Fork
            </button>
          )}
        </div>
      </div>

      {listData.questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No problems in this list yet</div>
          <p>Save problems from the feed to add them here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listData.questions.map((q, i) => (
            <div key={q.id} className="question-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div className="question-title">{q.title}</div>
                  <div className="question-meta" style={{ marginTop: 6 }}>
                    <span className={`platform-badge ${PLATFORM_CLASS[q.platform] || 'other'}`}>
                      {q.platform}
                    </span>
                    <span className="meta-item" style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: q.status === 'Solved' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: q.status === 'Solved' ? '#34d399' : 'var(--text-muted)',
                      fontSize: '0.75rem', fontWeight: 600
                    }}>
                      {q.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={q.original_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    <ExternalLink size={14} />
                  </a>
                  {isOwner && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(q.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListView;
