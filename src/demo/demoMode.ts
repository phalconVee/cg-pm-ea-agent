import { taxState } from '../state/taxState';
import { agentOrchestrator } from '../agents/agentOrchestrator';

/**
 * Demo Mode - Scripted flow demonstration
 * 
 * Flow:
 * 1. User: "Why did my refund drop?"
 * 2. System explains refund change
 * 3. System suggests reviewing investments
 * 4. User adds 1099-DIV via button
 * 5. Refund updates
 * 6. Monetization Agent subtly suggests Live Expert Help
 * 7. User ignores it
 * 8. User files successfully
 */
export class DemoMode {
  private isRunning: boolean = false;

  /**
   * Initialize demo state
   */
  initializeDemoState(): void {
    // Clear existing messages
    taxState.clearMessages();

    // Set up initial state for demo:
    // - User has W-2 and some refund
    // - Refund recently dropped (simulating a change)
    taxState.taxpayerState.formsAdded = ['W-2'];
    taxState.taxpayerState.refundAmount = 1200; // Lower than before (was higher)
    taxState.taxpayerState.completionPercentage = 15; // Just W-2
    taxState.taxpayerState.errors = ['Missing investment income forms']; // Add an error to increase complexity
    taxState.taxpayerState.confidenceLevel = 'low';
    
    // Note: Interaction count will be set when we add the first user message
    // We need at least 2 interactions for monetization to trigger
  }

  /**
   * Run the demo flow
   */
  async runDemo(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Initialize state
    this.initializeDemoState();
    
    // Wait a moment for UI to update
    await this.delay(500);
    
    // Step 1: User asks "Why did my refund drop?"
    await this.step1_UserAsksAboutRefund();
    await this.delay(2000);
    
    // Step 2: System explains (handled by explanation agent)
    // This happens automatically via the orchestrator
    
    // Step 3: System suggests reviewing investments
    await this.step3_SuggestInvestments();
    await this.delay(2000);
    
    // Step 4: User adds 1099-DIV via button (simulated)
    await this.step4_Add1099Div();
    await this.delay(2000);
    
    // Step 5: Refund updates (handled by action handler)
    
    // Step 6: Monetization suggests Live Expert Help
    // This should happen automatically after adding the form
    
    // Step 7: User ignores it (no action needed)
    
    // Step 8: User files successfully
    await this.step8_FileReturn();
    
    this.isRunning = false;
  }

  private async step1_UserAsksAboutRefund(): Promise<void> {
    const userMessage = "Why did my refund drop?";
    const newMessages = await agentOrchestrator.processMessage(userMessage);
    newMessages.forEach(message => {
      taxState.addMessage(message);
    });
  }

  private async step3_SuggestInvestments(): Promise<void> {
    // The explanation agent should suggest reviewing investments
    // But we can also add a follow-up message
    
    // Add a message suggesting to review investments
    taxState.addMessage({
      id: `demo-step3-${Date.now()}`,
      role: 'system',
      content: "I notice you might have investment income that hasn't been added yet. Reviewing your investments could help ensure your refund is accurate. Would you like to add any investment forms like 1099-DIV?",
      timestamp: new Date(),
      agentType: 'executive',
      actions: [
        { label: 'Add 1099-DIV', action: 'add_form:1099-DIV', type: 'primary' },
        { label: 'Review Investments', action: 'optimize', type: 'secondary' },
      ],
    });
  }

  private async step4_Add1099Div(): Promise<void> {
    // Simulate clicking the "Add 1099-DIV" button
    // This will be handled by the action handler in App.tsx
    // For demo purposes, we'll directly add the form and show confirmation
    taxState.addForm('1099-DIV');
    
    // Remove the error since we added the missing form
    if (taxState.taxpayerState.errors.length > 0) {
      taxState.removeError(taxState.taxpayerState.errors[0]);
    }
    
    // Update refund (adding 1099-DIV might increase refund)
    taxState.updateRefund(350);
    const finalState = taxState.getTaxpayerState();
    
    taxState.addMessage({
      id: `demo-step4-${Date.now()}`,
      role: 'system',
      content: `I've added your 1099-DIV form. Your return is now ${finalState.completionPercentage}% complete. Your estimated refund is $${finalState.refundAmount.toLocaleString()}.`,
      timestamp: new Date(),
      agentType: 'executive',
    });
    
    // Wait a moment before triggering monetization
    await this.delay(1500);
    
    // Add another form to increase complexity to 'high' for monetization
    // This simulates a more complex tax situation
    taxState.addForm('1099-INT');
    taxState.updateRefund(150);
    
    // Trigger monetization check by processing a message
    // This will check for monetization opportunity
    // The state should have high complexity (3+ forms) and low confidence
    const checkMessage = "What else do I need?";
    const newMessages = await agentOrchestrator.processMessage(checkMessage);
    newMessages.forEach(message => {
      taxState.addMessage(message);
    });
  }

  private async step8_FileReturn(): Promise<void> {
    // Complete the return first
    taxState.taxpayerState.completionPercentage = 100;
    taxState.taxpayerState.errors = [];
    taxState.taxpayerState.confidenceLevel = 'high';
    
    // User files
    const fileMessage = "I'm ready to file";
    const newMessages = await agentOrchestrator.processMessage(fileMessage);
    newMessages.forEach(message => {
      taxState.addMessage(message);
    });
    
    // If filing was successful, mark as complete
    const state = taxState.getTaxpayerState();
    if (state.completionPercentage === 100) {
      taxState.markComplete();
      
      // Add final confirmation
      taxState.addMessage({
        id: `demo-step8-${Date.now()}`,
        role: 'system',
        content: `🎉 Your return has been successfully filed. Your estimated refund of $${state.refundAmount.toLocaleString()} will be processed and should arrive within 21 days via direct deposit.`,
        timestamp: new Date(),
        agentType: 'executive',
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if demo is currently running
   */
  isDemoRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset demo state
   */
  reset(): void {
    this.isRunning = false;
  }
}

export const demoMode = new DemoMode();
