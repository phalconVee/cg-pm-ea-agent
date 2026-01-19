import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import './OutcomeChatDrawer.css';

interface OutcomeChatDrawerProps {
  isOpen: boolean;
  messages: Message[];
  onActionClick?: (action: string) => void;
  isProcessing?: boolean;
  onClose: () => void;
  onSendMessage?: (message: string) => void;
  onJumpLinkClick?: (jumpLink: import('../types').JumpLink) => void;
}

const OutcomeChatDrawer: React.FC<OutcomeChatDrawerProps> = ({
  isOpen,
  messages,
  onActionClick,
  isProcessing = false,
  onClose,
  onSendMessage,
  onJumpLinkClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, isOpen]);

  const handleSend = () => {
    if (input.trim() && !isProcessing && onSendMessage) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`outcome-chat-drawer ${isOpen ? 'drawer-open' : ''}`}>
      <div className="drawer-content">
        <div className="drawer-header">
          <h2 className="drawer-title">Outcome Chat</h2>
          <button className="drawer-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="drawer-messages">
          {messages.length === 0 ? (
            <div className="drawer-empty-state">
              <p>Ask me to explain any amount or field on your tax return.</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastSystemMessage = 
                  message.role === 'system' && 
                  !message.isStreaming && 
                  index === messages.length - 1 && 
                  !isProcessing;
                
                return (
                  <React.Fragment key={message.id}>
                    <MessageBubble
                      message={message}
                      onActionClick={onActionClick}
                      showSuggestions={isLastSystemMessage}
                      onSuggestionClick={(suggestion) => {
                        if (onSendMessage) {
                          onSendMessage(suggestion);
                        }
                      }}
                      onJumpLinkClick={onJumpLinkClick}
                    />
                  </React.Fragment>
                );
              })}
              {isProcessing && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {onSendMessage && (
          <>
            <div className="drawer-input-container">
              <div className="drawer-input-wrapper">
                <textarea
                  className="drawer-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type or ask something"
                  disabled={isProcessing}
                  rows={1}
                />
                <button
                  className="drawer-send-button"
                  onClick={handleSend}
                  disabled={isProcessing || !input.trim()}
                  aria-label="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="drawer-footer">
              <a href="#" className="drawer-footer-link">
                Important information about how we use generative AI
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OutcomeChatDrawer;
