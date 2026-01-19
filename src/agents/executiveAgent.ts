import { AgentResponse, AgentType, Intent, ActionButton } from '../types';
import { taxState } from '../state/taxState';
import { monetizationAgent } from './monetizationAgent';
import { shouldUseWebSearch, simulateWebSearch } from '../tools/webSearchSimulator';

/**
 * Executive Chat Agent
 * 
 * Responsibilities:
 * - Infer user intent from messages
 * - Inspect current tax state
 * - Route to appropriate specialist agents
 * - Maintain consistent voice
 * - Never expose agent names to users
 * - Optionally inject monetization suggestions
 */
export const executiveAgent = {
  async process(message: string): Promise<AgentResponse & { useWebSearch?: boolean; searchQuery?: string }> {
    const lowerMessage = message.toLowerCase().trim();
    const state = taxState.getTaxpayerState();
    const intent = inferIntent(lowerMessage, state);

    // Check if we should use web search
    const shouldSearch = shouldUseWebSearch(message) && (intent === 'EXPLAIN' || intent === null);

    let response: AgentResponse & { useWebSearch?: boolean; searchQuery?: string };

    switch (intent) {
      case 'EXPLAIN':
        if (shouldSearch) {
          response = { ...handleExplainIntent(lowerMessage), useWebSearch: true, searchQuery: message };
        } else {
          response = handleExplainIntent(lowerMessage);
        }
        break;
      
      case 'ADD_FORM':
        response = handleAddFormIntent(lowerMessage, state);
        break;
      
      case 'REVIEW_STATUS':
        response = handleReviewStatusIntent(state);
        break;
      
      case 'OPTIMIZE':
        response = handleOptimizeIntent(lowerMessage, state);
        break;
      
      case 'FILE':
        response = handleFileIntent(state);
        break;
      
      default:
        if (shouldSearch) {
          response = { ...handleDefaultResponse(state), useWebSearch: true, searchQuery: message };
        } else {
          response = handleDefaultResponse(state);
        }
    }

    // Check for monetization opportunity and inject if appropriate
    // Only after streaming completes (handled in orchestrator)
    const monetizationSuggestion = await monetizationAgent.checkOpportunity(
      message,
      intent,
      state
    );

    if (monetizationSuggestion) {
      response.monetizationSuggestion = monetizationSuggestion;
    }

    return response;
  },
};

/**
 * Infer user intent using simple rule-based logic
 */
