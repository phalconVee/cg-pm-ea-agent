import React from 'react';
import { TaxpayerState } from '../types';
import './SuggestionChips.css';

interface SuggestionChipsProps {
  lastMessage: string;
  taxpayerState: TaxpayerState;
  onChipClick: (suggestion: string) => void;
  previousSuggestions?: string[];
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  lastMessage,
  taxpayerState,
  onChipClick,
  previousSuggestions = [],
}) => {
  /**
   * Generate contextual suggestion chips based on message content and taxpayer state
   */
  const generateSuggestions = (): string[] => {
    const suggestions: string[] = [];
    const message = lastMessage.toLowerCase();
    const refundAmount = taxpayerState.refundAmount !== 0 ? taxpayerState.refundAmount : 3764;
    const isBalanceDue = refundAmount < 0;
    const hasW2Data = taxpayerState.w2Data.length > 0;
    const hasPriorYearData = (taxpayerState as any).hasPriorYearData === true;

    // Priority 1: If message is about refund/balance due
    if (message.includes('refund') || message.includes('owe') || message.includes('balance') || message.includes('due')) {
      if (isBalanceDue) {
        suggestions.push('How can I reduce what I owe?');
        suggestions.push('Why is my balance due?');
      } else {
        if (hasPriorYearData && message.includes('lower')) {
          suggestions.push('Why did my refund decrease?');
        } else {
          suggestions.push('How can I increase my refund?');
        }
        if (hasPriorYearData) {
          suggestions.push('What changed from last year?');
        } else {
          suggestions.push('What affects my refund amount?');
        }
      }
    }
    // Priority 2: If prior year data is mentioned or available
    else if (message.includes('last year') || message.includes('prior year') || message.includes('previous year') || 
             (hasPriorYearData && (message.includes('change') || message.includes('different')))) {
      suggestions.push('What changed from last year?');
      suggestions.push('Why did my refund change?');
    }
    // Priority 3: If message mentions wages or income
    else if (message.includes('wage') || message.includes('income') || message.includes('salary')) {
      suggestions.push('What deductions can I claim?');
      suggestions.push('How does income affect taxes?');
    }
    // Priority 4: If message mentions withholding
    else if (message.includes('withhold') || message.includes('tax paid') || message.includes('withheld')) {
      suggestions.push('Should I adjust withholding?');
      suggestions.push('How much should I withhold?');
    }
    // Priority 5: If message mentions credits or deductions
    else if (message.includes('credit') || message.includes('deduction')) {
      suggestions.push('What other credits can I claim?');
      suggestions.push('Am I missing deductions?');
    }
    // Priority 6: If completion percentage is low
    else if (taxpayerState.completionPercentage < 50) {
      suggestions.push('What forms do I need?');
      suggestions.push('What information is missing?');
    }
    // Priority 7: If no W-2 data
    else if (!hasW2Data) {
      suggestions.push('How do I add my W-2?');
      suggestions.push('What income should I report?');
    }
    // Default suggestions if nothing matches
    else {
      if (isBalanceDue) {
        suggestions.push('How can I reduce what I owe?');
        suggestions.push('Why do I owe taxes?');
      } else {
        suggestions.push('How can I increase my refund?');
        if (hasPriorYearData) {
          suggestions.push('Compare to last year');
        } else {
          suggestions.push('What affects my refund?');
        }
      }
    }

    // Filter to ensure max 35 characters, exclude previous suggestions, and limit to 2
    const filtered = suggestions
      .filter(s => s.length <= 35)
      .filter(s => !previousSuggestions.includes(s))
      .slice(0, 2);

    // If we don't have enough after filtering, add some alternatives
    if (filtered.length < 2) {
      const alternatives: string[] = [];
      const refundAmount = taxpayerState.refundAmount !== 0 ? taxpayerState.refundAmount : 3764;
      const isBalanceDue = refundAmount < 0;
      
      if (!alternatives.some(a => previousSuggestions.includes(a))) {
        if (isBalanceDue) {
          alternatives.push('What deductions can I claim?');
          alternatives.push('How can I reduce my tax?');
        } else {
          alternatives.push('What affects my refund?');
          alternatives.push('How is my refund calculated?');
        }
      }
      
      const additional = alternatives
        .filter(a => !previousSuggestions.includes(a) && !filtered.includes(a))
        .slice(0, 2 - filtered.length);
      
      filtered.push(...additional);
    }

    return filtered.slice(0, 2);
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="suggestion-chips">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="suggestion-chip"
          onClick={() => onChipClick(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default SuggestionChips;
