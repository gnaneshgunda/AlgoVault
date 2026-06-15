import React, { useState } from 'react';
import FeedContainer from './components/FeedContainer';
import { createQuestion } from './api';

function App() {
  const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [platformInput, setPlatformInput] = useState('Codeforces');

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await createQuestion({
        original_url: urlInput,
        title: titleInput,
        platform: platformInput
      });
      alert('Question added successfully!');
      setUrlInput('');
      setTitleInput('');
    } catch (e) {
      console.error(e);
      alert('Failed to add question');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <header style={{ background: '#282c34', padding: '20px', color: 'white', textAlign: 'center' }}>
        <h1>CP Curation Platform</h1>
      </header>
      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <section style={{ marginBottom: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h2>Submit a New Problem</h2>
          <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="url" placeholder="Problem URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} required />
            <input type="text" placeholder="Problem Title" value={titleInput} onChange={e => setTitleInput(e.target.value)} required />
            <select value={platformInput} onChange={e => setPlatformInput(e.target.value)}>
              <option value="Codeforces">Codeforces</option>
              <option value="LeetCode">LeetCode</option>
              <option value="CSES">CSES</option>
            </select>
            <button type="submit">Submit Problem</button>
          </form>
        </section>
        <section>
          <h2>Global Feed</h2>
          <FeedContainer userId={DEMO_USER_ID} />
        </section>
      </main>
    </div>
  );
}
export default App;
