import { MonetizationSuggestion, Intent, TaxpayerState } from '../types';
import { taxState } from '../state/taxState';

/**
 * Passive Monetization Agent
 * 
 * Responsibilities:
 * - Observe user messages, intent, taxState complexity, confidenceLevel
 * - Decide if an upsell opportunity exists
 * - Return optional, dismissible suggestions
 * - Never speak directly - suggestions are injected by Executive Agent
 */
export const monetizationAgent = {
  /**
   * Check for monetization opportunity
   * Returns a suggestion if appropriate, null otherwise
   */
  async checkOpportunity(
    userMessage: string,
    intent: Intent | null,
    taxStateParam: TaxpayerState
  ): Promise<MonetizationSuggestion | null> {
    const state = taxStateParam;
    const interactionCount = taxState.getInteractionCount();
    
    // Rule: Never trigger on first interaction
    if (interactionCount <= 1) {
      return null;
    }
    
    // Rule: Never interrupt filing
    if (intent === 'FILE' || state.completionPercentage === 100) {
      return null;
    }
    
    // Calculate complexity signals
    const complexity = calculateComplexity(state);
    const shouldSuggest = complexity === 'high' || state.confidenceLevel === 'low';
    
    // Rule: Only suggest when complexity is high OR confidence is low
    if (!shouldSuggest) {
      return null;
    }
    
    // Determine which upsell to suggest
    const suggestion = selectUpsell(state, complexity, intent);
    
    return suggestion;
  },
};

/**
 * Calculate complexity level based on state signals
 */
function calculateComplexity(state: TaxpayerState): 'high' | 'medium' | 'low' {
  let complexityScore = 0;
  
  // Multiple forms indicate complexity
  if (state.formsAdded.length > 3) complexityScore += 2;
  else if (state.formsAdded.length > 1) complexityScore += 1;
  
  // Multiple errors indicate complexity
  if (state.errors.length > 2) complexityScore += 2;
  else if (state.errors.length > 0) complexityScore += 1;
  
  // High completion but low refund might indicate missed opportunities
  if (state.completionPercentage > 70 && state.refundAmount < 500) {
    complexityScore += 1;
  }
  
  // Investment forms indicate complexity
  const hasInvestmentForms = state.formsAdded.some(form => 
    form.includes('1099') || form.includes('1099')
  );
  if (hasInvestmentForms) complexityScore += 1;
  
  if (complexityScore >= 3) return 'high';
  if (complexityScore >= 1) return 'medium';
  return 'low';
}

/**
 * Select appropriate upsell based on state and context
 */
function selectUpsell(
  state: TaxpayerState,
  complexity: 'high' | 'medium' | 'low',
  intent: Intent | null
): MonetizationSuggestion | null {
  // Live Expert Help - best for high complexity or low confidence with errors
  if (complexity === 'high' || (state.confidenceLevel === 'low' && state.errors.length > 0)) {
    return {
      type: 'live_expert',
      message: "Need help? Connect with a live tax expert who can guide you through your specific situation and answer your questions in real-time.",
      dismissible: true,
    };
  }
  
  // Premium Tier - best for medium complexity or when optimizing
  if (complexity === 'medium' || intent === 'OPTIMIZE') {
    return {
      type: 'premium_tier',
      message: "Upgrade to Premium for advanced deduction finder, priority support, and maximum refund guarantee.",
      dismissible: true,
    };
  }
  
  // Audit Defense - best for low confidence situations
  if (state.confidenceLevel === 'low' && state.completionPercentage > 30) {
    return {
      type: 'audit_defense',
      message: "Get peace of mind with Audit Defense. If you're audited, we'll provide expert representation at no additional cost.",
      dismissible: true,
    };
  }
  
  // Default: Premium tier for low confidence
  if (state.confidenceLevel === 'low') {
    return {
      type: 'premium_tier',
      message: "Upgrade to Premium for step-by-step guidance, expert support, and help maximizing your deductions.",
      dismissible: true,
    };
  }
  
  return null;
}
