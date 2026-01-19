import { AgentResponse, TaxpayerState } from '../types';

export const investmentsAgent = {
  async process(
    message: string,
    taxStateParam: TaxpayerState
  ): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();
    const state = taxStateParam;
    
    // React if no 1099-DIV is present but user mentions investments
    const has1099Div = state.formsAdded.some(form => 
      form.toLowerCase().includes('1099-div') || form.toLowerCase().includes('1099div')
    );
    const has1099Int = state.formsAdded.some(form => 
      form.toLowerCase().includes('1099-int') || form.toLowerCase().includes('1099int')
    );
    
    // Check for missing investment forms
    if (
      (lowerMessage.includes('dividend') || lowerMessage.includes('investment') || lowerMessage.includes('stock')) &&
      !has1099Div &&
      state.formsAdded.length > 0
    ) {
      let content = "I notice you're asking about investments or dividends, but I don't see a 1099-DIV form in your return yet. ";
      content += "If you received dividends from stocks, mutual funds, or ETFs, you should receive a Form 1099-DIV from your broker or financial institution. ";
      content += "This form reports your dividend income, which is generally taxable. ";
      content += "Would you like to add a 1099-DIV form?";
      
      return {
        content,
        agentType: 'investments',
        shouldContinue: false,
        confidenceLevel: 'high',
        suggestedAction: 'add_form:1099-DIV',
      };
    }
    
    // Capital gains
    if (lowerMessage.includes('capital gain') || lowerMessage.includes('sell stock') || lowerMessage.includes('sold')) {
      const has1099B = state.formsAdded.some(form => 
        form.toLowerCase().includes('1099-b') || form.toLowerCase().includes('1099b')
      );
      
      let content = "Capital gains are profits from selling investments. They're classified as short-term (held one year or less, taxed as ordinary income) or long-term (held more than one year, taxed at preferential rates: 0%, 15%, or 20% depending on your income). ";
      
      if (!has1099B && state.formsAdded.length > 0) {
        content += "If you sold stocks or other investments, you should receive a Form 1099-B from your broker. ";
      }
      
      content += "You can offset gains with capital losses, and you can carry forward unused losses to future years.";
      
      return {
        content,
        agentType: 'investments',
        shouldContinue: false,
        confidenceLevel: has1099B ? 'high' : 'medium',
        suggestedAction: !has1099B ? 'add_form:1099-B' : undefined,
      };
    }
    
    // Dividends and interest
    if (lowerMessage.includes('dividend') || lowerMessage.includes('interest')) {
      let content = "Dividends and interest income are generally taxable. Qualified dividends are taxed at the same preferential rates as long-term capital gains, while ordinary dividends are taxed as regular income. ";
      content += "Interest from savings accounts, bonds, and CDs is typically taxed as ordinary income. ";
      
      if (!has1099Div && !has1099Int) {
        content += "You'll receive Form 1099-DIV for dividends or 1099-INT for interest from your financial institutions. ";
        if (state.formsAdded.length > 0) {
          content += "I don't see either of these forms in your return yet—do you have them?";
        }
      } else {
        const forms = [];
        if (has1099Div) forms.push('1099-DIV');
        if (has1099Int) forms.push('1099-INT');
        content += `I see you've already added ${forms.join(' and ')}.`;
      }
      
      return {
        content,
        agentType: 'investments',
        shouldContinue: false,
        confidenceLevel: (has1099Div || has1099Int) ? 'high' : 'medium',
        suggestedAction: (!has1099Div && !has1099Int) ? 'add_form:1099-DIV' : undefined,
      };
    }
    
    // Retirement accounts
    if (lowerMessage.includes('401k') || lowerMessage.includes('ira') || lowerMessage.includes('retirement')) {
      return {
        content: "Contributions to traditional 401(k)s and IRAs are typically tax-deductible, reducing your taxable income for the year. Withdrawals in retirement are taxed as ordinary income. Roth 401(k) and Roth IRA contributions are made with after-tax dollars, but qualified withdrawals in retirement are tax-free. There are annual contribution limits and income restrictions for IRAs.",
        agentType: 'investments',
        shouldContinue: false,
        confidenceLevel: 'high',
      };
    }

    // Default investments response - check for missing forms
    let content = "I can help you understand the tax implications of your investments. ";
    
    if (state.formsAdded.length > 0 && !has1099Div && !has1099Int) {
      content += "I notice you haven't added any investment-related forms yet. If you have investment income, you might need to add 1099-DIV (dividends), 1099-INT (interest), or 1099-B (capital gains) forms. ";
    }
    
    content += "What specific investment tax question do you have?";
    
    return {
      content,
      agentType: 'investments',
      shouldContinue: false,
      confidenceLevel: (has1099Div || has1099Int) ? 'high' : 'medium',
      suggestedAction: (!has1099Div && !has1099Int && state.formsAdded.length > 0) ? 'add_form:1099-DIV' : undefined,
    };
  },
};
