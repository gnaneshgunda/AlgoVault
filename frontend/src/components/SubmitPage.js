import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuestion } from '../api';
import { Send, LinkIcon, Type, Globe } from 'lucide-react';

const PLATFORMS = [
  'Auto-Detect', 'Codeforces', 'LeetCode', 'AtCoder', 'CSES',
  'HackerRank', 'GeeksForGeeks', 'SPOJ', 'CodeChef', 'HackerEarth', 'Other'
];

const SubmitPage = ({ onToast }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('Auto-Detect');
  const [loading, setLoading] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        original_url: url,
        title,
      };
      if (platform !== 'Auto-Detect') {
        data.platform = platform;
      }
      await createQuestion(data);
      onToast?.('Problem submitted successfully!', 'success');
      setUrl('');
      setTitle('');
      setPlatform('Auto-Detect');
      setDetectedPlatform('');
      navigate('/');
    } catch (err) {
      onToast?.(err.response?.data?.detail || 'Failed to submit', 'error');
    } finally {
      setLoading(false);
    }
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
              Problem Title
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Two Sum"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Globe size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Platform
            </label>
            <select
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ padding: '14px', fontSize: '0.95rem' }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><Send size={16} /> Submit Problem</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitPage;
