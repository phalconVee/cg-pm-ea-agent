import { AgentResponse, TaxpayerState } from '../types';
import { taxState } from '../state/taxState';

export const deductionsAgent = {
  async process(
    message: string,
    taxStateParam: TaxpayerState
  ): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();
    const state = taxStateParam;
    
    // Suggest missing deductions based on state
    const suggestedDeductions = getSuggestedDeductions(state);
    
    // Home office deduction
    if (lowerMessage.includes('home office') || lowerMessage.includes('remote work')) {
      const confidence = state.formsAdded.includes('W-2') ? 'high' : 'medium';
      return {
        content: "The home office deduction allows you to deduct expenses for the business use of your home. To qualify, you must use part of your home exclusively and regularly as your principal place of business. You can deduct a portion of your mortgage interest, property taxes, utilities, and other home expenses based on the percentage of your home used for business.",
        agentType: 'deductions',
        shouldContinue: false,
        confidenceLevel: confidence,
        suggestedAction: 'add_home_office_deduction',
      };
    }
    
    // Charitable contributions
    if (lowerMessage.includes('charitable') || lowerMessage.includes('donation')) {
      return {
        content: "Charitable contributions can be deducted if you itemize. You can deduct donations to qualified charitable organizations, including cash, property, and vehicle donations. Keep receipts and documentation for all charitable contributions. For donations over $250, you'll need a written acknowledgment from the charity.",
        agentType: 'deductions',
        shouldContinue: false,
        confidenceLevel: 'high',
        suggestedAction: 'add_charitable_deduction',
      };
    }
    
    // Medical expenses
    if (lowerMessage.includes('medical') || lowerMessage.includes('health')) {
      return {
        content: "Medical and dental expenses can be deducted if you itemize and they exceed 7.5% of your adjusted gross income. This includes payments for doctors, dentists, hospitals, prescription medications, and certain medical equipment. Health insurance premiums may also qualify if paid with after-tax dollars.",
        agentType: 'deductions',
        shouldContinue: false,
        confidenceLevel: 'high',
        suggestedAction: 'add_medical_deduction',
      };
    }
    
    // Suggest a missing deduction
    if (suggestedDeductions.length > 0 && !lowerMessage.includes('already')) {
      const suggestion = suggestedDeductions[0];
      const currentRefund = state.refundAmount;
      const estimatedIncrease = Math.floor(currentRefund * 0.1 + 200); // Simple estimate
      
      let content = `I noticed you might be missing a common deduction: ${suggestion.name}. `;
      content += suggestion.description;
      
      if (currentRefund > 0) {
        content += ` Adding this could potentially increase your refund by approximately $${estimatedIncrease.toLocaleString()}. `;
      }
      
      content += `Would you like to add this deduction?`;
      
      return {
        content,
        agentType: 'deductions',
        shouldContinue: false,
        confidenceLevel: suggestion.confidence,
        suggestedAction: suggestion.action,
      };
    }

    // Default deductions response - personalized
    let content = "I can help you identify deductions that might apply to your situation. ";
    
    if (state.formsAdded.length > 0) {
      content += `I see you've added ${state.formsAdded.length} ${state.formsAdded.length === 1 ? 'form' : 'forms'}. `;
    }
    
    content += "Common deductions include mortgage interest, state and local taxes, charitable contributions, medical expenses, and business expenses. What type of expenses are you wondering about?";
    
    return {
      content,
      agentType: 'deductions',
      shouldContinue: false,
      confidenceLevel: state.formsAdded.length > 0 ? 'medium' : 'low',
      suggestedAction: 'review_deductions',
    };
  },
};

/**
 * Get suggested deductions based on taxpayer state
 */
function getSuggestedDeductions(state: TaxpayerState): Array<{
  name: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  action: string;
}> {
  const suggestions: Array<{
    name: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    action: string;
  }> = [];
  
  // Suggest student loan interest if they have forms but no mention of it
  if (state.formsAdded.length > 0 && state.completionPercentage < 80) {
    suggestions.push({
      name: 'Student Loan Interest',
      description: 'You can deduct up to $2,500 in student loan interest paid during the year, even if you don\'t itemize. This is an above-the-line deduction that reduces your adjusted gross income.',
      confidence: 'medium',
      action: 'add_student_loan_deduction',
    });
  }
  
  // Suggest charitable contributions if refund is low
  if (state.refundAmount < 500 && state.completionPercentage > 30) {
    suggestions.push({
      name: 'Charitable Contributions',
      description: 'If you made donations to qualified charities, you may be able to deduct them. This includes cash donations, goods, and even vehicle donations. You\'ll need receipts for donations over $250.',
      confidence: 'medium',
      action: 'add_charitable_deduction',
    });
  }
  
  // Suggest medical expenses if completion is high but refund is low
  if (state.completionPercentage > 60 && state.refundAmount < 1000) {
    suggestions.push({
      name: 'Medical Expenses',
      description: 'Medical and dental expenses that exceed 7.5% of your adjusted gross income can be deducted if you itemize. This includes doctor visits, prescriptions, and medical equipment.',
      confidence: 'low',
      action: 'add_medical_deduction',
    });
  }
  
  return suggestions;
}
