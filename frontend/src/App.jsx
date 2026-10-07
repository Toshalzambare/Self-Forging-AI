import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { APP_NAME, DEFAULT_MODEL } from './config.js';
import Toast from './components/Toast.jsx';
import Header from './components/Header.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import EcosystemToolsPage from './pages/EcosystemToolsPage.jsx';
import ActivityLogsPage from './pages/ActivityLogsPage.jsx';
import ApiSettingsPage from './pages/ApiSettingsPage.jsx';
import CodeModal from './components/CodeModal.jsx';
import ModelModal from './components/ModelModal.jsx';
import ActivityDrawer from './components/ActivityDrawer.jsx';

const SESSION_KEY = 'sfa_user';

const App = () => {
  // Auth state — persisted to sessionStorage so refreshes don't log you out
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [codeModalData, setCodeModalData] = useState({ isOpen: false, toolName: '' });
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [toast, setToast] = useState({ visible: false, title: '', message: '' });

  const showToast = (title, message) => {
    setToast({ visible: true, title, message });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const handleInspectCode = (toolName) => {
    setCodeModalData({ isOpen: true, toolName });
  };

  // Set document title from env
  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // Not logged in → show login page for all routes
  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toast toast={toast} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header
        selectedModel={selectedModel}
        onOpenModelModal={() => setModelModalOpen(true)}
        onToggleLogsDrawer={() => setLogsDrawerOpen(!logsDrawerOpen)}
        user={user}
        onLogout={handleLogout}
      />

      <Routes>
        <Route
          path="/"
          element={
            <ConversationPage
              selectedModel={selectedModel}
              onOpenModelModal={() => setModelModalOpen(true)}
              onToggleLogsDrawer={() => setLogsDrawerOpen(!logsDrawerOpen)}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/ecosystem-tools"
          element={<EcosystemToolsPage user={user} onInspectCode={handleInspectCode} showToast={showToast} />}
        />
        <Route
          path="/api-settings"
          element={<ApiSettingsPage user={user} showToast={showToast} />}
        />
        <Route
          path="/activity-logs"
          element={<ActivityLogsPage user={user} showToast={showToast} />}
        />
        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ActivityDrawer
        isOpen={logsDrawerOpen}
        onClose={() => setLogsDrawerOpen(false)}
        showToast={showToast}
      />

      <ModelModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={(model) => {
          setSelectedModel(model);
          showToast('Model Updated', `Switched to ${model}`);
        }}
      />

      <CodeModal
        isOpen={codeModalData.isOpen}
        toolName={codeModalData.toolName}
        onClose={() => setCodeModalData(prev => ({ ...prev, isOpen: false }))}
        showToast={showToast}
      />

      <Toast toast={toast} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
    </div>
  );
};

export default App;
