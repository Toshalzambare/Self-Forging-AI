import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config.js';

export const ProfileConfigCard = ({ user, showToast }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/settings/profile')
      .then((data) => setProfile(data))
      .catch((err) => showToast?.('Profile Error', err.message))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
          User Profile &amp; Engine Status
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Tenant identity, active model routing, and persistent security claims.
        </p>
      </div>

      <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary text-xl font-bold font-mono">
            {(user?.username || profile?.username || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              {profile?.username || user?.username || 'Anonymous User'}
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              {profile?.email || user?.email || 'user@local'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
          <div className="p-4 rounded-xl bg-surface-container space-y-1">
            <div className="text-[11px] font-semibold uppercase text-on-surface-variant tracking-wider">
              Tenant ID
            </div>
            <div className="font-mono text-xs text-on-surface break-all">
              {profile?.id || user?.id || '—'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container space-y-1">
            <div className="text-[11px] font-semibold uppercase text-on-surface-variant tracking-wider">
              Authentication Provider
            </div>
            <div className="text-xs text-primary font-medium capitalize">
              {profile?.auth_provider || user?.auth_provider || 'local'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container space-y-1">
            <div className="text-[11px] font-semibold uppercase text-on-surface-variant tracking-wider">
              Active LLM Model
            </div>
            <div className="font-mono text-xs text-secondary-fixed">
              {profile?.active_model || 'auto'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container space-y-1">
            <div className="text-[11px] font-semibold uppercase text-on-surface-variant tracking-wider">
              Gateway Endpoint
            </div>
            <div className="font-mono text-xs text-tertiary truncate">
              {profile?.active_endpoint || 'http://localhost:20128/v1'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
