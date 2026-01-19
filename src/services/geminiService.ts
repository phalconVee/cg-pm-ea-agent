import { TaxpayerState } from '../types';

interface InteractionInput {
  role?: 'user' | 'model';
  content: string | Array<{ text?: string; [key: string]: any }>;
}

interface InteractionRequest {
  model: string;
  input: string | InteractionInput[];
  previous_interaction_id?: string;
  system_instruction?: string;
  generation_config?: {
    temperature?: number;
    top_p?: number;
    max_output_tokens?: number;
  };
}

interface InteractionResponse {
  id: string;
  model: string;
  input: InteractionInput[];
  outputs: Array<{
    text?: string;
    content?: Array<{ text?: string }>;
    [key: string]: any;
  }>;
  status: string;
}

export class GeminiService {
  private apiKey: string;
  private modelName = 'gemini-2.5-flash';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  private currentInteractionId: string | null = null;
  private isFirstTurn: boolean = true;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    if (!this.apiKey) {
      console.error('❌ Gemini API key is empty!');
      console.error('Please create a .env file in the project root with:');
      console.error('VITE_GEMINI_API_KEY=your_api_key_here');
      console.error('Then restart your dev server.');
    } else {
      console.log('✅ Gemini API key loaded (length:', this.apiKey.length, ')');
    }
  }

  /**
   * Reset conversation history (for new conversations)
   */
  resetConversation(): void {
    this.currentInteractionId = null;
    this.isFirstTurn = true;
  }

  /**
   * Determine personalization tier based on data availability
   */
  private determinePersonalizationTier(taxpayerState: TaxpayerState): {
    tier: 'Tier1' | 'Tier2' | 'Tier3A' | 'Tier3B';
    hasCurrentYearData: boolean;
    hasCompleteData: boolean;
    hasPriorYearData: boolean;
  } {
    const hasW2Data = taxpayerState.w2Data.length > 0;
    const hasForms = taxpayerState.formsAdded.length > 0;
    // Check if refund/balance is calculated (can be positive or negative)
    const hasRefundAmount = taxpayerState.refundAmount !== 0;
    
    // Check if we have current year data
    const hasCurrentYearData = hasW2Data || hasForms;
    
    // Check if data is complete (has W-2 and refund/balance calculated)
    const hasCompleteData = hasW2Data && hasRefundAmount && taxpayerState.completionPercentage >= 50;
    
    // Check for prior year data - for Tier 3B scenario, we'll check if it's explicitly set
    // In test scenarios, Tier 3B will have prior year data
    // For now, we'll determine this based on scenario or can be enhanced with actual prior year data check
    const hasPriorYearData = (taxpayerState as any).hasPriorYearData === true || 
                            (taxpayerState.completionPercentage === 100 && hasCompleteData && taxpayerState.formsAdded.length >= 3);
    
    if (!hasCurrentYearData) {
      return { tier: 'Tier1', hasCurrentYearData: false, hasCompleteData: false, hasPriorYearData: false };
    } else if (!hasCompleteData) {
      return { tier: 'Tier2', hasCurrentYearData: true, hasCompleteData: false, hasPriorYearData: false };
    } else if (hasPriorYearData) {
      return { tier: 'Tier3B', hasCurrentYearData: true, hasCompleteData: true, hasPriorYearData: true };
    } else {
      return { tier: 'Tier3A', hasCurrentYearData: true, hasCompleteData: true, hasPriorYearData: false };
    }
  }

  /**
   * Build context as JSON from taxpayer state
   */
  private buildContextJSON(taxpayerState: TaxpayerState): object {
    // Use actual refund amount (can be negative for balance due)
    const refundAmount = taxpayerState.refundAmount !== 0 ? taxpayerState.refundAmount : 3764;
    const totalWages = taxpayerState.w2Data.reduce((sum, w2) => sum + w2.wages, 0);
    const totalFederalWithheld = taxpayerState.w2Data.reduce((sum, w2) => sum + w2.federalTaxWithheld, 0);
    const isBalanceDue = refundAmount < 0;
    
    const tierInfo = this.determinePersonalizationTier(taxpayerState);
    const hasPriorYearData = tierInfo.hasPriorYearData;
    
    // Build prior year data if available (for Tier 3B)
    let priorYearData = null;
    if (hasPriorYearData) {
      // Generate prior year data based on current year (with some variation for comparison)
      const priorYearWages = totalWages * 0.9; // 10% lower than current year
      const priorYearRefund = refundAmount * 1.2; // 20% higher than current year
      const priorYearWithheld = totalFederalWithheld * 0.95; // Slightly lower
      
      priorYearData = {
        tax_year: '2024',
        filing_status: taxpayerState.filingStatus,
        refund_amount: Math.round(priorYearRefund),
        total_wages: Math.round(priorYearWages),
        total_federal_withheld: Math.round(priorYearWithheld),
        w2_forms: taxpayerState.w2Data.map((w2, index) => ({
          form_number: index + 1,
          employer_name: w2.employerName,
          wages: Math.round(w2.wages * 0.9), // 10% lower
          federal_tax_withheld: Math.round(w2.federalTaxWithheld * 0.95),
        })),
        forms_added: taxpayerState.formsAdded.filter(f => f !== '1099-DIV'), // One less form
        child_credits: 6000, // Higher credits in prior year
      };
    }
    
    const context = {
      personalization_tier: tierInfo.tier,
      filing_status: taxpayerState.filingStatus,
      current_year_data: {
        tax_year: '2025',
        refund_amount: refundAmount,
        balance_due: isBalanceDue ? Math.abs(refundAmount) : 0,
        is_balance_due: isBalanceDue,
        completion_percentage: taxpayerState.completionPercentage,
        w2_forms: taxpayerState.w2Data.map((w2, index) => ({
          form_number: index + 1,
          employer_name: w2.employerName,
          wages: w2.wages,
          federal_tax_withheld: w2.federalTaxWithheld,
          state: w2.state,
          state_tax_withheld: w2.stateTaxWithheld || null,
        })),
        total_wages: totalWages,
        total_federal_withheld: totalFederalWithheld,
        forms_added: taxpayerState.formsAdded,
        errors: taxpayerState.errors,
        child_credits: 2500, // Current year credits
      },
      prior_year_data: priorYearData,
      data_completeness: {
        has_current_year_data: tierInfo.hasCurrentYearData,
        has_complete_data: tierInfo.hasCompleteData,
        has_prior_year_data: tierInfo.hasPriorYearData,
        missing_fields: this.getMissingFields(taxpayerState),
      },
    };
    
    return context;
  }

  /**
   * Get missing fields based on current data
   */
  private getMissingFields(taxpayerState: TaxpayerState): string[] {
    const missing: string[] = [];
    
    if (taxpayerState.w2Data.length === 0) {
      missing.push('W-2 forms');
    }
    if (taxpayerState.refundAmount === 0) {
      missing.push('refund calculation');
    }
    if (taxpayerState.completionPercentage < 50) {
      missing.push('additional tax information');
    }
    
    return missing;
  }

  /**
   * Build master prompt with JSON context and tier-specific instructions
   */
  private buildMasterPrompt(userQuestion: string, taxpayerState: TaxpayerState): string {
    const contextJSON = this.buildContextJSON(taxpayerState);
    const tierInfo = this.determinePersonalizationTier(taxpayerState);
    
    let tierInstructions = '';
    
    switch (tierInfo.tier) {
      case 'Tier1':
        tierInstructions = `TIER 1 - GENERIC GUIDANCE (No Current Year Data):
- Provide accurate general information about tax concepts
- Explain requirements and eligibility criteria
- DO NOT reference specific dollar amounts or outcomes for this user
- DO NOT pretend to know their specific tax situation
- Suggest completing relevant sections for personalized guidance
- Be helpful but honest about data limitations`;
        break;
        
      case 'Tier2':
        tierInstructions = `TIER 2 - PARTIAL PERSONALIZATION (Incomplete Current Year Data):
- Use available data to provide directional guidance
- Explicitly acknowledge what data is missing
- Provide ranges or estimates where appropriate
- Guide customer to complete missing information
- Be clear about what you know vs. what you don't know`;
        break;
        
      case 'Tier3A':
        tierInstructions = `TIER 3A - FULL PERSONALIZATION (Complete Current Year Data, No Prior Year):
- Use all available current year data for specific guidance
- Provide precise dollar amounts and calculations
- Explain how their specific numbers were calculated
- Acknowledge that prior year comparisons aren't available
- Be confident and specific in your explanations`;
        break;
        
      case 'Tier3B':
        tierInstructions = `TIER 3B - FULL PERSONALIZATION (Complete Current Year + Prior Year Data):
- You MUST use the prior_year_data from the JSON context to provide year-over-year (YOY) comparisons
- Compare current year amounts to prior year amounts (wages, refund, tax withheld, etc.)
- Explain WHY the refund/balance changed from prior year (e.g., "Your refund is $3,764 this year, compared to $4,517 last year. This decrease is primarily due to...")
- Highlight specific differences: income changes, withholding changes, credit changes
- Provide detailed analysis of trends and what drove the changes
- Be confident and specific with actual numbers from both years
- Always reference prior year data when explaining current year results`;
        break;
    }
    
    // Determine response length based on prior year data availability
    const hasPriorYearData = tierInfo.hasPriorYearData;
    const responseLengthGuidance = hasPriorYearData 
      ? 'Provide a detailed explanation (4-6 sentences) with year-over-year comparisons and analysis'
      : tierInfo.tier === 'Tier3A' || tierInfo.tier === 'Tier3B'
        ? 'Provide a thorough explanation (3-5 sentences) with specific calculations and details'
        : 'Be direct and concise (2-4 sentences unless more detail is needed)';
    
    const masterPrompt = `You are a TurboTax assistant. Answer the user's question directly and concisely. Do NOT start with greetings like "Hey there" or "That's a great question" - go straight to the point.

CONTEXT (JSON):
${JSON.stringify(contextJSON, null, 2)}

PERSONALIZATION TIER INSTRUCTIONS:
${tierInstructions}

USER QUESTION:
${userQuestion}

RESPONSE GUIDELINES:
- ${responseLengthGuidance}
- Start immediately with the answer, no greetings
- Use the context JSON to provide accurate, tier-appropriate responses
- If in Tier 1 or 2, acknowledge data limitations honestly
- If in Tier 3, provide specific numbers and calculations
- If prior_year_data exists in the JSON context, you MUST include year-over-year comparisons:
  * Compare current year refund/balance to prior year
  * Compare current year wages to prior year wages
  * Compare current year tax withheld to prior year
  * Explain what changed and why (e.g., "Your income increased from $X to $Y, which...")
  * Reference specific numbers from both years
- Be helpful, accurate, and conversational`;

    return masterPrompt;
  }

  /**
   * Send message to Gemini Interactions API with streaming support
   */
  async sendMessage(
    userMessage: string,
    taxpayerState: TaxpayerState,
    onChunk: (chunk: string, isComplete: boolean) => void
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
    }
    
    try {
      // Build the master prompt with JSON context on first turn
      let messageToSend = userMessage;
      
      if (this.isFirstTurn) {
        messageToSend = this.buildMasterPrompt(userMessage, taxpayerState);
        this.isFirstTurn = false;
      }

      // Prepare request using Interactions API format
      const requestBody: InteractionRequest = {
        model: this.modelName,
        input: messageToSend,
        previous_interaction_id: this.currentInteractionId || undefined,
        system_instruction: 'You are a TurboTax assistant. Answer questions directly and concisely. Start immediately with the answer - no greetings. Be accurate, helpful, and brief.',
        generation_config: {
          temperature: 0.7,
          max_output_tokens: 2048,
        },
      };

      console.log('📤 Sending request to Gemini Interactions API');
      console.log('URL:', this.baseUrl);
      console.log('Model:', this.modelName);
      console.log('Previous interaction ID:', this.currentInteractionId || 'none (first turn)');

      // Make request to Interactions API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          console.error('❌ Error response:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
            errorDetails = errorData.error.status || '';
            
            // Provide helpful error messages
            if (response.status === 400) {
              errorMessage = `Invalid request: ${errorMessage}. Please check the request format.`;
            } else if (response.status === 401) {
              errorMessage = `Authentication failed: ${errorMessage}. Please check your API key is correct and not expired.`;
            } else if (response.status === 403) {
              errorMessage = `Permission denied: ${errorMessage}. Please ensure the Generative Language API is enabled in your Google Cloud project.`;
            } else if (response.status === 429) {
              errorMessage = `Rate limit exceeded: ${errorMessage}. Please try again later.`;
            }
          } else {
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('❌ Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
      }

      // Parse response
      const responseData: InteractionResponse = await response.json();
      console.log('✅ Response received:', responseData);

      // Store interaction ID for stateful conversations
      if (responseData.id) {
        this.currentInteractionId = responseData.id;
      }

      // Extract text from outputs
      let fullResponse = '';
      
      if (responseData.outputs && responseData.outputs.length > 0) {
        // Get the last output (most recent response)
        const lastOutput = responseData.outputs[responseData.outputs.length - 1];
        
        // Handle different output formats
        if (lastOutput.text) {
          fullResponse = lastOutput.text;
        } else if (lastOutput.content && Array.isArray(lastOutput.content)) {
          // Extract text from content array
          for (const contentItem of lastOutput.content) {
            if (contentItem.text) {
              fullResponse += contentItem.text;
            }
          }
        } else if (typeof lastOutput === 'string') {
          fullResponse = lastOutput;
        }
      }

      if (!fullResponse) {
        console.warn('⚠️ No text found in response outputs:', responseData.outputs);
        fullResponse = 'I received a response but could not extract the text. Please try again.';
      }

      // Simulate streaming by sending the complete response
      // (Interactions API doesn't support streaming in the same way, but we can simulate it)
      onChunk(fullResponse, true);

      return fullResponse;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

// Create singleton instance
// Note: API key should be stored in environment variable
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found in environment variables. Please set VITE_GEMINI_API_KEY');
}

export const geminiService = new GeminiService(GEMINI_API_KEY);
