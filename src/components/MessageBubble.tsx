import React, { useState, useEffect } from 'react';
import { Message, ActionButton, SearchResult, JumpLink } from '../types';
import { taxState } from '../state/taxState';
import SuggestionChips from './SuggestionChips';
import JumpLinkButton from './JumpLinkButton';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  onActionClick?: (action: string) => void;
  showSuggestions?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onJumpLinkClick?: (jumpLink: JumpLink) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onActionClick,
  showSuggestions = false,
  onSuggestionClick,
  onJumpLinkClick,
  previousSuggestions = [],
}) => {
  const isUser = message.role === 'user';
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Check if this is a filing success message
  useEffect(() => {
    if (message.content.includes('successfully filed') || message.content.includes('🎉')) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [message.content]);

  const handleActionClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action);
    }
  };

  return (
    <div className={`message-bubble ${isUser ? 'message-user' : 'message-system'} ${showSuccess ? 'message-success' : ''}`}>
      {message.statusText && (
        <div className="message-status">
          <span className="status-icon">🔍</span>
          {message.statusText}
        </div>
      )}
      <div className="message-wrapper">
        {isUser && (
          <div className="message-avatar">
            <div className="avatar-circle">G</div>
          </div>
        )}
        <div className="message-content">
          {message.content}
          {message.isStreaming && <span className="streaming-cursor">▊</span>}
        </div>
      </div>
      {!isUser && (
        <div className="message-actions-container">
          <div className="message-actions-icons">
            <button className="action-icon-button" aria-label="Copy">
              <i className="far fa-copy"></i>
            </button>
            <button className="action-icon-button" aria-label="Refresh">
              <i className="fas fa-redo"></i>
            </button>
            <button className="action-icon-button" aria-label="Thumbs up">
              <i className="far fa-thumbs-up"></i>
            </button>
            <button className="action-icon-button" aria-label="Thumbs down">
              <i className="far fa-thumbs-down"></i>
            </button>
          </div>
          {showSuggestions && onSuggestionClick && (
            <SuggestionChips
              lastMessage={message.content}
              taxpayerState={taxState.getTaxpayerState()}
              onChipClick={onSuggestionClick}
              previousSuggestions={previousSuggestions}
            />
          )}
          {/* Jump link appears on the same line */}
          {showSuggestions && 
           message.jumpLinks && 
           message.jumpLinks.length > 0 && 
           onJumpLinkClick && (
            <div className="message-jump-link">
              <JumpLinkButton
                jumpLink={message.jumpLinks[0]}
                onClick={onJumpLinkClick}
              />
            </div>
          )}
        </div>
      )}
      {message.searchResults && message.searchResults.length > 0 && (
        <div className="search-results">
          <button
            className="search-results-toggle"
            onClick={() => setShowSources(!showSources)}
          >
            <span className="search-icon">🌐</span>
            Sources ({message.searchResults.length})
            <span className={`toggle-arrow ${showSources ? 'expanded' : ''}`}>▼</span>
          </button>
          {showSources && (
            <div className="search-results-list">
              {message.searchResults.map((result: SearchResult, index: number) => (
                <div key={index} className="search-result-item">
                  <div className="search-result-title">{result.title}</div>
                  <div className="search-result-snippet">{result.snippet}</div>
                  <div className="search-result-source">{result.source}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {message.actions && message.actions.length > 0 && (
        <div className="message-actions">
          {message.actions.map((action, index) => (
            <button
              key={index}
              className={`message-action-button message-action-${action.type || 'secondary'}`}
              onClick={() => handleActionClick(action.action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {message.monetizationSuggestion && !dismissed && (
        <div className="monetization-suggestion">
          <div className="monetization-content">
            {message.monetizationSuggestion.message}
          </div>
          {message.monetizationSuggestion.dismissible && (
            <button
              className="monetization-dismiss"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}
      {message.agentType && !isUser && (
        <div className="message-agent-badge">
          {message.agentType}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
