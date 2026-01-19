import { Message, TaxpayerState, FilingStatus, W2Data, Conversation } from '../types';

// Simple client-side state management
class TaxState {
  private messages: Message[] = [];
  private listeners: Set<() => void> = new Set();
  private conversations: Conversation[] = [];
  private currentConversationId: string | null = null;

  // Mock taxpayer state - mutable for demo purposes
  public taxpayerState: TaxpayerState = {
    filingStatus: 'single',
    formsAdded: [],
    refundAmount: 0,
    completionPercentage: 0,
    errors: [],
    confidenceLevel: 'low',
    w2Data: [],
  };

  // Track interactions for monetization
  private interactionCount: number = 0;

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
    this.notifyListeners();
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    // Increment interaction count for user messages
    if (message.role === 'user') {
      this.interactionCount++;
    }
    
    // Save to current conversation
    this.saveCurrentConversation();
    
    this.notifyListeners();
  }

  /**
   * Update an existing message by ID
   */
  updateMessage(messageId: string, updates: Partial<Message>): void {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      this.messages[index] = { ...this.messages[index], ...updates };
      
      // Save to current conversation
      this.saveCurrentConversation();
      
      this.notifyListeners();
    }
  }

  /**
   * Get interaction count (for monetization)
   */
  getInteractionCount(): number {
    return this.interactionCount;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Taxpayer state helper functions

  /**
   * Add a form to the formsAdded array
   */
  addForm(formName: string): void {
    if (!this.taxpayerState.formsAdded.includes(formName)) {
      this.taxpayerState.formsAdded.push(formName);
      this.updateCompletionPercentage();
      this.saveCurrentConversation();
    }
  }

  /**
   * Add W-2 data
   */
  addW2Data(w2Data: W2Data): void {
    this.taxpayerState.w2Data.push(w2Data);
    // Ensure W-2 is in formsAdded
    if (!this.taxpayerState.formsAdded.includes('W-2')) {
      this.taxpayerState.formsAdded.push('W-2');
    }
    this.updateCompletionPercentage();
    this.saveCurrentConversation();
  }

  /**
   * Get all W-2 data
   */
  getW2Data(): W2Data[] {
    return [...this.taxpayerState.w2Data];
  }

  // Conversation management

  /**
   * Create a new conversation
   */
  createConversation(title?: string): string {
    // Save current conversation before creating new one
    this.saveCurrentConversation();
    
    const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Reset taxpayer state for new conversation
    const newTaxpayerState: TaxpayerState = {
      filingStatus: 'single',
      formsAdded: [],
      refundAmount: 0,
      completionPercentage: 0,
      errors: [],
      confidenceLevel: 'low',
      w2Data: [],
    };
    
    const conversation: Conversation = {
      id,
      title: title || 'New Conversation',
      messages: [],
      taxpayerState: newTaxpayerState,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.conversations.push(conversation);
    this.currentConversationId = id;
    this.messages = [];
    this.taxpayerState = newTaxpayerState;
    this.interactionCount = 0; // Reset interaction count for new conversation
    this.notifyListeners();
    
    return id;
  }

  /**
   * Switch to a conversation
   */
  switchConversation(conversationId: string): void {
    // Save current conversation before switching
    this.saveCurrentConversation();
    
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation) {
      this.currentConversationId = conversationId;
      this.messages = [...conversation.messages];
      this.taxpayerState = { ...conversation.taxpayerState };
      
      // Recalculate interaction count from messages
      this.interactionCount = this.messages.filter(m => m.role === 'user').length;
      
      this.notifyListeners();
    }
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Get all conversations (for sidebar)
   */
  getConversations(): Array<{
    id: string;
    title: string;
    updatedAt: Date;
    preview?: string;
  }> {
    return this.conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      updatedAt: conv.updatedAt,
      preview: this.getConversationPreview(conv),
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get conversation preview (last user message or first system message)
   */
  private getConversationPreview(conversation: Conversation): string | undefined {
    const lastUserMessage = [...conversation.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    if (lastUserMessage) {
      return lastUserMessage.content.length > 50
        ? lastUserMessage.content.substring(0, 50) + '...'
        : lastUserMessage.content;
    }
    
    const firstSystemMessage = conversation.messages.find(m => m.role === 'system');
    if (firstSystemMessage) {
      return firstSystemMessage.content.length > 50
        ? firstSystemMessage.content.substring(0, 50) + '...'
        : firstSystemMessage.content;
    }
    
    return undefined;
  }

  /**
   * Update conversation title
   */
  updateConversationTitle(conversationId: string, title: string): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      this.notifyListeners();
    }
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): void {
    this.conversations = this.conversations.filter(c => c.id !== conversationId);
    
    // If deleting current conversation, switch to most recent or create new
    if (this.currentConversationId === conversationId) {
      if (this.conversations.length > 0) {
        const mostRecent = this.conversations.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        )[0];
        this.switchConversation(mostRecent.id);
      } else {
        this.currentConversationId = null;
        this.messages = [];
        this.notifyListeners();
      }
    } else {
      this.notifyListeners();
    }
  }

  /**
   * Save current conversation state
   */
  saveCurrentConversation(): void {
    if (this.currentConversationId) {
      const conversation = this.conversations.find(c => c.id === this.currentConversationId);
      if (conversation) {
        conversation.messages = [...this.messages];
        conversation.taxpayerState = { ...this.taxpayerState };
        conversation.updatedAt = new Date();
        
        // Auto-update title from first user message if still "New Conversation"
        if (conversation.title === 'New Conversation' || conversation.title.startsWith('New Conversation')) {
          const firstUserMessage = this.messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            const title = firstUserMessage.content.length > 30
              ? firstUserMessage.content.substring(0, 30) + '...'
              : firstUserMessage.content;
            conversation.title = title;
          }
        }
      }
    }
  }

  /**
   * Remove an error from the errors array
   */
  removeError(error: string): void {
    const index = this.taxpayerState.errors.indexOf(error);
    if (index > -1) {
      this.taxpayerState.errors.splice(index, 1);
      this.updateCompletionPercentage();
    }
  }

  /**
   * Update the refund amount by a delta (can be positive or negative)
   */
  updateRefund(delta: number): void {
    this.taxpayerState.refundAmount = Math.max(0, this.taxpayerState.refundAmount + delta);
    this.updateConfidenceLevel();
    this.saveCurrentConversation();
  }

  /**
   * Mark the tax return as complete (100% completion)
   */
  markComplete(): void {
    this.taxpayerState.completionPercentage = 100;
    this.taxpayerState.confidenceLevel = 'high';
    this.taxpayerState.errors = [];
    this.saveCurrentConversation();
  }

  /**
   * Get the current taxpayer state (read-only copy)
   */
  getTaxpayerState(): Readonly<TaxpayerState> {
    return { ...this.taxpayerState };
  }

  /**
   * Update filing status
   */
  setFilingStatus(status: FilingStatus): void {
    this.taxpayerState.filingStatus = status;
    this.updateConfidenceLevel();
  }

  /**
   * Add an error to the errors array
   */
  addError(error: string): void {
    if (!this.taxpayerState.errors.includes(error)) {
      this.taxpayerState.errors.push(error);
      this.updateCompletionPercentage();
    }
  }

  /**
   * Set refund amount directly
   */
  setRefundAmount(amount: number): void {
    this.taxpayerState.refundAmount = Math.max(0, amount);
    this.updateConfidenceLevel();
    this.saveCurrentConversation();
  }

  /**
   * Update completion percentage based on forms and errors
   */
  private updateCompletionPercentage(): void {
    // Simple calculation: base completion on forms added and errors
    const formWeight = this.taxpayerState.formsAdded.length * 15; // Each form adds 15%
    const errorPenalty = this.taxpayerState.errors.length * 5; // Each error reduces by 5%
    const calculated = Math.min(100, Math.max(0, formWeight - errorPenalty));
    this.taxpayerState.completionPercentage = calculated;
    this.updateConfidenceLevel();
  }

  /**
   * Set completion percentage directly (public method)
   */
  setCompletionPercentage(percentage: number): void {
    this.taxpayerState.completionPercentage = Math.min(100, Math.max(0, percentage));
    this.updateConfidenceLevel();
    this.saveCurrentConversation();
  }

  /**
   * Update confidence level based on completion and errors
   */
  private updateConfidenceLevel(): void {
    if (this.taxpayerState.completionPercentage === 100 && this.taxpayerState.errors.length === 0) {
      this.taxpayerState.confidenceLevel = 'high';
    } else if (this.taxpayerState.completionPercentage >= 50 && this.taxpayerState.errors.length <= 2) {
      this.taxpayerState.confidenceLevel = 'medium';
    } else {
      this.taxpayerState.confidenceLevel = 'low';
    }
  }
}

export const taxState = new TaxState();
