import { JumpLink, TurboTaxScreen, TaxpayerState } from '../types';

/**
 * Generate contextual jump links based on message content and taxpayer state
 */
export function generateJumpLinks(
  messageContent: string,
  taxpayerState: TaxpayerState
): JumpLink[] {
  const links: JumpLink[] = [];
  const content = messageContent.toLowerCase();
  const hasW2Data = taxpayerState.w2Data.length > 0;
  const hasPriorYearData = (taxpayerState as any).hasPriorYearData === true;

  // Missing W-2 data
  if (content.includes('w-2') || content.includes('w2') || content.includes('wage') || content.includes('income')) {
    if (!hasW2Data) {
      links.push({
        label: 'Add your W-2',
        screen: 'w2-import',
        context: 'w2-missing'
      });
    } else {
      links.push({
        label: 'View your W-2 details',
        screen: 'w2-import',
        context: 'w2-review'
      });
    }
  }

  // Dependents
  if (content.includes('dependent') || content.includes('child') || content.includes('qualifying')) {
    links.push({
      label: 'Add or edit dependents',
      screen: 'dependents',
      context: 'dependents-missing'
    });
  }

  // Deductions
  if (content.includes('deduction') || content.includes('itemize') || content.includes('charitable')) {
    links.push({
      label: 'Review your deductions',
      screen: 'deductions',
      context: 'deductions-review'
    });
  }

  // Credits
  if (content.includes('credit') || content.includes('earned income') || content.includes('child tax')) {
    links.push({
      label: 'Check available credits',
      screen: 'credits',
      context: 'credits-review'
    });
  }

  // Filing status
  if (content.includes('filing status') || content.includes('married') || content.includes('single')) {
    links.push({
      label: 'Update filing status',
      screen: 'filing-status',
      context: 'filing-status-review'
    });
  }

  // Income information
  if (content.includes('income') && !content.includes('w-2') && !content.includes('w2')) {
    links.push({
      label: 'Review income information',
      screen: 'income',
      context: 'income-review'
    });
  }

  // My Info
  if (content.includes('personal information') || content.includes('name') || content.includes('address') || content.includes('ssn')) {
    links.push({
      label: 'Update personal information',
      screen: 'my-info',
      context: 'my-info-review'
    });
  }

  // Federal section
  if (content.includes('federal') || content.includes('federal tax')) {
    links.push({
      label: 'Go to Federal section',
      screen: 'federal',
      context: 'federal-review'
    });
  }

  // State taxes
  if (content.includes('state') || content.includes('state tax') || content.includes('california')) {
    links.push({
      label: 'Review state taxes',
      screen: 'state-taxes',
      context: 'state-review'
    });
  }

  // Review section
  if (content.includes('review') || content.includes('verify') || content.includes('check')) {
    links.push({
      label: 'Go to Review section',
      screen: 'review',
      context: 'review-section'
    });
  }

  // If no specific links found but data is incomplete, always show at least one link
  if (links.length === 0) {
    if (!hasW2Data) {
      links.push({
        label: 'Add your W-2',
        screen: 'w2-import',
        context: 'w2-missing'
      });
    } else if (taxpayerState.completionPercentage < 50) {
      links.push({
        label: 'Complete your return',
        screen: 'review',
        context: 'completion-needed'
      });
    } else {
      // Default: show review link if nothing else matches
      links.push({
        label: 'Review your return',
        screen: 'review',
        context: 'review-section'
      });
    }
  }

  // Return only the first (highest confidence) link
  return links.slice(0, 1);
}

/**
 * Get screen display name
 */
export function getScreenDisplayName(screen: TurboTaxScreen): string {
  const screenNames: Record<TurboTaxScreen, string> = {
    'w2-import': 'W-2 Import',
    'dependents': 'Dependents',
    'deductions': 'Deductions',
    'credits': 'Credits',
    'income': 'Income',
    'filing-status': 'Filing Status',
    'review': 'Review',
    'my-info': 'My Info',
    'federal': 'Federal',
    'state-taxes': 'State Taxes'
  };
  return screenNames[screen] || screen;
}
