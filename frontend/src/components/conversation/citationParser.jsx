import React from 'react';
import CitationBadge from './CitationBadge.jsx';

/**
 * Parses markdown/plain text for inline citation tags and transforms them into interactive CitationBadge pills.
 * Supported patterns:
 *   [[tool:tool_name]]
 *   [[doc:file_name.pdf]]
 *   [Tool: tool_name]
 *   [Doc: file_name.pdf]
 */
const CITATION_REGEX = /(\[\[(tool|doc):([^\]]+)\]\]|\[(Tool|Doc):\s*([^\]]+)\])/gi;

export function renderContentWithCitations(content, onCitationClick) {
  if (!content || typeof content !== 'string') return content || '';

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = CITATION_REGEX.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = CITATION_REGEX.lastIndex;

    // Push preceding text chunk
    if (matchStart > lastIndex) {
      parts.push(content.slice(lastIndex, matchStart));
    }

    const fullMatch = match[0];
    let type = 'tool';
    let target = '';

    if (match[2]) {
      type = match[2].toLowerCase();
      target = match[3].trim();
    } else if (match[4]) {
      type = match[4].toLowerCase();
      target = match[5].trim();
    }

    parts.push(
      <CitationBadge
        key={`citation-${matchStart}-${target}`}
        type={type}
        target={target}
        onClick={onCitationClick}
      />
    );

    lastIndex = matchEnd;
  }

  // Push remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
