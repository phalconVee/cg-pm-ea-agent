import { TaxpayerState } from '../types';
import { taxState } from '../state/taxState';

export type TestScenario = 
  | 'tier1-no-data'
  | 'tier2-partial-data'
  | 'tier3a-complete-no-prior'
  | 'tier3b-complete-with-prior'
  | 'balance-due';

export interface ScenarioConfig {
  name: string;
  description: string;
  taxpayerState: Partial<TaxpayerState>;
}

export const testScenarios: Record<TestScenario, ScenarioConfig> = {
  'tier1-no-data': {
    name: 'Tier 1: No Data',
    description: 'Generic guidance - no current year data available',
    taxpayerState: {
      filingStatus: 'single',
      formsAdded: [],
      refundAmount: 0,
      completionPercentage: 0,
      errors: [],
      confidenceLevel: 'low',
      w2Data: [],
    },
  },
  'tier2-partial-data': {
    name: 'Tier 2: Partial Data',
    description: 'Partial personalization - incomplete current year data',
    taxpayerState: {
      filingStatus: 'single',
      formsAdded: ['W-2'],
      refundAmount: 0, // Not calculated yet
      completionPercentage: 25,
      errors: [],
      confidenceLevel: 'low',
      w2Data: [{
        employerName: 'Acme Corp',
        wages: 50000,
        federalTaxWithheld: 5000,
        state: 'CA',
        stateTaxWithheld: 1500,
      }],
    },
  },
  'tier3a-complete-no-prior': {
    name: 'Tier 3A: Complete (No Prior Year)',
    description: 'Full personalization - complete current year, no prior year data',
    taxpayerState: {
      filingStatus: 'married',
      formsAdded: ['W-2', '1099-INT'],
      refundAmount: 3764,
      completionPercentage: 85,
      errors: [],
      confidenceLevel: 'high',
      w2Data: [
        {
          employerName: 'Tech Company Inc',
          wages: 120000,
          federalTaxWithheld: 18000,
          state: 'CA',
          stateTaxWithheld: 8000,
        },
        {
          employerName: 'Consulting LLC',
          wages: 40000,
          federalTaxWithheld: 6000,
          state: 'CA',
          stateTaxWithheld: 2500,
        },
      ],
    },
  },
  'tier3b-complete-with-prior': {
    name: 'Tier 3B: Complete (With Prior Year)',
    description: 'Full personalization - complete current year with prior year comparison',
    taxpayerState: {
      filingStatus: 'married',
      formsAdded: ['W-2', '1099-INT', '1099-DIV'],
      refundAmount: 3764,
      completionPercentage: 100,
      errors: [],
      confidenceLevel: 'high',
      w2Data: [
        {
          employerName: 'Tech Company Inc',
          wages: 160000,
          federalTaxWithheld: 22000,
          state: 'CA',
          stateTaxWithheld: 10000,
        },
      ],
      hasPriorYearData: true, // Flag to indicate prior year data exists
    } as any, // Type assertion to allow hasPriorYearData
  },
  'balance-due': {
    name: 'Balance Due Scenario',
    description: 'User owes taxes instead of getting a refund',
    taxpayerState: {
      filingStatus: 'single',
      formsAdded: ['W-2'],
      refundAmount: -1250, // Negative = balance due
      completionPercentage: 75,
      errors: [],
      confidenceLevel: 'medium',
      w2Data: [
        {
          employerName: 'Startup Inc',
          wages: 95000,
          federalTaxWithheld: 8000, // Low withholding
          state: 'CA',
          stateTaxWithheld: 3000,
        },
      ],
    },
  },
};

/**
 * Apply a test scenario to the tax state
 */
export function applyTestScenario(scenario: TestScenario): void {
  const config = testScenarios[scenario];
  if (!config) {
    console.error('Invalid test scenario:', scenario);
    return;
  }

  // Get current state
  const currentState = taxState.getTaxpayerState();
  
  // Merge scenario state with current state, preserving any custom flags
  const scenarioHasPriorYear = (config.taxpayerState as any).hasPriorYearData === true;
  const newState: TaxpayerState & { hasPriorYearData?: boolean } = {
    ...currentState,
    ...config.taxpayerState,
    // Set hasPriorYearData flag only if the scenario explicitly has it
    // Otherwise, explicitly set to false to clear it
    hasPriorYearData: scenarioHasPriorYear ? true : undefined,
  };

  // Update tax state directly (it's public)
  // Type assertion needed because hasPriorYearData is not in TaxpayerState type
  (taxState.taxpayerState as any) = newState;
  
  // Trigger update to notify listeners
  taxState.notifyListeners();
  
  console.log(`✅ Applied test scenario: ${config.name}`);
  console.log('Taxpayer state:', newState);
  console.log('Has prior year data:', (newState as any).hasPriorYearData);
}

/**
 * Get current scenario based on state
 */
export function getCurrentScenario(): TestScenario | null {
  const state = taxState.getTaxpayerState();
  
  // Check for balance due
  if (state.refundAmount < 0) {
    return 'balance-due';
  }
  
  // Check tier based on data completeness
  const hasW2Data = state.w2Data.length > 0;
  const hasRefund = state.refundAmount > 0;
  const isComplete = state.completionPercentage >= 85 && hasRefund;
  
  // Check for prior year data flag (set by Tier 3B scenario)
  const hasPriorYearData = (state as any).hasPriorYearData === true;
  
  if (!hasW2Data) {
    return 'tier1-no-data';
  } else if (!isComplete) {
    return 'tier2-partial-data';
  } else if (hasPriorYearData) {
    return 'tier3b-complete-with-prior';
  } else {
    return 'tier3a-complete-no-prior';
  }
}
