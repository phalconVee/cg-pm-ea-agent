/**
 * W-2 Data Generator
 * 
 * Generates mock W-2 data for simulation purposes.
 * No OCR - just hardcoded realistic values.
 */

export interface W2Data {
  employerName: string;
  wages: number;
  federalTaxWithheld: number;
  state: string;
  stateTaxWithheld?: number;
  socialSecurityWages?: number;
  medicareWages?: number;
}

const EMPLOYER_NAMES = [
  'Acme Corporation',
  'Tech Solutions Inc.',
  'Global Industries',
  'Metro Services LLC',
  'Premier Consulting Group',
  'Digital Innovations',
  'City Public Schools',
  'Regional Hospital',
  'Financial Services Co.',
  'Manufacturing Partners',
];

const STATES = [
  'California',
  'Texas',
  'New York',
  'Florida',
  'Illinois',
  'Pennsylvania',
  'Ohio',
  'Georgia',
  'North Carolina',
  'Michigan',
];

/**
 * Generate mock W-2 data
 */
export function generateW2Data(previousW2Count: number = 0): W2Data {
  // Vary wages based on how many W-2s already exist
  const baseWages = 45000 + (previousW2Count * 15000);
  const wages = baseWages + Math.floor(Math.random() * 20000);
  
  // Federal tax withheld (roughly 15-25% of wages)
  const federalTaxWithheld = Math.floor(wages * (0.15 + Math.random() * 0.1));
  
  // State tax withheld (roughly 3-7% of wages, if applicable)
  const stateTaxWithheld = Math.floor(wages * (0.03 + Math.random() * 0.04));
  
  return {
    employerName: EMPLOYER_NAMES[Math.floor(Math.random() * EMPLOYER_NAMES.length)],
    wages,
    federalTaxWithheld,
    state: STATES[Math.floor(Math.random() * STATES.length)],
    stateTaxWithheld,
    socialSecurityWages: wages,
    medicareWages: wages,
  };
}

/**
 * Calculate estimated refund based on W-2 data
 */
export function calculateRefundFromW2(w2Data: W2Data): number {
  // Simple calculation: assume standard deduction and basic tax brackets
  // This is a mock calculation for demo purposes
  
  const standardDeduction = 13850; // Single filer 2023
  const taxableIncome = Math.max(0, w2Data.wages - standardDeduction);
  
  // Simplified tax calculation (mock)
  let taxOwed = 0;
  if (taxableIncome > 0) {
    if (taxableIncome <= 11000) {
      taxOwed = taxableIncome * 0.10;
    } else if (taxableIncome <= 44725) {
      taxOwed = 1100 + (taxableIncome - 11000) * 0.12;
    } else if (taxableIncome <= 95350) {
      taxOwed = 5147 + (taxableIncome - 44725) * 0.22;
    } else {
      taxOwed = 16290 + (taxableIncome - 95350) * 0.24;
    }
  }
  
  // Refund = tax withheld - tax owed
  const refund = w2Data.federalTaxWithheld - taxOwed;
  
  return Math.max(0, refund);
}
