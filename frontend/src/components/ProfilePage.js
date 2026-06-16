import React, { useEffect, useState } from 'react';
import { getMe, updateMyStats } from '../api';
import RankBadge from './RankBadge';
import { TIER_COLORS } from './RankBadge';
import { Code, Award, Edit3, Check, X } from 'lucide-react';

// Fetch stats browser-side to avoid cloud IP blocks on external APIs
async function fetchCodeforcesRating(handle) {
  if (!handle) return 0;
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle.replace('@', '')}`);
    const data = await res.json();
    if (data.status === 'OK') return data.result[0]?.rating || 0;
  } catch {}
  return 0;
}

async function fetchLeetcodeSolved(handle) {
  if (!handle) return 0;
  try {
    const query = `query{matchedUser(username:"${handle.replace('@', '')}"){submitStats{acSubmissionNum{difficulty count}}}}`;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    const stats = data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    return stats.find(s => s.difficulty === 'All')?.count || 0;
  } catch {}
  return 0;
}

async function fetchAtcoderRating(handle) {
  if (!handle) return 0;
  try {
    // Use atcoder-api proxy since atcoder.jp blocks CORS
    const res = await fetch(`https://atcoder-api.appspot.com/users/${handle.replace('@', '')}`);
    if (res.ok) {
      const data = await res.json();
      return data.rating || 0;
    }
  } catch {}
  return 0;
}

async function fetchCsesSolved(handle) {
  if (!handle) return 0;
  try {
    // CSES blocks CORS — use backend as proxy
    const base = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${base}/users/cses-proxy?user_id=${handle.replace('@', '')}`);
    if (res.ok) {
      const data = await res.json();
      return data.solved || 0;
    }
  } catch {}
  return 0;
}

const ProfilePage = ({ onToast }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    cf_handle: '',
    lc_handle: '',
    ac_handle: '',
    cses_handle: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getMe();
      setProfile(data);
      setStats({
        cf_handle: data.cf_handle || '',
        lc_handle: data.lc_handle || '',
        ac_handle: data.ac_handle || '',
        cses_handle: data.cses_handle || '',
      });
      return data;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const silentSyncStats = async (data) => {
    if (!data.cf_handle && !data.lc_handle && !data.ac_handle && !data.cses_handle) return;
    try {
      const [cf, lc, ac, cses] = await Promise.all([
        fetchCodeforcesRating(data.cf_handle),
        fetchLeetcodeSolved(data.lc_handle),
        fetchAtcoderRating(data.ac_handle),
        fetchCsesSolved(data.cses_handle),
      ]);
      const updated = await updateMyStats({
        cf_handle: data.cf_handle,
        lc_handle: data.lc_handle,
        ac_handle: data.ac_handle,
        cses_handle: data.cses_handle,
        codeforces_rating: cf,
        leetcode_solved: lc,
        atcoder_rating: ac,
        cses_solved: cses,
      });
      // Update profile stats in-place without a full reload
      setProfile(prev => ({
        ...prev,
        codeforces_rating: updated.codeforces_rating,
        leetcode_solved: updated.leetcode_solved,
        atcoder_rating: updated.atcoder_rating,
        cses_solved: updated.cses_solved,
        solving_score: updated.solving_score,
        total_rating: updated.total_rating,
        rank_tier: updated.rank_tier,
        tier_color: updated.tier_color,
      }));
    } catch (e) {
      console.error('Silent sync failed', e);
    }
  };

  useEffect(() => {
    fetchProfile().then(data => { if (data) silentSyncStats(data); });
  }, []);

  const handleSaveStats = async () => {
    try {
      onToast?.('Fetching stats...', 'info');
      const [cf, lc, ac, cses] = await Promise.all([
        fetchCodeforcesRating(stats.cf_handle),
        fetchLeetcodeSolved(stats.lc_handle),
        fetchAtcoderRating(stats.ac_handle),
        fetchCsesSolved(stats.cses_handle),
      ]);
      await updateMyStats({
        ...stats,
        codeforces_rating: cf,
        leetcode_solved: lc,
        atcoder_rating: ac,
        cses_solved: cses,
      });
      onToast?.('Stats updated! Rank recalculating...', 'success');
      setEditing(false);
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
            { key: 'codeforces_rating', handleKey: 'cf_handle', label: 'Codeforces', color: '#3b82f6', handlePlaceholder: 'Codeforces Handle', unit: 'Rating' },
            { key: 'leetcode_solved', handleKey: 'lc_handle', label: 'LeetCode', color: '#f97316', handlePlaceholder: 'LeetCode Username', unit: 'Solved' },
            { key: 'atcoder_rating', handleKey: 'ac_handle', label: 'AtCoder', color: '#22c55e', handlePlaceholder: 'AtCoder Handle', unit: 'Rating' },
            { key: 'cses_solved', handleKey: 'cses_handle', label: 'CSES', color: '#a855f7', handlePlaceholder: 'CSES User ID (Numeric)', unit: 'Submissions' },
          ].map(({ key, handleKey, label, color, handlePlaceholder, unit }) => (
            <div key={key} className="stat-card">
              {editing ? (
                <input
                  className="input"
                  type="text"
                  placeholder={handlePlaceholder}
                  value={stats[handleKey]}
                  onChange={(e) => setStats({ ...stats, [handleKey]: e.target.value })}
                  style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}
                />
              ) : (
                <>
                  <div className="stat-value" style={{ color }}>
                    {profile[key]}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 500 }}>
                      {unit}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {profile[handleKey] ? `@${profile[handleKey]}` : 'No Handle Set'}
                  </div>
                </>
              )}
              <div className="stat-label" style={{ marginTop: 8 }}>{label}</div>
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
