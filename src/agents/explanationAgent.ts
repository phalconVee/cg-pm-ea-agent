import { AgentResponse, TaxpayerState } from '../types';
import { taxState } from '../state/taxState';

export const explanationAgent = {
  async process(
    message: string,
    taxpayerState: TaxpayerState
  ): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();
    const state = taxState.getTaxpayerState();
    
    // Explain refund changes using taxState.refundAmount
    if (
      lowerMessage.includes('refund') ||
      lowerMessage.includes('why did') && lowerMessage.includes('change') ||
      lowerMessage.includes('how much') && lowerMessage.includes('refund')
    ) {
      const refund = state.refundAmount;
      const formsCount = state.formsAdded.length;
      const w2Data = state.w2Data || [];
      
      let content = `Based on your current return, your estimated refund is $${refund.toLocaleString()}. `;
      
      if (refund === 0 && formsCount === 0) {
        content += "You haven't added any forms yet. As you add your W-2 and other income forms, we'll calculate your refund based on your withholdings and deductions.";
        return {
          content,
          agentType: 'explanation',
          shouldContinue: false,
          confidenceLevel: 'medium',
          suggestedAction: 'add_form',
        };
      }
      
      // Reference W-2 data if available
      if (w2Data.length > 0) {
        const totalWages = w2Data.reduce((sum, w2) => sum + w2.wages, 0);
        const totalWithheld = w2Data.reduce((sum, w2) => sum + w2.federalTaxWithheld, 0);
        
        content += `This is based on your W-2${w2Data.length > 1 ? 's' : ''} showing $${totalWages.toLocaleString()} in wages and $${totalWithheld.toLocaleString()} in federal tax withheld. `;
        
        if (w2Data.length === 1) {
          content += `From ${w2Data[0].employerName}, `;
        }
      }
      
      if (refund > 0) {
        content += `This reflects the income from your ${formsCount} ${formsCount === 1 ? 'form' : 'forms'} and the deductions we've identified. `;
        
        if (state.completionPercentage < 100) {
          content += `Since your return is ${state.completionPercentage}% complete, this amount may change as you add more forms or deductions.`;
        } else {
          content += `Your return is complete, so this is your final refund amount.`;
        }
      } else {
        content += `You may owe taxes or have a very small refund. This could change as you add more forms or identify additional deductions.`;
      }
      
      return {
        content,
        agentType: 'explanation',
        shouldContinue: false,
        confidenceLevel: state.completionPercentage >= 50 ? 'high' : 'medium',
        suggestedAction: state.completionPercentage < 100 ? 'add_form' : 'review_deductions',
      };
    }
    
    // Standard deduction explanation - personalized
    if (lowerMessage.includes('standard deduction') || lowerMessage.includes('itemized')) {
      const filingStatus = state.filingStatus;
      const standardAmount = filingStatus === 'married' ? '$27,700' : '$13,850';
      
      let content = `The standard deduction is a fixed amount that reduces your taxable income. For 2023, it's ${standardAmount} for ${filingStatus === 'married' ? 'married filing jointly' : 'single'} filers. `;
      
      if (state.formsAdded.length > 0) {
        content += `Since you've added ${state.formsAdded.length} ${state.formsAdded.length === 1 ? 'form' : 'forms'}, we're using the standard deduction for now. `;
      }
      
      content += `You can choose between the standard deduction or itemizing your deductions—whichever gives you a larger benefit. Itemizing makes sense if your qualifying expenses exceed the standard deduction amount.`;
      
      return {
        content,
        agentType: 'explanation',
        shouldContinue: false,
        confidenceLevel: 'high',
        suggestedAction: 'review_deductions',
      };
    }
    
    // Tax bracket explanation
    if (lowerMessage.includes('tax bracket') || lowerMessage.includes('marginal')) {
      let content = "Tax brackets determine the rate at which your income is taxed. The U.S. uses a progressive tax system, meaning different portions of your income are taxed at different rates. ";
      
      if (state.refundAmount > 0) {
        content += `Based on your current return showing a $${state.refundAmount.toLocaleString()} refund, you're likely in a situation where your withholdings exceeded your tax liability. `;
      }
      
      content += "Your marginal tax rate is the rate on your highest dollar of income, while your effective tax rate is the average rate you pay on all your income.";
      
      return {
        content,
        agentType: 'explanation',
        shouldContinue: false,
        confidenceLevel: 'high',
      };
    }
    
    // Completion percentage explanation
    if (lowerMessage.includes('complete') || lowerMessage.includes('progress') || lowerMessage.includes('percentage')) {
      const completion = state.completionPercentage;
      let content = `Your return is currently ${completion}% complete. `;
      
      if (completion < 50) {
        content += `You still need to add more forms. Most people need at least a W-2 from their employer, and potentially 1099 forms for other income.`;
      } else if (completion < 100) {
        content += `You're making good progress! You've added ${state.formsAdded.length} ${state.formsAdded.length === 1 ? 'form' : 'forms'}. `;
        if (state.errors.length > 0) {
          content += `However, you have ${state.errors.length} ${state.errors.length === 1 ? 'error' : 'errors'} that need attention.`;
        } else {
          content += `Consider reviewing deductions to maximize your refund.`;
        }
      } else {
        content += `Great job! Your return is complete and ready to file.`;
      }
      
      return {
        content,
        agentType: 'explanation',
        shouldContinue: false,
        confidenceLevel: 'high',
        suggestedAction: completion < 100 ? 'add_form' : 'file',
      };
    }

    // Default explanation response - personalized
    const formsCount = state.formsAdded.length;
    let content = "I'd be happy to explain that. ";
    
    if (formsCount > 0) {
      content += `I can see you've added ${formsCount} ${formsCount === 1 ? 'form' : 'forms'} to your return. `;
    }
    
    content += "Could you provide a bit more detail about what specific tax concept or situation you'd like me to clarify?";
    
    return {
      content,
      agentType: 'explanation',
      shouldContinue: false,
      confidenceLevel: 'medium',
    };
  },
};
