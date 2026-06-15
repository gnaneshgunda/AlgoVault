import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLists, getPublicLists, createList } from '../api';
import { FolderOpen, Plus, Globe, Lock, GitFork, X } from 'lucide-react';

const ListsPage = ({ onToast }) => {
  const [tab, setTab] = useState('my');
  const [myLists, setMyLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      try {
        if (tab === 'my') {
          const data = await getMyLists();
          setMyLists(data);
        } else {
          const data = await getPublicLists();
          setPublicLists(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [tab]);

  const fetchListsRef = async () => {
      setLoading(true);
      try {
        if (tab === 'my') {
          const data = await getMyLists();
          setMyLists(data);
        } else {
          const data = await getPublicLists();
          setPublicLists(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createList({ title: newTitle, description: newDesc, is_public: newPublic });
      onToast?.('List created!', 'success');
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchListsRef();
    } catch (err) {
      onToast?.(err.response?.data?.detail || 'Failed to create list', 'error');
    }
  };

  const lists = tab === 'my' ? myLists : publicLists;

  return (
    <div className="page-container">
      <div className="page-header lists-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📂 Problem Lists</h1>
          <p className="page-subtitle">Organize and curate your favorite problems</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New List
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
          <FolderOpen size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
          My Lists
        </button>
        <button className={`tab ${tab === 'public' ? 'active' : ''}`} onClick={() => setTab('public')}>
          <Globe size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
          Public Lists
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">
            {tab === 'my' ? 'No lists yet' : 'No public lists yet'}
          </div>
          <p>{tab === 'my' ? 'Create your first list to start curating problems!' : 'Be the first to share a public list!'}</p>
          {tab === 'my' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create List
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {lists.map((lst, i) => (
            <div
              key={lst.id}
              className="list-card"
              onClick={() => navigate(`/lists/${lst.id}`)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {lst.is_public ? <Globe size={14} color="var(--accent-secondary)" /> : <Lock size={14} color="var(--text-muted)" />}
                {lst.forked_from_list_id && <GitFork size={14} color="var(--accent-pink)" />}
              </div>
              <div className="list-card-title">{lst.title}</div>
              {lst.description && <div className="list-card-desc">{lst.description}</div>}
              <div className="list-card-footer">
                <span className="list-card-count">{lst.question_count} problems</span>
                {lst.owner_username && <span className="list-card-owner">@{lst.owner_username}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create List Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Create New List</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="input" placeholder="e.g. Hard DP Questions" value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="input" placeholder="What's this list about?" value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isPublic" checked={newPublic}
                  onChange={(e) => setNewPublic(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                <label htmlFor="isPublic" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Make this list public
                </label>
              </div>
              <button className="btn btn-primary" type="submit" style={{ padding: '12px' }}>
                <Plus size={16} /> Create List
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsPage;
