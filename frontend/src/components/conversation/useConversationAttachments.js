import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, apiFetch } from '../../config.js';

export function useConversationAttachments(activeId, showToast, ensureConversation) {
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch attachments when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setAttachments([]);
      return;
    }

    let isMounted = true;
    apiFetch(`/api/conversations/${activeId}/attachments`)
      .then((data) => {
        if (isMounted) {
          setAttachments(data.attachments || []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load conversation attachments:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeId]);

  // Upload document attachment to MinIO S3 & PostgreSQL
  const uploadAttachment = useCallback(
    async (file) => {
      if (!file) return;

      setIsUploading(true);
      try {
        let targetConvId = activeId;
        if (!targetConvId && ensureConversation) {
          const conv = await ensureConversation(file.name);
          targetConvId = conv?.id;
        }

        if (!targetConvId) {
          showToast?.('Upload Error', 'Please select or start a conversation first.');
          return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('sfa_access_token');
        const res = await fetch(`${API_BASE_URL}/api/conversations/${targetConvId}/attachments`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        const uploaded = data.attachment;
        setAttachments((prev) => [...prev, uploaded]);
        showToast?.('Document Attached', `${uploaded.filename} uploaded and parsed for context.`);
        return uploaded;
      } catch (err) {
        console.error('Attachment upload error:', err);
        showToast?.('Upload Failed', err.message || 'Could not upload document.');
      } finally {
        setIsUploading(false);
      }
    },
    [activeId, ensureConversation, showToast]
  );

  // Remove attachment
  const removeAttachment = useCallback(
    async (attachmentId) => {
      if (!attachmentId || !activeId) return;

      try {
        await apiFetch(`/api/conversations/${activeId}/attachments/${attachmentId}`, {
          method: 'DELETE',
        });
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        showToast?.('Removed', 'Document attachment removed.');
      } catch (err) {
        console.error('Failed to delete attachment:', err);
        showToast?.('Delete Error', err.message || 'Could not remove attachment.');
      }
    },
    [activeId, showToast]
  );

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    isUploading,
    uploadAttachment,
    removeAttachment,
    clearAttachments,
  };
}

export default useConversationAttachments;
