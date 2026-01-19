import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Message } from '../types';
import { taxState } from '../state/taxState';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import './OutcomeChatBottomSheet.css';

interface OutcomeChatBottomSheetProps {
  isOpen: boolean;
  messages: Message[];
  onActionClick?: (action: string) => void;
  isProcessing?: boolean;
  onClose: () => void;
  onSendMessage?: (message: string) => void;
  onJumpLinkClick?: (jumpLink: import('../types').JumpLink) => void;
}

const OutcomeChatBottomSheet: React.FC<OutcomeChatBottomSheetProps> = ({
  isOpen,
  messages,
  onActionClick,
  isProcessing = false,
  onClose,
  onSendMessage,
  onJumpLinkClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [input, setInput] = useState('');
  const [sheetHeight, setSheetHeight] = useState<number>(0);
  const [hasExpanded, setHasExpanded] = useState<boolean>(false);

  // Bottom sheet states: CLOSED → PARTIAL_LOADING → FULL_READY → CLOSED
  const PARTIAL_LOADING_HEIGHT = window.innerHeight * 0.35; // 35% of viewport
  const FULL_READY_HEIGHT = window.innerHeight * 0.65; // 65% of viewport
  
  // Determine current state
  const hasMessages = messages.length > 0;
  const hasStreamingMessage = messages.some(m => m.isStreaming);
  const hasCompleteMessage = hasMessages && !hasStreamingMessage && !isProcessing;
  
  // State: PARTIAL_LOADING = sheet is open and (streaming OR processing OR just opened with question)
  // State: FULL_READY = has complete messages (no streaming, no processing)
  const isPartialLoadingState = isOpen && (hasStreamingMessage || isProcessing || (hasMessages && !hasCompleteMessage));
  const isFullReadyState = isOpen && hasCompleteMessage;

  useEffect(() => {
    if (isOpen && messagesEndRef.current && isFullReadyState) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, isOpen, isFullReadyState]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setHasExpanded(false);
      setSheetHeight(0);
    }
  }, [isOpen]);

  // State-driven height management: CLOSED → PARTIAL_LOADING → FULL_READY
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;
    
    requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      
      if (isPartialLoadingState) {
        // PARTIAL_LOADING state: 35% viewport height
        setSheetHeight(PARTIAL_LOADING_HEIGHT);
        sheetRef.current.style.height = `${PARTIAL_LOADING_HEIGHT}px`;
        sheetRef.current.style.maxHeight = `${PARTIAL_LOADING_HEIGHT}px`;
        sheetRef.current.style.minHeight = `${PARTIAL_LOADING_HEIGHT}px`;
      } else if (isFullReadyState) {
        // FULL_READY state: 95% viewport height
        setHasExpanded(true);
        setSheetHeight(FULL_READY_HEIGHT);
        sheetRef.current.style.height = `${FULL_READY_HEIGHT}px`;
        sheetRef.current.style.maxHeight = `${FULL_READY_HEIGHT}px`;
        sheetRef.current.style.minHeight = `200px`;
      }
    });
  }, [isOpen, isPartialLoadingState, isFullReadyState, PARTIAL_LOADING_HEIGHT, FULL_READY_HEIGHT]);

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    // Disable dragging during loading state
    if (!isDragging.current || !sheetRef.current || isPartialLoadingState) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY; // Negative when dragging up
    const newHeight = dragStartHeight.current + deltaY;
    const absoluteMax = FULL_READY_HEIGHT; // Maximum allowed when dragging (65vh)
    const minHeight = PARTIAL_LOADING_HEIGHT; // Minimum height (same as partial loading)
    
    // Constrain height between min and absolute max
    const constrainedHeight = Math.max(minHeight, Math.min(absoluteMax, newHeight));
    setSheetHeight(constrainedHeight);
    sheetRef.current.style.height = `${constrainedHeight}px`;
  };

  const handleDragEnd = () => {
    if (!isDragging.current || !sheetRef.current || isPartialLoadingState) return;
    
    isDragging.current = false;
    const currentHeight = sheetRef.current.offsetHeight;
    const threshold = PARTIAL_LOADING_HEIGHT * 0.5; // Close if dragged down more than 50% of partial height
    
    // If dragged down significantly, close the sheet
    if (currentHeight < threshold) {
      onClose();
    } else {
      // Maintain current height or snap to full ready height
      const finalHeight = currentHeight < FULL_READY_HEIGHT * 0.8 ? FULL_READY_HEIGHT : currentHeight;
      setSheetHeight(finalHeight);
      if (sheetRef.current) {
        sheetRef.current.style.height = `${finalHeight}px`;
        sheetRef.current.style.maxHeight = `${FULL_READY_HEIGHT}px`;
      }
    }
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    if (sheetRef.current) {
      dragStartHeight.current = sheetRef.current.offsetHeight;
    }
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
    e.preventDefault();
  };

  useEffect(() => {
    return () => {
      // Cleanup event listeners on unmount
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, []);

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
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div className="bottom-sheet-overlay" onClick={onClose}></div>
      )}
      
      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className={`outcome-chat-bottom-sheet ${isOpen ? 'sheet-open' : ''} ${isPartialLoadingState ? 'sheet-partial-loading' : ''} ${isFullReadyState ? 'sheet-full-ready' : ''}`}
        style={{ 
          height: sheetHeight > 0 ? `${sheetHeight}px` : 'auto',
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Drag handle - only enabled in FULL_READY state */}
        <div 
          className={`bottom-sheet-handle ${isPartialLoadingState ? 'handle-disabled' : ''}`}
          onMouseDown={isPartialLoadingState ? undefined : handleDragStart}
          onTouchStart={isPartialLoadingState ? undefined : handleDragStart}
        >
          <div className="handle-bar"></div>
        </div>
        
        <div className="bottom-sheet-content">
          {(isPartialLoadingState || isFullReadyState) && (
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Outcome Chat</h2>
              <button className="bottom-sheet-close-button" onClick={onClose}>
                ×
              </button>
            </div>
          )}
          
          <div className="bottom-sheet-messages">
            {isPartialLoadingState ? (
              // PARTIAL_LOADING state: Show question, loading skeleton
              <div className="bottom-sheet-loading-state">
                {messages.length > 0 && messages[0].role === 'user' && (
                  <div className="loading-user-question">
                    <MessageBubble
                      message={messages[0]}
                      onActionClick={onActionClick}
                      showSuggestions={false}
                      onSuggestionClick={() => {}}
                      onJumpLinkClick={onJumpLinkClick}
                    />
                  </div>
                )}
                <div className="loading-skeleton">
                  <div className="skeleton-line skeleton-line-1"></div>
                  <div className="skeleton-line skeleton-line-2"></div>
                  <div className="skeleton-line skeleton-line-3"></div>
                </div>
              </div>
            ) : (
              // FULL_READY state: Show all messages
              <>
                {messages.map((message, index) => {
                  const isLastSystemMessage = 
                    message.role === 'system' && 
                    !message.isStreaming && 
                    index === messages.length - 1 && 
                    !isProcessing;
                  
                  return (
                    <MessageBubble
                      key={message.id}
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
                  );
                })}
                {isProcessing && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {onSendMessage && (isPartialLoadingState || isFullReadyState) && (
            <>
              <div className="bottom-sheet-input-container">
                <div className="bottom-sheet-input-wrapper">
                  <textarea
                    className="bottom-sheet-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type or ask something"
                    disabled={isProcessing}
                    rows={1}
                  />
                  <button
                    className="bottom-sheet-send-button"
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
              <div className="bottom-sheet-footer">
                <a href="#" className="bottom-sheet-footer-link">
                  Important information about how we use generative AI
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default OutcomeChatBottomSheet;
