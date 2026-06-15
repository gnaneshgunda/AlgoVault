import React, { useEffect, useState } from 'react';
import { getMe, updateMyStats } from '../api';
import RankBadge from './RankBadge';
import { TIER_COLORS } from './RankBadge';
import { Code, Award, Edit3, Check, X } from 'lucide-react';

const ProfilePage = ({ onToast }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    codeforces_rating: 0,
    leetcode_solved: 0,
    atcoder_rating: 0,
    cses_solved: 0,
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getMe();
      setProfile(data);
      setStats({
        codeforces_rating: data.codeforces_rating,
        leetcode_solved: data.leetcode_solved,
        atcoder_rating: data.atcoder_rating,
        cses_solved: data.cses_solved,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveStats = async () => {
    try {
      await updateMyStats(stats);
      onToast?.('Stats updated! Rank recalculating...', 'success');
      setEditing(false);
      // Wait for background task to recalculate
      setTimeout(fetchProfile, 1000);
    } catch (e) {
      onToast?.('Failed to update stats', 'error');
    }
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!profile) return null;

  const tierColor = TIER_COLORS[profile.rank_tier] || '#808080';

  return (
    <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Hero Card */}
      <div className="profile-hero">
        <div className="profile-avatar" style={{
          background: `linear-gradient(135deg, ${tierColor}, ${tierColor}88)`,
        }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div className="profile-username">{profile.username}</div>
        <div style={{ marginTop: 8 }}>
          <RankBadge tier={profile.rank_tier} large />
        </div>

        {/* Rating */}
        <div style={{
          marginTop: 16, fontFamily: "'JetBrains Mono', monospace",
          fontSize: '2.5rem', fontWeight: 800, color: tierColor,
        }}>
          {profile.total_rating}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Total Rating
        </div>

        {/* Solving / Curation bars */}
        <div style={{ maxWidth: 400, margin: '24px auto 0' }}>
          <div className="score-bar-container">
            <div className="score-bar-header">
              <span className="score-bar-label">Solving Score</span>
              <span className="score-bar-value">{profile.solving_score} / 1500</span>
            </div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{
                width: `${(profile.solving_score / 1500) * 100}%`,
                background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
              }} />
            </div>
          </div>
          <div className="score-bar-container">
            <div className="score-bar-header">
              <span className="score-bar-label">Curation Score</span>
              <span className="score-bar-value">{profile.curation_score} / 1500</span>
            </div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{
                width: `${(profile.curation_score / 1500) * 100}%`,
                background: 'linear-gradient(90deg, #ec4899, #f59e0b)',
              }} />
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-value">{profile.questions_submitted}</div>
            <div className="stat-label">Problems Submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.lists_created}</div>
            <div className="stat-label">Lists Created</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.total_saves_received}</div>
            <div className="stat-label">Saves Received</div>
          </div>
        </div>
      </div>

      {/* External Stats */}
      <div className="card-glass" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
            <Code size={16} style={{ display: 'inline', verticalAlign: -2, marginRight: 8 }} />
            Competitive Stats
          </h2>
          {!editing ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Edit3 size={14} /> Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveStats}>
                <Check size={14} /> Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid-2">
          {[
            { key: 'codeforces_rating', label: 'Codeforces Rating', max: 3500, color: '#3b82f6' },
            { key: 'leetcode_solved', label: 'LeetCode Solved', max: 3000, color: '#f97316' },
            { key: 'atcoder_rating', label: 'AtCoder Rating', max: 3000, color: '#22c55e' },
            { key: 'cses_solved', label: 'CSES Solved', max: 300, color: '#a855f7' },
          ].map(({ key, label, max, color }) => (
            <div key={key} className="stat-card">
              {editing ? (
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={stats[key]}
                  onChange={(e) => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })}
                  style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }}
                />
              ) : (
                <div className="stat-value" style={{ color }}>{profile[key]}</div>
              )}
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rank Tiers Legend */}
      <div className="card-glass" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 16 }}>
          <Award size={16} style={{ display: 'inline', verticalAlign: -2, marginRight: 8 }} />
          Rank Tiers
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { tier: 'Scripter', range: '0–1199' },
            { tier: 'Explorer', range: '1200–1399' },
            { tier: 'Curator', range: '1400–1599' },
            { tier: 'Architect', range: '1600–1899' },
            { tier: 'Algorithmist', range: '1900–2199' },
            { tier: 'Master', range: '2200–2599' },
            { tier: 'Grandmaster', range: '2600+' },
          ].map(({ tier, range }) => (
            <div key={tier} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 8,
              background: profile.rank_tier === tier ? `${TIER_COLORS[tier]}15` : 'transparent',
              border: profile.rank_tier === tier ? `1px solid ${TIER_COLORS[tier]}30` : '1px solid transparent',
            }}>
              <RankBadge tier={tier} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                {range}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
