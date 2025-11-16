/**
 * Chat Layout Component
 *
 * Main layout for the chat interface
 * Provides the structure for the entire application
 */

import { ReactNode } from 'react';
import { ModuleStatusIndicator } from './ModuleStatusIndicator';
import './ChatLayout.css';

interface ChatLayoutProps {
  children: ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="shield-icon">🛡️</span>
            SML Guardian
          </h1>
          <p className="app-tagline">Local-First AI with Privacy Built-In</p>
        </div>
      </header>

      <main className="chat-main">
        <div className="chat-container">
          <ModuleStatusIndicator />
          {children}
        </div>
      </main>
    </div>
  );
}
