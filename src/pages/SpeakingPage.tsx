import { useState } from 'react';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';
import AIPracticeTab from '../components/speaking/AIPracticeTab';
import SelfStudyTab from '../components/speaking/SelfStudyTab';

export default function SpeakingPage() {
  const [activeTab, setActiveTab] = useState<'self-study' | 'ai'>('self-study');

  return (
    <div className="screen">
      <TopBar />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Tab Navigation */}
        <div style={{ 
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', 
          padding: '6px', borderRadius: '100px', display: 'flex', gap: 6, marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.4)'
        }}>
          <button 
            onClick={() => setActiveTab('self-study')}
            style={{ 
              padding: '10px 24px', borderRadius: '100px', fontSize: 14, fontWeight: 700, 
              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
              background: activeTab === 'self-study' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'self-study' ? 'var(--accent-ink)' : 'var(--ink-2)',
              boxShadow: activeTab === 'self-study' ? 'var(--sh-sm)' : 'none'
            }}
          >
            Tự học
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            style={{ 
              padding: '10px 24px', borderRadius: '100px', fontSize: 14, fontWeight: 700, 
              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
              background: activeTab === 'ai' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'ai' ? 'var(--accent-ink)' : 'var(--ink-2)',
              boxShadow: activeTab === 'ai' ? 'var(--sh-sm)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Icon name="sparkle" size={16} /> Luyện nói với AI
          </button>
        </div>

        {/* Content Area */}
        <div style={{ width: 'min(1280px, 95vw)', height: 'min(78vh, 760px)', display: 'flex', minHeight: 0 }}>
          {activeTab === 'self-study' && <SelfStudyTab />}
          {activeTab === 'ai' && (
            <div style={{ width: 'min(1080px, 100%)', margin: '0 auto', height: '100%' }}>
              <AIPracticeTab />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
