import React, { useState } from 'react';
import { TurboTaxScreen } from '../types';
import { getScreenDisplayName } from '../utils/jumpLinkGenerator';
import './NavigationScreen.css';

interface NavigationScreenProps {
  screen: TurboTaxScreen;
  context?: string;
  onBack: () => void;
  onComplete: (screen: TurboTaxScreen, data?: any) => void;
}

const NavigationScreen: React.FC<NavigationScreenProps> = ({
  screen,
  context,
  onBack,
  onComplete,
}) => {
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = () => {
    setIsComplete(true);
    // Simulate data update
    setTimeout(() => {
      onComplete(screen, { completed: true, timestamp: new Date() });
    }, 500);
  };

  const getScreenContent = () => {
    switch (screen) {
      case 'w2-import':
        return {
          title: 'W-2 Import',
          description: 'Add your W-2 information to calculate your refund accurately.',
          fields: ['Employer Name', 'Wages', 'Federal Tax Withheld', 'State Tax Withheld'],
        };
      case 'dependents':
        return {
          title: 'Dependents',
          description: 'Add information about your dependents to claim eligible credits.',
          fields: ['Dependent Name', 'Date of Birth', 'Relationship', 'SSN'],
        };
      case 'deductions':
        return {
          title: 'Deductions',
          description: 'Review and add itemized deductions to reduce your taxable income.',
          fields: ['Charitable Contributions', 'Medical Expenses', 'State and Local Taxes'],
        };
      case 'credits':
        return {
          title: 'Credits',
          description: 'Check for available tax credits that can reduce your tax liability.',
          fields: ['Earned Income Credit', 'Child Tax Credit', 'Education Credits'],
        };
      case 'filing-status':
        return {
          title: 'Filing Status',
          description: 'Update your filing status to ensure accurate tax calculations.',
          fields: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'],
        };
      case 'income':
        return {
          title: 'Income Information',
          description: 'Review all sources of income reported on your tax return.',
          fields: ['W-2 Income', '1099 Income', 'Other Income'],
        };
      case 'my-info':
        return {
          title: 'My Info',
          description: 'Update your personal information and contact details.',
          fields: ['Full Name', 'Address', 'SSN', 'Date of Birth'],
        };
      case 'federal':
        return {
          title: 'Federal Taxes',
          description: 'Review your federal tax information and calculations.',
          fields: ['Federal Income', 'Federal Deductions', 'Federal Credits', 'Federal Tax'],
        };
      case 'state-taxes':
        return {
          title: 'State Taxes',
          description: 'Review your state tax information and calculations.',
          fields: ['State Income', 'State Deductions', 'State Credits', 'State Tax'],
        };
      case 'review':
        return {
          title: 'Review',
          description: 'Review all information before filing your tax return.',
          fields: ['Personal Information', 'Income', 'Deductions', 'Credits', 'Tax Calculation'],
        };
      default:
        return {
          title: getScreenDisplayName(screen),
          description: 'Complete this section to continue.',
          fields: [],
        };
    }
  };

  const content = getScreenContent();

  return (
    <div className="navigation-screen">
      <div className="navigation-screen-header">
        <button className="navigation-back-button" onClick={onBack}>
          <i className="fas fa-arrow-left"></i>
          <span>Back to explanation</span>
        </button>
        <h2 className="navigation-screen-title">{content.title}</h2>
      </div>
      <div className="navigation-screen-content">
        <p className="navigation-screen-description">{content.description}</p>
        {context && (
          <div className="navigation-context-badge">
            <i className="fas fa-info-circle"></i>
            <span>Context: {context}</span>
          </div>
        )}
        <div className="navigation-screen-fields">
          {content.fields.map((field, index) => (
            <div key={index} className="navigation-field">
              <label className="navigation-field-label">{field}</label>
              <input
                type="text"
                className="navigation-field-input"
                placeholder={`Enter ${field.toLowerCase()}`}
                disabled={isComplete}
              />
            </div>
          ))}
        </div>
        {!isComplete && (
          <button className="navigation-complete-button" onClick={handleComplete}>
            <i className="fas fa-check"></i>
            <span>Mark as Complete</span>
          </button>
        )}
        {isComplete && (
          <div className="navigation-complete-message">
            <i className="fas fa-check-circle"></i>
            <span>Section completed! Returning to explanation...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationScreen;
