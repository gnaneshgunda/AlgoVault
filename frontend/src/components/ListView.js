import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { getListDetail, removeQuestionFromList, forkList, registerQuestionView, updateList, updateQuestionStatus } from '../api';
import { ArrowLeft, GitFork, Globe, Lock, Trash2, ExternalLink, Edit3, X, Check, CheckSquare, Square, AlertTriangle } from 'lucide-react';

const PLATFORM_CLASS = {
  'Codeforces': 'codeforces', 'LeetCode': 'leetcode',
  'AtCoder': 'atcoder', 'CSES': 'cses',
};

const ConfirmDialog = ({ question, onConfirm, onCancel }) =>
  ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h2 className="modal-title" style={{ margin: 0 }}>Remove Problem</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          Remove <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>"{question.title}"</span> from this list?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

const ListView = ({ currentUserId, onToast }) => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [listData, setListData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(false);
  const [confirmQuestion, setConfirmQuestion] = useState(null); // { id, title }
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Solved' | 'To Do'

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

  useEffect(() => { fetchList(); }, [listId]); // eslint-disable-line

  const handleEditSave = async () => {
    try {
      await updateList(listId, { title: editTitle, description: editDesc, is_public: editPublic });
      onToast?.('List updated!', 'success');
      setEditing(false);
      fetchList();
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to update list', 'error');
    }
  };

  const handleToggleStatus = async (questionId, currentStatus) => {
    setListData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, status: currentStatus === 'Solved' ? 'To Do' : 'Solved' } : q
      )
    }));
    try {
      await updateQuestionStatus(listId, questionId);
    } catch (e) {
      setListData(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === questionId ? { ...q, status: currentStatus } : q)
      }));
      onToast?.('Failed to update status', 'error');
    }
  };

  const handleRemoveConfirmed = async () => {
    const { id } = confirmQuestion;
    setConfirmQuestion(null);
    // Optimistic remove
    setListData(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
    try {
      await removeQuestionFromList(listId, id);
      onToast?.('Question removed', 'success');
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to remove', 'error');
      fetchList(); // revert by refetching
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

  const isOwner = String(currentUserId) === String(listData.user_id);

  const allQuestions = listData.questions;
  const filteredQuestions = statusFilter === 'All'
    ? allQuestions
    : allQuestions.filter(q => q.status === statusFilter);

  const solvedCount = allQuestions.filter(q => q.status === 'Solved').length;
  const todoCount = allQuestions.length - solvedCount;

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/lists')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Lists
      </button>

      {/* List header */}
      <div className="card-glass" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, paddingRight: 16 }}>
              <input className="input" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="List Title" style={{ fontSize: '1.2rem', fontWeight: 'bold' }} />
              <input className="input" type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="editPublic" checked={editPublic} onChange={e => setEditPublic(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                <label htmlFor="editPublic" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Make this list public</label>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {listData.is_public ? <Globe size={16} color="var(--accent-secondary)" /> : <Lock size={16} color="var(--text-muted)" />}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{listData.is_public ? 'Public' : 'Private'}</span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>{listData.title}</h1>
              {listData.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{listData.description}</p>}
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                by <span style={{ color: 'var(--accent-secondary)' }}>@{listData.owner_username}</span> · {allQuestions.length} problems
                {allQuestions.length > 0 && (
                  <span style={{ marginLeft: 8, color: '#10b981' }}>{solvedCount} solved</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {isOwner ? (
              editing ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={handleEditSave}><Check size={14} /> Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
                </>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditTitle(listData.title); setEditDesc(listData.description || ''); setEditPublic(listData.is_public); setEditing(true); }}>
                  <Edit3 size={14} /> Edit
                </button>
              )
            ) : (
              <button className="btn btn-secondary" onClick={handleFork}><GitFork size={14} /> Fork</button>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      {allQuestions.length > 0 && (
        <div className="tabs" style={{ marginBottom: 16 }}>
          {[
            { label: `All (${allQuestions.length})`, value: 'All' },
            { label: `To Do (${todoCount})`, value: 'To Do' },
            { label: `Solved (${solvedCount})`, value: 'Solved' },
          ].map(({ label, value }) => (
            <button key={value} className={`tab ${statusFilter === value ? 'active' : ''}`} onClick={() => setStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {filteredQuestions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{statusFilter === 'Solved' ? '🏆' : '📋'}</div>
          <div className="empty-state-title">
            {allQuestions.length === 0 ? 'No problems in this list yet' : `No ${statusFilter === 'To Do' ? 'unsolved' : 'solved'} problems`}
          </div>
          <p>{allQuestions.length === 0 ? 'Save problems from the feed to add them here' : `Switch to "All" to see everything`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredQuestions.map((q, i) => (
            <div key={q.id} className="question-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {isOwner && (
                    <button
                      onClick={() => handleToggleStatus(q.id, q.status)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', flexShrink: 0, color: q.status === 'Solved' ? '#10b981' : 'var(--text-muted)' }}
                      title={q.status === 'Solved' ? 'Mark as To Do' : 'Mark as Solved'}
                    >
                      {q.status === 'Solved' ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  )}
                  <div>
                    <div className="question-title" style={{ textDecoration: q.status === 'Solved' ? 'line-through' : 'none', color: q.status === 'Solved' ? 'var(--text-muted)' : undefined }}>
                      {q.title}
                    </div>
                    <div className="question-meta" style={{ marginTop: 6 }}>
                      <span className={`platform-badge ${PLATFORM_CLASS[q.platform] || 'other'}`}>{q.platform}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: q.status === 'Solved' ? '#10b981' : 'var(--text-muted)' }}>
                        {q.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={q.original_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    onClick={() => registerQuestionView(q.id).catch(() => {})}>
                    <ExternalLink size={14} />
                  </a>
                  {isOwner && (
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmQuestion(q)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmQuestion && (
        <ConfirmDialog
          question={confirmQuestion}
          onConfirm={handleRemoveConfirmed}
          onCancel={() => setConfirmQuestion(null)}
        />
      )}
    </div>
  );
};

export default ListView;
