import React, { useEffect, useState } from 'react';
import { getMyLists, createList, addQuestionToList, getListsContainingQuestion, removeQuestionFromList } from '../api';
import { Plus, X, List as ListIcon } from 'lucide-react';

const AddToListModal = ({ questionId, onClose, onToast }) => {
  const [lists, setLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create new list state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const [allLists, activeListIds] = await Promise.all([
        getMyLists(),
        getListsContainingQuestion(questionId)
      ]);
      setLists(allLists);
      setSelectedListIds(activeListIds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [questionId]);

  const handleToggleList = async (listId) => {
    const isSelected = selectedListIds.includes(listId);
    try {
      if (isSelected) {
        await removeQuestionFromList(listId, questionId);
        setSelectedListIds(selectedListIds.filter(id => id !== listId));
        onToast?.('Removed from list!', 'success');
      } else {
        await addQuestionToList(listId, { question_id: questionId });
        setSelectedListIds([...selectedListIds, listId]);
        onToast?.('Added to list!', 'success');
      }
    } catch (e) {
      onToast?.(e.response?.data?.detail || 'Failed to update list status', 'error');
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newList = await createList({ title: newTitle, description: newDesc, is_public: true });
      onToast?.('List created!', 'success');
      // Automatically add to the newly created list
      await addQuestionToList(newList.id, { question_id: questionId });
      // Refresh
      await fetchLists();
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err) {
      onToast?.(err.response?.data?.detail || 'Failed to create list', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Save to Lists</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : showCreate ? (
          <form onSubmit={handleCreateList} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <div className="form-group">
              <label className="form-label">Title</label>
              <input className="input" placeholder="e.g. Graph Algorithms" value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="input" placeholder="What's this list about?" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={isCreating} style={{ flex: 1 }}>
                {isCreating ? 'Creating...' : 'Create & Save'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lists.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                 You don't have any lists yet.
               </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lists.map(lst => {
                  const isSelected = selectedListIds.includes(lst.id);
                  return (
                    <button
                      key={lst.id}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ justifyContent: 'flex-start', padding: '12px 16px', border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent' }}
                      onClick={() => handleToggleList(lst.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        style={{ marginRight: 12, accentColor: 'var(--accent-primary)', pointerEvents: 'none' }}
                      />
                      <ListIcon size={16} />
                      <span style={{ marginLeft: 8, flex: 1, textAlign: 'left' }}>{lst.title}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={onClose} style={{ flex: 1 }}>
                Done
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
                <Plus size={16} style={{ marginRight: 4 }} /> New List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToListModal;
