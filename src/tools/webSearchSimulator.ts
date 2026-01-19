/**
 * Web Search Simulator
 * 
 * Simulates web search for tax-related queries.
 * Returns mocked results with realistic latency.
 */

export interface SearchResult {
  title: string;
  snippet: string;
  source: string;
}

const SEARCH_RESULTS: Record<string, SearchResult[]> = {
  'standard deduction': [
    {
      title: 'Standard Deduction | Internal Revenue Service',
      snippet: 'For 2023, the standard deduction is $13,850 for single filers and $27,700 for married filing jointly. The standard deduction reduces your taxable income.',
      source: 'IRS.gov',
    },
    {
      title: 'Understanding Standard vs. Itemized Deductions',
      snippet: 'You can choose between the standard deduction or itemizing. Most taxpayers use the standard deduction, which is simpler and often larger.',
      source: 'TurboTax Help Center',
    },
  ],
  'refund delayed': [
    {
      title: 'Where\'s My Refund? | Internal Revenue Service',
      snippet: 'Most refunds are issued within 21 days of e-filing. If it\'s been longer, check your refund status online or contact the IRS.',
      source: 'IRS.gov',
    },
    {
      title: 'Why Is My Tax Refund Delayed?',
      snippet: 'Common reasons for delays include errors on your return, incomplete information, or identity verification requirements.',
      source: 'TurboTax Help Center',
    },
  ],
  '1099-div': [
    {
      title: 'Form 1099-DIV: Dividends and Distributions',
      snippet: 'Form 1099-DIV reports dividends and distributions you received during the tax year. You must report this income on your tax return.',
      source: 'IRS.gov',
    },
    {
      title: 'How to Report Dividend Income',
      snippet: 'Dividend income is generally taxable. Qualified dividends are taxed at preferential rates, while ordinary dividends are taxed as regular income.',
      source: 'TurboTax Help Center',
    },
  ],
  'capital gains tax': [
    {
      title: 'Capital Gains and Losses | Internal Revenue Service',
      snippet: 'Capital gains are profits from selling investments. Long-term gains (held over 1 year) are taxed at 0%, 15%, or 20% depending on your income.',
      source: 'IRS.gov',
    },
    {
      title: 'Understanding Capital Gains Tax Rates',
      snippet: 'Short-term capital gains are taxed as ordinary income. Long-term gains receive preferential tax rates for most taxpayers.',
      source: 'TurboTax Help Center',
    },
  ],
  'state tax differences': [
    {
      title: 'State Income Tax Rates by State',
      snippet: 'State tax rates vary significantly. Some states have no income tax, while others use flat or progressive rates. You must file in each state where you earned income.',
      source: 'TurboTax Help Center',
    },
    {
      title: 'Multi-State Tax Filing Requirements',
      snippet: 'If you work in multiple states, you may need to file returns in each state. Some states have reciprocity agreements to prevent double taxation.',
      source: 'IRS.gov',
    },
  ],
};

/**
 * Simulate web search with latency
 */
export async function simulateWebSearch(query: string): Promise<SearchResult[]> {
  // Simulate network latency (500-1200ms)
  const latency = Math.floor(Math.random() * 700) + 500;
  await new Promise(resolve => setTimeout(resolve, latency));

  // Normalize query for matching
  const normalizedQuery = query.toLowerCase().trim();

  // Try to find exact match first
  for (const [key, results] of Object.entries(SEARCH_RESULTS)) {
    if (normalizedQuery.includes(key)) {
      return results;
    }
  }

  // Try partial matches
  for (const [key, results] of Object.entries(SEARCH_RESULTS)) {
    const keyWords = key.split(' ');
    const queryWords = normalizedQuery.split(' ');
    
    if (keyWords.some(word => queryWords.includes(word))) {
      return results;
    }
  }

  // Default results for unmatched queries
  return [
    {
      title: 'Tax Information | Internal Revenue Service',
      snippet: 'For the most up-to-date tax information, visit the official IRS website or consult with a tax professional.',
      source: 'IRS.gov',
    },
    {
      title: 'TurboTax Help Center',
      snippet: 'Find answers to common tax questions and get help with your tax return.',
      source: 'TurboTax Help Center',
    },
  ];
}

/**
 * Check if a query would benefit from web search
 */
export function shouldUseWebSearch(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Questions about current rules or changes
  const searchTriggers = [
    'what is',
    'what\'s',
    'how much is',
    'did the irs',
    'has the irs',
    'latest',
    'current',
    '2023',
    '2024',
    'standard deduction',
    'refund',
    'capital gains',
    'state tax',
    '1099',
  ];

  return searchTriggers.some(trigger => lowerMessage.includes(trigger));
}
