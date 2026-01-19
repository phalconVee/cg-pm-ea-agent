import React, { useState } from 'react';
import './ConversationSidebar.css';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  preview?: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar-header">
        <button
          className="new-conversation-button"
          onClick={onNewConversation}
        >
          <span className="new-icon">+</span>
          New Conversation
        </button>
      </div>
      
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="conversation-empty">
            <p>No conversations yet</p>
            <p className="conversation-empty-hint">Start a new conversation to begin</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                currentConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="conversation-item-content">
                <div className="conversation-item-title">{conversation.title}</div>
                {conversation.preview && (
                  <div className="conversation-item-preview">{conversation.preview}</div>
                )}
                <div className="conversation-item-time">
                  {formatDate(conversation.updatedAt)}
                </div>
              </div>
              {hoveredId === conversation.id && onDeleteConversation && (
                <button
                  className="conversation-delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  aria-label="Delete conversation"
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default ConversationSidebar;