function inferIntent(message: string, state: any): Intent | null {
  // EXPLAIN: Questions about tax concepts
  if (
    message.match(/\b(why|what is|what's|how does|how do|explain|tell me about|what does)\b/i) ||
    message.includes('?') && (
      message.includes('mean') ||
      message.includes('work') ||
      message.includes('difference')
    )
  ) {
    return 'EXPLAIN';
  }

  // ADD_FORM: User mentions receiving or adding forms
  if (
    message.match(/\b(got|received|have|add|upload|entered|got a|got my)\b/i) &&
    (
      /\b(w-2|1099|w2|form|document)\b/i.test(message) ||
      /\b\d{4}\b/.test(message) // Contains 4-digit number (form numbers)
    )
  ) {
    return 'ADD_FORM';
  }

  // REVIEW_STATUS: Checking progress or completion
  if (
    message.match(/\b(what's left|what is left|am i done|are we done|how much left|progress|status|complete|finished)\b/i) ||
    message.match(/\b(what do i need|what else|anything else|missing)\b/i)
  ) {
    return 'REVIEW_STATUS';
  }

  // OPTIMIZE: Looking to save money or reduce taxes
  if (
    message.match(/\b(reduce|lower|save|optimize|maximize|increase|more|better|deduct|deduction)\b/i) &&
    (
      message.includes('tax') ||
      message.includes('refund') ||
      message.includes('money')
    )
  ) {
    return 'OPTIMIZE';
  }

  // FILE: Ready to file or submit
  if (
    message.match(/\b(file|submit|done|finish|ready|send|e-file|efile)\b/i) &&
    !message.match(/\b(not|can't|cannot|unable)\b/i)
  ) {
    return 'FILE';
  }

  return null;
}

/**
 * Handle EXPLAIN intent - Route to explanation agent
 */
function handleExplainIntent(message: string): AgentResponse {
  return {
    content: "I'd be happy to explain that for you. Let me get you the information you need.",
    agentType: 'executive',
    shouldContinue: true,
    nextAgent: 'explanation',
  };
}

/**
 * Handle ADD_FORM intent - Extract form name and add it
 */
function handleAddFormIntent(message: string, state: any): AgentResponse {
  // Extract form name from message
  const formName = extractFormName(message);
  
  if (formName) {
    taxState.addForm(formName);
    const updatedState = taxState.getTaxpayerState();
    
    return {
      content: `I've added your ${formName} to your tax return. Your completion is now ${updatedState.completionPercentage}%. ${getNextStepsSuggestion(updatedState)}`,
      agentType: 'executive',
      shouldContinue: false,
      actions: getFormActions(updatedState),
    };
  } else {
    return {
      content: "I can add that form for you. Which form did you receive? For example, W-2, 1099-INT, 1099-DIV, etc.",
      agentType: 'executive',
      shouldContinue: false,
      actions: [
        { label: 'W-2', action: 'add_form:W-2', type: 'secondary' },
        { label: '1099-INT', action: 'add_form:1099-INT', type: 'secondary' },
        { label: '1099-DIV', action: 'add_form:1099-DIV', type: 'secondary' },
      ],
    };
  }
}

/**
 * Handle REVIEW_STATUS intent - Show current progress
 */
function handleReviewStatusIntent(state: any): AgentResponse {
  const formsCount = state.formsAdded.length;
  const hasErrors = state.errors.length > 0;
  
  let content = `Here's where you stand:\n\n`;
  content += `• Completion: ${state.completionPercentage}%\n`;
  content += `• Forms added: ${formsCount} ${formsCount === 1 ? 'form' : 'forms'}\n`;
  content += `• Estimated refund: $${state.refundAmount.toLocaleString()}\n`;
  content += `• Confidence: ${state.confidenceLevel}\n`;
  
  if (hasErrors) {
    content += `\n⚠️ You have ${state.errors.length} ${state.errors.length === 1 ? 'error' : 'errors'} that need attention.`;
  }
  
  if (state.completionPercentage < 100) {
    content += `\n\nYou still have some work to do. Would you like help adding more forms or reviewing your deductions?`;
  } else if (!hasErrors) {
    content += `\n\nYour return is complete and ready to file.`;
  }
  
  return {
    content,
    agentType: 'executive',
    shouldContinue: false,
    actions: getStatusActions(state),
  };
}

/**
 * Handle OPTIMIZE intent - Route to deductions or investments agent
 */
function handleOptimizeIntent(message: string, state: any): AgentResponse {
  // Determine if it's about deductions or investments
  if (
    message.includes('deduct') ||
    message.includes('expense') ||
    message.includes('write off') ||
    message.includes('business')
  ) {
    return {
      content: "I'll help you find deductions and expenses that could reduce your tax bill. Let me connect you with our deductions specialist.",
      agentType: 'executive',
      shouldContinue: true,
      nextAgent: 'deductions',
    };
  }
  
  if (
    message.includes('invest') ||
    message.includes('stock') ||
    message.includes('capital gain') ||
    message.includes('dividend')
  ) {
    return {
      content: "I'll help you optimize your investment-related taxes. Let me connect you with our investments specialist.",
      agentType: 'executive',
      shouldContinue: true,
      nextAgent: 'investments',
    };
  }
  
  // Default to deductions
  return {
    content: "I'll help you find ways to reduce your tax bill and maximize your refund. Let me connect you with our deductions specialist.",
    agentType: 'executive',
    shouldContinue: true,
    nextAgent: 'deductions',
  };
}

/**
 * Handle FILE intent - Check if ready to file
 */
function handleFileIntent(state: any): AgentResponse {
  const isComplete = state.completionPercentage === 100;
  const hasErrors = state.errors.length > 0;
  
  if (hasErrors) {
    return {
      content: `I found ${state.errors.length} ${state.errors.length === 1 ? 'issue' : 'issues'} that need to be resolved before filing. Let's fix those first.`,
      agentType: 'executive',
      shouldContinue: false,
      actions: [
        { label: 'Review Errors', action: 'review_errors', type: 'primary' },
        { label: 'Continue Anyway', action: 'file_anyway', type: 'secondary' },
      ],
    };
  }
  
  if (!isComplete) {
    return {
      content: `Your return is ${state.completionPercentage}% complete. We need a bit more information before filing. Would you like help completing it?`,
      agentType: 'executive',
      shouldContinue: false,
      actions: [
        { label: 'Add More Forms', action: 'add_forms', type: 'primary' },
        { label: 'Review Status', action: 'review_status', type: 'secondary' },
      ],
    };
  }
  
  // Check if W-2 exists
  const hasW2 = state.w2Data && state.w2Data.length > 0;
  
  if (!hasW2 && state.completionPercentage < 50) {
    return {
      content: `Your return is ${state.completionPercentage}% complete. To file, you'll need to upload at least one W-2 form. Would you like to upload your W-2 now?`,
      agentType: 'executive',
      shouldContinue: false,
      actions: [
        { label: 'Upload W-2', action: 'upload_w2', type: 'primary' },
        { label: 'Review Status', action: 'review_status', type: 'secondary' },
      ],
    };
  }
  
  // Ready to file
  taxState.markComplete();
  let content = `Your return is complete and ready to file. `;
  
  if (hasW2 && state.w2Data.length > 0) {
    const totalWages = state.w2Data.reduce((sum: number, w2: any) => sum + w2.wages, 0);
    content += `Based on your W-2${state.w2Data.length > 1 ? 's' : ''} showing $${totalWages.toLocaleString()} in wages, `;
  }
  
  content += `your estimated refund is $${state.refundAmount.toLocaleString()}. Would you like to proceed with filing?`;
  
  return {
    content,
    agentType: 'executive',
    shouldContinue: false,
    actions: [
      { label: 'File Now', action: 'file_now', type: 'primary' },
      { label: 'Review First', action: 'review_return', type: 'secondary' },
    ],
  };
}

/**
 * Handle default/unclear intent
 */
function handleDefaultResponse(state: any): AgentResponse {
  const formsCount = state.formsAdded.length;
  
  if (formsCount === 0) {
    return {
      content: "I'm here to help you with your taxes. Let's get started! You can add forms, ask questions, or check your progress. What would you like to do?",
      agentType: 'executive',
      shouldContinue: false,
      actions: [
        { label: 'Add a Form', action: 'add_form', type: 'primary' },
        { label: 'Check Status', action: 'review_status', type: 'secondary' },
        { label: 'Ask a Question', action: 'explain', type: 'secondary' },
      ],
    };
  }
  
  return {
    content: "I'm here to help. You can add more forms, review your progress, ask questions, or file your return. What would you like to do?",
    agentType: 'executive',
    shouldContinue: false,
    actions: [
      { label: 'Add Form', action: 'add_form', type: 'secondary' },
      { label: 'Check Status', action: 'review_status', type: 'secondary' },
      { label: 'File Return', action: 'file', type: 'primary' },
    ],
  };
}

/**
 * Extract form name from message (e.g., "W-2", "1099-INT")
 */
function extractFormName(message: string): string | null {
  // Common form patterns
  const formPatterns = [
    /\bw-2\b/i,
    /\bw2\b/i,
    /\b1099-int\b/i,
    /\b1099int\b/i,
    /\b1099-div\b/i,
    /\b1099div\b/i,
    /\b1099-misc\b/i,
    /\b1099misc\b/i,
    /\b1099-r\b/i,
    /\b1099r\b/i,
    /\b1099-b\b/i,
    /\b1099b\b/i,
    /\b1099\b/i,
  ];
  
  const formNames: { [key: string]: string } = {
    'w-2': 'W-2',
    'w2': 'W-2',
    '1099-int': '1099-INT',
    '1099int': '1099-INT',
    '1099-div': '1099-DIV',
    '1099div': '1099-DIV',
    '1099-misc': '1099-MISC',
    '1099misc': '1099-MISC',
    '1099-r': '1099-R',
    '1099r': '1099-R',
    '1099-b': '1099-B',
    '1099b': '1099-B',
    '1099': '1099',
  };
  
  for (const pattern of formPatterns) {
    const match = message.match(pattern);
    if (match) {
      const key = match[0].toLowerCase().replace(/-/g, '');
      return formNames[key] || match[0].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Get suggestion for next steps based on state
 */
function getNextStepsSuggestion(state: any): string {
  if (state.formsAdded.length === 1) {
    return "You might also have other forms like 1099-INT for interest income or 1099-DIV for dividends.";
  }
  if (state.completionPercentage < 50) {
    return "Keep adding your tax forms to build a complete picture of your income.";
  }
  if (state.completionPercentage >= 50 && state.completionPercentage < 100) {
    return "You're making good progress! Consider reviewing deductions to maximize your refund.";
  }
  return "";
}

/**
 * Get action buttons for form-related responses
 */
function getFormActions(state: any): ActionButton[] {
  const actions: ActionButton[] = [];
  
  if (state.completionPercentage < 100) {
    actions.push({ label: 'Add Another Form', action: 'add_form', type: 'secondary' });
  }
  
  actions.push({ label: 'Check Status', action: 'review_status', type: 'secondary' });
  
  if (state.completionPercentage >= 50) {
    actions.push({ label: 'Review Deductions', action: 'optimize', type: 'secondary' });
  }
  
  return actions;
}

/**
 * Get action buttons for status review
 */
function getStatusActions(state: any): ActionButton[] {
  const actions: ActionButton[] = [];
  
  if (state.completionPercentage < 100) {
    actions.push({ label: 'Add Forms', action: 'add_form', type: 'primary' });
  }
  
  if (state.errors.length > 0) {
    actions.push({ label: 'Fix Errors', action: 'review_errors', type: 'primary' });
  }
  
  if (state.completionPercentage >= 50) {
    actions.push({ label: 'Find Deductions', action: 'optimize', type: 'secondary' });
  }
  
  if (state.completionPercentage === 100 && state.errors.length === 0) {
    actions.push({ label: 'File Return', action: 'file', type: 'primary' });
  }
  
  return actions;
}
