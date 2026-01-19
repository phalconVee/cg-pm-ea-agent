export type MessageRole = 'user' | 'system';

export interface SearchResult {
  title: string;
  snippet: string;
  source: string;
}

export interface JumpLink {
  label: string;
  screen: TurboTaxScreen;
  context?: string; // Additional context for the link
}

export type TurboTaxScreen = 
  | 'w2-import'
  | 'dependents'
  | 'deductions'
  | 'credits'
  | 'income'
  | 'filing-status'
  | 'review'
  | 'my-info'
  | 'federal'
  | 'state-taxes';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agentType?: AgentType;
  actions?: ActionButton[];
  monetizationSuggestion?: MonetizationSuggestion;
  searchResults?: SearchResult[];
  isStreaming?: boolean;
  statusText?: string; // For "Searching...", "Thinking..." etc.
  jumpLinks?: JumpLink[]; // Semantic jump-to-links for guided navigation
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  taxpayerState: TaxpayerState;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentType = 
  | 'executive'
  | 'explanation'
  | 'deductions'
  | 'investments'
  | 'stateTaxes'
  | 'monetization';

export type FilingStatus = 'single' | 'married';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface W2Data {
  employerName: string;
  wages: number;
  federalTaxWithheld: number;
  state: string;
  stateTaxWithheld?: number;
  socialSecurityWages?: number;
  medicareWages?: number;
}

export interface TaxpayerState {
  filingStatus: FilingStatus;
  formsAdded: string[];
  refundAmount: number;
  completionPercentage: number;
  errors: string[];
  confidenceLevel: ConfidenceLevel;
  w2Data: W2Data[]; // Store multiple W-2s
}

export interface TaxContext {
  // TODO: Add tax-related context fields
  // e.g., userInfo, taxYear, filingStatus, etc.
}

export type Intent = 'EXPLAIN' | 'ADD_FORM' | 'REVIEW_STATUS' | 'OPTIMIZE' | 'FILE';

export interface ActionButton {
  label: string;
  action: string;
  type?: 'primary' | 'secondary';
}

export interface MonetizationSuggestion {
  type: 'live_expert' | 'premium_tier' | 'audit_defense';
  message: string;
  dismissible: boolean;
}

export interface AgentResponse {
  content: string;
  agentType: AgentType;
  shouldContinue: boolean;
  nextAgent?: AgentType;
  actions?: ActionButton[];
  confidenceLevel?: ConfidenceLevel;
  suggestedAction?: string;
  monetizationSuggestion?: MonetizationSuggestion;
}
