import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import './ChatThread.css';

interface ChatThreadProps {
  messages: Message[];
  onActionClick?: (action: string) => void;
  isProcessing?: boolean;
}

const ChatThread: React.FC<ChatThreadProps> = ({ messages, onActionClick, isProcessing = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="chat-thread">
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          onActionClick={onActionClick}
        />
      ))}
      {isProcessing && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatThread;
