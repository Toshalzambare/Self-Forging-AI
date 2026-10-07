import React, { useState, useEffect, useRef } from 'react';
import { APP_NAME } from '../config.js';

const CodeModal = ({ isOpen, onClose, toolName, showToast }) => {
      if (!isOpen) return null;

      const codeContent = toolName === 'SQLSynthesizer'
        ? `@register_tool(
    name="sql_query_synthesizer",
    description="Executes introspected read-only SQL queries",
    read_only=True
)
def run_analytical_query(ctx: Context, query_pattern: str):
    # Enforces read-only AST parse
    disallowed = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER"]
    if any(keyword in query_pattern.upper() for keyword in disallowed):
        raise SecurityException("Unpermitted mutation keyword.")
    
    db_conn = ctx.get_connection("postgres_replica")
    with db_conn.cursor() as cur:
        cur.execute(query_pattern)
        return {"rows": cur.fetchall(), "count": cur.rowcount}`
        : `import os
import requests
from {APP_NAME.toLowerCase().replace(' ', '-')}.mcp import register_tool, Context

@register_tool(
    name="notion_digest_sync",
    description="Syncs structured financial market briefs directly to database",
    read_only=False
)
def sync_financial_cards(ctx: Context, payload: list[dict]):
    notion_token = ctx.secrets.get("NOTION_API_KEY")
    db_id = ctx.config.get("DATABASE_ID")
    
    headers = {
        "Authorization": f"Bearer {notion_token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    results = []
    for item in payload:
        card = {
            "parent": {"database_id": db_id},
            "properties": {
                "Ticker": {"title": [{"text": {"content": item['ticker']}}]},
                "Sentiment": {"select": {"name": item['sentiment']}},
                "Summary": {"rich_text": [{"text": {"content": item['summary']}}]}
            }
        }
        res = requests.post("https://api.notion.com/v1/pages", headers=headers, json=card)
        results.append(res.status_code)
    
    return {"status": "success", "synced_records": len(results)}`;

      const title = toolName === 'SQLSynthesizer' ? 'SQLQuerySynthesizer.py' : 'NotionDigestSync.py';

      return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-surface-container flex items-start sm:items-center justify-between border-b border-outline-variant/20">
              <div className="flex items-start sm:items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
                  <span className="material-symbols-outlined text-[20px] material-symbols-fill">terminal</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-[16px] sm:text-headline-sm font-semibold text-on-surface leading-tight break-all">{title}</h3>
                  <p className="font-label-sm text-[10px] sm:text-label-sm text-primary mt-1">Dynamically compiled sandbox execution script</p>
                </div>
              </div>
              <button className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface flex-shrink-0 ml-2" onClick={onClose}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto font-mono text-body-sm text-on-surface bg-surface-container-lowest/80 space-y-2">
              <div className="text-tertiary text-[10px] sm:text-xs"># Generated autonomously by {APP_NAME} [Model: Claude 3.7 Sonnet]</div>
              <div className="text-tertiary text-[10px] sm:text-xs"># Verification: AST static analysis passed | Output schema locked</div>
              <pre className="text-primary-fixed-dim whitespace-pre-wrap leading-relaxed mt-2 text-[11px] sm:text-sm overflow-x-auto">
                {codeContent}
              </pre>
            </div>
            <div className="p-4 bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between border-t border-outline-variant/20 gap-4 sm:gap-0">
              <div className="flex items-center space-x-2 text-on-surface-variant font-label-sm text-[11px] sm:text-label-sm">
                <span className="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">lock</span>
                <span>Sandboxed under gVisor Isolation</span>
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <button
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-surface-container-high text-on-surface font-body-sm text-xs sm:text-body-sm hover:bg-surface-bright transition-colors"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary text-on-primary font-body-sm text-xs sm:text-body-sm font-medium hover:bg-primary-container transition-colors shadow-sm"
                  onClick={() => {
                    showToast('Copied Manifest', 'Code schema copied to clipboard');
                    onClose();
                  }}
                >
                  Copy Manifest
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

export default CodeModal;
