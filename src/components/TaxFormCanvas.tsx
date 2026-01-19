import React, { useState, useEffect } from 'react';
import { taxState } from '../state/taxState';
import { TaxpayerState } from '../types';
import './TaxFormCanvas.css';

interface TaxFormCanvasProps {
  onExplainClick: (fieldId: string) => void;
  onHamburgerClick?: () => void;
}

const TaxFormCanvas: React.FC<TaxFormCanvasProps> = ({ onExplainClick, onHamburgerClick }) => {
  const [taxpayerState, setTaxpayerState] = useState<TaxpayerState>(taxState.getTaxpayerState());
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    // Subscribe to tax state changes
    const unsubscribe = taxState.subscribe(() => {
      setTaxpayerState(taxState.getTaxpayerState());
    });

    return unsubscribe;
  }, []);

  // Use refund amount from state, or default to 3764
  // Handle negative amounts (balance due) by showing absolute value
  const refundAmount = taxpayerState.refundAmount !== 0 
    ? taxpayerState.refundAmount 
    : 3764;
  const formattedRefund = Math.abs(refundAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const isBalanceDue = refundAmount < 0;

  // Mock state tax due (would come from actual state tax calculation)
  const stateTaxDue = 235;
  const formattedStateDue = stateTaxDue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="tax-form-canvas">
      {/* Top Header */}
      <div className="canvas-header">
        <div className="header-left">
          {/* Hamburger menu for mobile */}
          {onHamburgerClick && (
            <button className="mobile-hamburger" onClick={onHamburgerClick} aria-label="Open menu">
              <i className="fas fa-bars"></i>
            </button>
          )}
          <div className="refund-summary">
            <span className="refund-label">
              {isBalanceDue ? 'Federal due' : 'Federal refund'}
            </span>
            <span className={`refund-amount ${isBalanceDue ? 'negative' : 'positive'}`}>
              ${formattedRefund}
            </span>
          </div>
          <div className="due-summary">
            <span className="due-label">CA due</span>
            <span className="due-amount negative">${formattedStateDue}</span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="progress-steps">
            <div className="progress-step completed">
              <div className="step-indicator"></div>
              <span>My info</span>
            </div>
            <div className="progress-step completed">
              <div className="step-indicator"></div>
              <span>Federal</span>
            </div>
            <div className="progress-step">
              <div className="step-indicator"></div>
              <span>State</span>
            </div>
            <div className="progress-step">
              <div className="step-indicator"></div>
              <span>Review</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-icons">
            <button className="icon-button" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zm0 0l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="icon-button" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 7h10l-1 6H6L5 7z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="7" cy="16" r="1.5" fill="currentColor"/>
                <circle cx="13" cy="16" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            <button className="icon-button" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2v2M4 14h12l-1-7H5l-1 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="15" cy="4" r="2" fill="currentColor"/>
              </svg>
            </button>
            <button className="live-advice-button">Live tax advice</button>
          </div>
          <div className="time-estimate">1h 35m / 1h 55m</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="canvas-content">
        <div className="refund-confirmation">
          <div className="refund-content">
            <h1 className="refund-title">
              {isBalanceDue 
                ? `Gus, you have a balance due of $${formattedRefund}`
                : `Gus, congrats on your $${formattedRefund} refund`
              }
            </h1>
            <p className="refund-subtitle">
              {isBalanceDue
                ? 'We can help you understand why and explore payment options.'
                : 'Thanks for choosing us to help you get back every dollar you deserve.'
              }
            </p>
            <button
              className="explain-refund-button"
              onClick={() => onExplainClick('refund')}
            >
              Explain this amount
            </button>
          </div>
          
          <div className="refund-illustration">
            <div className="money-stack">
              <div className="money-bill"></div>
              <div className="money-bill"></div>
              <div className="money-bill"></div>
              <div className="stack-top">
                <div className="dollar-coin">$</div>
                <div className="calculator-icon">🧮</div>
                <div className="arrow-down">↓</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed View Section */}
        <div className="detailed-view-section">
          <button
            className="detailed-view-toggle"
            onClick={() => setShowDetailedView(!showDetailedView)}
          >
            <div className="toggle-left">
              <i className="fas fa-calculator calculator-icon-small"></i>
              <span>Get a detailed view of your numbers</span>
            </div>
            <span className={`toggle-chevron ${showDetailedView ? 'expanded' : ''}`}>▼</span>
          </button>
          {showDetailedView && (
            <div className="detailed-view-content">
              <p>Detailed breakdown of your tax return will appear here...</p>
            </div>
          )}
        </div>

        {/* Payment Plan Info */}
        <div className="payment-plan-info">
          Did you know you can file and pay taxes later?{' '}
          <a href="#" className="payment-plan-link">View payment plan info</a>
        </div>

        {/* Mobile Continue Button - appears in main canvas on mobile */}
        <div className="mobile-continue-button-container">
          <button className="continue-button mobile-continue">Continue</button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="canvas-footer">
        <button className="back-button">← Back</button>
        <div className="footer-links">
          <a href="#">License Agreement</a>
          <a href="#">Privacy</a>
          <a href="#">Security</a>
          <a href="#">Cobrowse</a>
        </div>
        <button className="continue-button desktop-continue">Continue</button>
        <div className="copyright">© 2023 Intuit Inc. All rights reserved</div>
      </div>
    </div>
  );
};

export default TaxFormCanvas;
