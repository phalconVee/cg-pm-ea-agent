import { AgentResponse, TaxpayerState } from '../types';

export const stateTaxesAgent = {
  async process(
    message: string,
    taxStateParam: TaxpayerState
  ): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();
    const state = taxStateParam;
    
    // Reference state-level complexity abstractly
    const complexityLevel = getStateComplexity(state);
    
    // State income tax filing
    if (lowerMessage.includes('state income') || lowerMessage.includes('file state')) {
      let content = "Most states require you to file a state income tax return if you earned income in that state. ";
      
      if (complexityLevel === 'high') {
        content += "Given your current situation, state tax filing can be particularly complex. ";
      } else if (complexityLevel === 'medium') {
        content += "State tax requirements can vary, and your situation may require attention to state-specific rules. ";
      }
      
      content += "You'll need to file in each state where you had income, though some states have reciprocity agreements. ";
      content += "State tax rates and rules vary significantly—some states have flat rates, while others use progressive brackets. ";
      content += "Some states, like Florida and Texas, have no state income tax.";
      
      return {
        content,
        agentType: 'stateTaxes',
        shouldContinue: false,
        confidenceLevel: complexityLevel === 'high' ? 'medium' : 'high',
        suggestedAction: 'review_state_requirements',
      };
    }
    
    // SALT deduction
    if (lowerMessage.includes('salt') || lowerMessage.includes('state and local')) {
      const filingStatus = state.filingStatus;
      const saltCap = filingStatus === 'married' ? '$10,000' : '$10,000';
      
      let content = `The State and Local Tax (SALT) deduction allows you to deduct state and local income, sales, and property taxes if you itemize. However, there's a ${saltCap} cap on this deduction. `;
      
      if (state.completionPercentage > 50) {
        content += `Since your return is ${state.completionPercentage}% complete, you may want to consider whether itemizing makes sense for your situation. `;
      }
      
      content += "This includes state income taxes, local income taxes, and property taxes on real estate.";
      
      return {
        content,
        agentType: 'stateTaxes',
        shouldContinue: false,
        confidenceLevel: state.completionPercentage > 50 ? 'high' : 'medium',
        suggestedAction: 'review_itemization',
      };
    }
    
    // Multi-state filing
    if (lowerMessage.includes('multi-state') || lowerMessage.includes('work in different state') || lowerMessage.includes('multiple states')) {
      let content = "If you work in multiple states, you may need to file tax returns in each state where you earned income. ";
      
      if (complexityLevel === 'high') {
        content += "This is one of the more complex tax situations, as each state has its own rules, rates, and filing requirements. ";
        content += "You'll need to carefully track income earned in each state and understand how they handle non-resident taxation. ";
      } else {
        content += "States have different rules about how they tax non-residents. ";
      }
      
      content += "Some states have reciprocity agreements that prevent double taxation. ";
      content += "You'll typically get a credit on your home state return for taxes paid to other states.";
      
      return {
        content,
        agentType: 'stateTaxes',
        shouldContinue: false,
        confidenceLevel: complexityLevel === 'high' ? 'medium' : 'high',
        suggestedAction: 'review_multi_state',
      };
    }

    // Default state taxes response - reference complexity
    let content = "I can help you with state and local tax questions. ";
    
    if (complexityLevel === 'high') {
      content += "State taxes can be quite complex, especially with varying rules across different states. ";
    }
    
    content += "This includes state income tax filing requirements, the SALT deduction, multi-state filing situations, and state-specific tax rules. ";
    content += "What state tax question do you have?";
    
    return {
      content,
      agentType: 'stateTaxes',
      shouldContinue: false,
      confidenceLevel: complexityLevel === 'high' ? 'medium' : 'high',
      suggestedAction: 'review_state_taxes',
    };
  },
};

/**
 * Determine state tax complexity based on taxpayer state
 */
function getStateComplexity(state: TaxpayerState): 'high' | 'medium' | 'low' {
  // Higher complexity if:
  // - Multiple forms (might indicate multiple income sources)
  // - High completion but low refund (might indicate complex situation)
  // - Errors present (might indicate complexity)
  
  if (state.formsAdded.length > 3) {
    return 'high';
  }
  
  if (state.completionPercentage > 70 && state.refundAmount < 500) {
    return 'high';
  }
  
  if (state.errors.length > 1) {
    return 'high';
  }
  
  if (state.formsAdded.length > 1) {
    return 'medium';
  }
  
  return 'low';
}
