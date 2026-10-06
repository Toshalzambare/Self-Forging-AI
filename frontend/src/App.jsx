import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

import Toast from './components/Toast.jsx';
import Header from './components/Header.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import EcosystemToolsPage from './pages/EcosystemToolsPage.jsx';
import ActivityLogsPage from './pages/ActivityLogsPage.jsx';
import ApiSettingsPage from './pages/ApiSettingsPage.jsx';
import CodeModal from './components/CodeModal.jsx';
import ModelModal from './components/ModelModal.jsx';
import ActivityDrawer from './components/ActivityDrawer.jsx';

const App = () => {
      const [modelModalOpen, setModelModalOpen] = useState(false);
      const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
      const [codeModalData, setCodeModalData] = useState({ isOpen: false, toolName: 'NotionDigestSync' });
      const [selectedModel, setSelectedModel] = useState('Claude 3.7 Sonnet');
      const [toast, setToast] = useState({ visible: false, title: '', message: '' });

      const showToast = (title, message) => {
        setToast({ visible: true, title, message });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
      };

      const handleInspectCode = (toolName) => {
        setCodeModalData({ isOpen: true, toolName });
      };

      return (
        <div className="min-h-screen flex flex-col bg-surface text-on-surface">
          <Header
            selectedModel={selectedModel}
            onOpenModelModal={() => setModelModalOpen(true)}
            onToggleLogsDrawer={() => setLogsDrawerOpen(!logsDrawerOpen)}
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
              element={
                <EcosystemToolsPage
                  onInspectCode={handleInspectCode}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/api-settings"
              element={
                <ApiSettingsPage
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/activity-logs"
              element={
                <ActivityLogsPage
                  showToast={showToast}
                />
              }
            />
          </Routes>

          {/* Activity Drawer */}
          <ActivityDrawer
            isOpen={logsDrawerOpen}
            onClose={() => setLogsDrawerOpen(false)}
            showToast={showToast}
          />

          {/* Model Switcher Modal */}
          <ModelModal
            isOpen={modelModalOpen}
            onClose={() => setModelModalOpen(false)}
            selectedModel={selectedModel}
            onSelectModel={(model) => {
              setSelectedModel(model);
              showToast('Active Model Updated', `Switched runtime intelligence to ${model}`);
            }}
          />

          {/* Code Inspector Modal */}
          <CodeModal
            isOpen={codeModalData.isOpen}
            toolName={codeModalData.toolName}
            onClose={() => setCodeModalData(prev => ({ ...prev, isOpen: false }))}
            showToast={showToast}
          />

          {/* Toast Container */}
          <Toast toast={toast} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
        </div>
      );
    };

export default App;
