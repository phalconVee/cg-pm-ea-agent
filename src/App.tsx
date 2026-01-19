import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaxFormCanvas from './components/TaxFormCanvas';
import OutcomeChatDrawer from './components/OutcomeChatDrawer';
import OutcomeChatBottomSheet from './components/OutcomeChatBottomSheet';
import W2UploadModal from './components/W2UploadModal';
import TestScenarioSwitcher from './components/TestScenarioSwitcher';
import NavigationScreen from './components/NavigationScreen';
import { Message, JumpLink, TurboTaxScreen } from './types';
import { taxState } from './state/taxState';
import { geminiService } from './services/geminiService';
import { generateW2Data, calculateRefundFromW2 } from './utils/w2DataGenerator';
import { streamText } from './utils/streamText';
import { generateJumpLinks } from './utils/jumpLinkGenerator';
import './App.css';

const App: React.FC = () => {
  const [_messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [_conversations, setConversations] = useState(taxState.getConversations());
  const [_currentConversationId, setCurrentConversationId] = useState<string | null>(
    taxState.getCurrentConversationId()
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMessages, setDrawerMessages] = useState<Message[]>([]);
  const [currentNavigationScreen, setCurrentNavigationScreen] = useState<{
    screen: TurboTaxScreen;
    context?: string;
    returnMessageId?: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = taxState.subscribe(() => {
      setMessages(taxState.getMessages());
      setConversations(taxState.getConversations());
      setCurrentConversationId(taxState.getCurrentConversationId());
    });

    // Initialize with empty state
    setMessages(taxState.getMessages());
    setConversations(taxState.getConversations());
    setCurrentConversationId(taxState.getCurrentConversationId());

    // Create initial conversation if none exists
    if (taxState.getCurrentConversationId() === null) {
      taxState.createConversation();
    }

    return unsubscribe;
  }, []);

  const handleSendMessage = async (userMessage: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    // Add user message to drawer
    const userMessageObj: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setDrawerMessages(prev => [...prev, userMessageObj]);
    
    // Create system message ID but don't add it until we have content
    const systemMessageId = `${Date.now()}-system`;
    let systemMessageAdded = false;
    
    try {
      // Get current taxpayer state for context
      const taxpayerState = taxState.getTaxpayerState();
      
      // Call Gemini API with streaming support
      await geminiService.sendMessage(
        userMessage,
        taxpayerState,
        (content, isComplete) => {
          // Only add system message when we have content
          if (!systemMessageAdded && content.trim()) {
            systemMessageAdded = true;
            // Generate jump links if message is already complete
            const jumpLinks = isComplete 
              ? generateJumpLinks(content, taxpayerState)
              : undefined;
            
            setDrawerMessages(prev => [...prev, {
              id: systemMessageId,
              role: 'system',
              content,
              timestamp: new Date(),
              isStreaming: !isComplete,
              jumpLinks,
            }]);
          } else if (systemMessageAdded) {
            // Update existing message
            setDrawerMessages(prev => {
              const updated = [...prev];
              const index = updated.findIndex(m => m.id === systemMessageId);
              if (index !== -1) {
                // Generate jump links when message is complete
                const jumpLinks = isComplete 
                  ? generateJumpLinks(content, taxpayerState)
                  : updated[index].jumpLinks; // Keep existing jump links if not complete yet
                
                updated[index] = {
                  ...updated[index],
                  content,
                  isStreaming: !isComplete,
                  jumpLinks,
                };
              }
              return updated;
            });
          }
        }
      );
      
      // Track suggestions after message is complete
      if (systemMessageAdded) {
        // This will be handled by the SuggestionChips component
        // We'll track them when they're actually shown
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const errorContent = `I'm sorry, I encountered an error: ${errorMessage}. Please check your API key in the .env file and ensure VITE_GEMINI_API_KEY is set correctly.`;
      
      // Add error message if system message wasn't added yet
      if (!systemMessageAdded) {
        setDrawerMessages(prev => [...prev, {
          id: systemMessageId,
          role: 'system',
          content: errorContent,
          timestamp: new Date(),
          isStreaming: false,
          jumpLinks: generateJumpLinks(errorContent, taxState.getTaxpayerState()),
        }]);
      } else {
        // Update existing message
        setDrawerMessages(prev => {
          const updated = [...prev];
          const index = updated.findIndex(m => m.id === systemMessageId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              content: errorContent,
              isStreaming: false,
              jumpLinks: generateJumpLinks(errorContent, taxState.getTaxpayerState()),
            };
          }
          return updated;
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExplainClick = async (fieldId: string) => {
    // Open drawer if not already open
    if (!isDrawerOpen) {
      setIsDrawerOpen(true);
    }
    
    // Reset conversation history for new explanation
    geminiService.resetConversation();
    
    // Clear previous messages and send explanation request
    setDrawerMessages([]);
    
    // Generate explanation based on field
    let explanationPrompt = '';
    const taxpayerState = taxState.getTaxpayerState();
    const refundAmount = taxpayerState.refundAmount !== 0 ? taxpayerState.refundAmount : 3764;
    const isBalanceDue = refundAmount < 0;
    const amount = Math.abs(refundAmount);
    
    if (fieldId === 'refund') {
      if (isBalanceDue) {
        explanationPrompt = `Why do I owe $${amount.toLocaleString()}?`;
      } else {
        explanationPrompt = `Why is my refund $${amount.toLocaleString()}?`;
      }
    } else if (fieldId === 'wages') {
      explanationPrompt = 'Explain the wages, salaries, tips amount on my tax return';
    } else {
      explanationPrompt = `Explain the ${fieldId} amount on my tax return`;
    }
    
    await handleSendMessage(explanationPrompt);
  };

  const handleActionClick = async (action: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const state = taxState.getTaxpayerState();
      let confirmationMessage = '';
      let updatedState = state;

      // Parse and execute action
      if (action.startsWith('add_form:')) {
        const formName = action.replace('add_form:', '');
        taxState.addForm(formName);
        updatedState = taxState.getTaxpayerState();
        confirmationMessage = `I've added your ${formName} form. Your return is now ${updatedState.completionPercentage}% complete.`;
        
        // Update refund estimate (simple mock logic)
        if (formName === 'W-2') {
          taxState.updateRefund(Math.floor(Math.random() * 2000) + 500);
        } else if (formName.includes('1099')) {
          taxState.updateRefund(Math.floor(Math.random() * 500) + 100);
        }
        updatedState = taxState.getTaxpayerState();
        
        if (updatedState.refundAmount > 0) {
          confirmationMessage += ` Your estimated refund is $${updatedState.refundAmount.toLocaleString()}.`;
        }
      } else if (action === 'add_form' || action === 'add_forms') {
        // Prompt for form type
        confirmationMessage = "Which form would you like to add? You can say the form name (like 'W-2' or '1099-DIV') or click one of the buttons below.";
        taxState.addMessage({
          id: `${Date.now()}-action-prompt`,
          role: 'system',
          content: confirmationMessage,
          timestamp: new Date(),
          agentType: 'executive',
          actions: [
            { label: 'W-2', action: 'add_form:W-2', type: 'secondary' },
            { label: '1099-INT', action: 'add_form:1099-INT', type: 'secondary' },
            { label: '1099-DIV', action: 'add_form:1099-DIV', type: 'secondary' },
            { label: '1099-MISC', action: 'add_form:1099-MISC', type: 'secondary' },
          ],
        });
        setIsProcessing(false);
        return;
      } else if (action === 'fix_this' || action === 'review_errors') {
        // Remove first error if any
        if (state.errors.length > 0) {
          const errorToRemove = state.errors[0];
          taxState.removeError(errorToRemove);
          updatedState = taxState.getTaxpayerState();
          confirmationMessage = `I've resolved that issue. ${updatedState.errors.length > 0 ? `You have ${updatedState.errors.length} ${updatedState.errors.length === 1 ? 'issue' : 'issues'} remaining.` : 'All issues are resolved.'}`;
        } else {
          confirmationMessage = "Your return looks good—no issues found.";
        }
      } else if (action === 'review_status' || action === 'review_return') {
        updatedState = taxState.getTaxpayerState();
        confirmationMessage = `Here's your current status:\n\n• Completion: ${updatedState.completionPercentage}%\n• Forms: ${updatedState.formsAdded.length} ${updatedState.formsAdded.length === 1 ? 'form' : 'forms'}\n• Estimated refund: $${updatedState.refundAmount.toLocaleString()}\n• Confidence: ${updatedState.confidenceLevel}`;
        
        if (updatedState.errors.length > 0) {
          confirmationMessage += `\n• Errors: ${updatedState.errors.length} ${updatedState.errors.length === 1 ? 'error' : 'errors'} to resolve`;
        }
      } else if (action === 'file_now' || action === 'file' || action === 'file_anyway') {
        updatedState = taxState.getTaxpayerState();
        if (action === 'file_anyway' || (updatedState.completionPercentage === 100 && updatedState.errors.length === 0)) {
          taxState.markComplete();
          updatedState = taxState.getTaxpayerState();
          confirmationMessage = `🎉 Your return has been successfully filed. Your estimated refund of $${updatedState.refundAmount.toLocaleString()} will be processed and should arrive within 21 days via direct deposit.`;
        } else {
          confirmationMessage = `Your return is ${updatedState.completionPercentage}% complete. ${updatedState.errors.length > 0 ? `You have ${updatedState.errors.length} ${updatedState.errors.length === 1 ? 'issue' : 'issues'} to resolve. ` : ''}Please complete your return before filing.`;
        }
      } else if (action === 'optimize') {
        // Route to optimization
        await handleSendMessage('help me reduce my taxes');
        setIsProcessing(false);
        return;
      } else if (action === 'explain') {
        // Prompt for explanation
        confirmationMessage = "What would you like me to explain? You can ask about tax concepts, deductions, or how something works.";
      } else if (action === 'upload_w2') {
        // Open upload modal
        setIsUploadModalOpen(true);
        setIsProcessing(false);
        return;
      } else {
        // Default: treat as a message
        await handleSendMessage(action);
        setIsProcessing(false);
        return;
      }

      // Add confirmation message
      taxState.addMessage({
        id: `${Date.now()}-action-${Math.random().toString(36).substr(2, 9)}`,
        role: 'system',
        content: confirmationMessage,
        timestamp: new Date(),
        agentType: 'executive',
      });

    } catch (error) {
      console.error('Error handling action:', error);
      taxState.addMessage({
        id: `${Date.now()}-action-error`,
        role: 'system',
        content: "I'm sorry, I encountered an error processing that action. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleW2UploadComplete = async (_file: File) => {
    // Generate mock W-2 data
    const existingW2Count = taxState.getW2Data().length;
    const w2Data = generateW2Data(existingW2Count);
    
    // Add W-2 data to state
    taxState.addW2Data(w2Data);
    
    // Calculate and update refund
    const refundFromW2 = calculateRefundFromW2(w2Data);
    const existingRefund = taxState.getTaxpayerState().refundAmount;
    taxState.setRefundAmount(existingRefund + refundFromW2);
    
    const state = taxState.getTaxpayerState();
    const totalW2s = state.w2Data.length;
    
    // Create streaming acknowledgment message
    const messageId = `${Date.now()}-w2-upload`;
    const message: Message = {
      id: messageId,
      role: 'system',
      content: '',
      timestamp: new Date(),
      agentType: 'executive',
      isStreaming: true,
    };
    
    taxState.addMessage(message);
    
    // Generate response text
    let responseText = `I've added your W-2 from ${w2Data.employerName}. Here's what I found:\n\n`;
    responseText += `• Wages: $${w2Data.wages.toLocaleString()}\n`;
    responseText += `• Federal tax withheld: $${w2Data.federalTaxWithheld.toLocaleString()}\n`;
    if (w2Data.stateTaxWithheld) {
      responseText += `• State tax withheld: $${w2Data.stateTaxWithheld.toLocaleString()} (${w2Data.state})\n`;
    }
    responseText += `\nYour return is now ${state.completionPercentage}% complete. `;
    
    if (totalW2s === 1) {
      responseText += `Your estimated refund is $${state.refundAmount.toLocaleString()}. `;
      responseText += `If you have additional W-2s or other income forms, you can upload them now.`;
    } else {
      responseText += `You've uploaded ${totalW2s} W-2 forms. Your estimated refund is $${state.refundAmount.toLocaleString()}.`;
    }
    
    // Stream the response
    streamText(responseText, {
      onChunk: (chunk, isComplete) => {
        taxState.updateMessage(messageId, {
          content: chunk,
          isStreaming: !isComplete,
        });
        
        if (isComplete) {
          // Add actions after streaming completes
          const actions = [];
          if (state.completionPercentage < 100) {
            actions.push(
              { label: 'Upload another W-2', action: 'upload_w2', type: 'secondary' },
              { label: 'What\'s next?', action: 'review_status', type: 'secondary' }
            );
          } else {
            actions.push(
              { label: 'File now', action: 'file_now', type: 'primary' },
              { label: 'Review return', action: 'review_return', type: 'secondary' }
            );
          }
          
          taxState.updateMessage(messageId, {
            actions: actions as import('./types').ActionButton[],
            isStreaming: false,
          });
        }
      },
      chunkDelay: 50,
    });
  };

  // Define navigation handlers after handleSendMessage is defined
  const handleJumpLinkClick = (jumpLink: JumpLink) => {
    const lastSystemMessage = [...drawerMessages]
      .reverse()
      .find(m => m.role === 'system');
    
    setCurrentNavigationScreen({
      screen: jumpLink.screen,
      context: jumpLink.context,
      returnMessageId: lastSystemMessage?.id,
    });
  };

  const handleNavigationBack = () => {
    setCurrentNavigationScreen(null);
  };

  const handleNavigationComplete = async (screen: TurboTaxScreen, _data?: any) => {
    // Close navigation screen
    setCurrentNavigationScreen(null);
    
    // Update taxpayer state based on completed screen
    const currentState = taxState.getTaxpayerState();
    
    // Simulate state updates based on screen
    if (screen === 'w2-import' && !currentState.w2Data.length) {
      // Add mock W-2 data
      const w2Data = generateW2Data(0);
      taxState.addW2Data(w2Data);
      const refundFromW2 = calculateRefundFromW2(w2Data);
      taxState.setRefundAmount(currentState.refundAmount + refundFromW2);
    }
    
    // Update completion percentage
    if (currentState.completionPercentage < 100) {
      taxState.setCompletionPercentage(Math.min(100, currentState.completionPercentage + 10));
    }
    
    // Wait a moment then auto-update explanation
    setTimeout(async () => {
      const updatedState = taxState.getTaxpayerState();
      const refundAmount = updatedState.refundAmount !== 0 ? updatedState.refundAmount : 3764;
      const isBalanceDue = refundAmount < 0;
      const amount = Math.abs(refundAmount);
      
      let updatePrompt = '';
      if (isBalanceDue) {
        updatePrompt = `I've updated my ${screen} information. Why do I owe $${amount.toLocaleString()} now?`;
      } else {
        updatePrompt = `I've updated my ${screen} information. Why is my refund $${amount.toLocaleString()} now?`;
      }
      
      // Reset conversation to get fresh explanation
      geminiService.resetConversation();
      await handleSendMessage(updatePrompt);
    }, 1000);
  };

  return (
    <div className="app">
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
      {isMobileSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}
      <main className={`main-content ${isDrawerOpen ? 'drawer-open' : ''}`}>
        <TaxFormCanvas 
          onExplainClick={handleExplainClick}
          onHamburgerClick={() => setIsMobileSidebarOpen(true)}
        />
        <W2UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={handleW2UploadComplete}
        />
      </main>
      {/* Desktop: Right drawer */}
      {!isMobile && (
        <OutcomeChatDrawer
          isOpen={isDrawerOpen}
          messages={drawerMessages}
          onActionClick={handleActionClick}
          isProcessing={isProcessing}
          onClose={() => setIsDrawerOpen(false)}
          onSendMessage={handleSendMessage}
          onJumpLinkClick={handleJumpLinkClick}
        />
      )}
      
      {/* Mobile: Bottom sheet */}
      {isMobile && (
        <OutcomeChatBottomSheet
          isOpen={isDrawerOpen}
          messages={drawerMessages}
          onActionClick={handleActionClick}
          isProcessing={isProcessing}
          onClose={() => setIsDrawerOpen(false)}
          onSendMessage={handleSendMessage}
          onJumpLinkClick={handleJumpLinkClick}
        />
      )}
      {currentNavigationScreen && (
        <NavigationScreen
          screen={currentNavigationScreen.screen}
          context={currentNavigationScreen.context}
          onBack={handleNavigationBack}
          onComplete={handleNavigationComplete}
        />
      )}
      <TestScenarioSwitcher />
    </div>
  );
};

export default App;
