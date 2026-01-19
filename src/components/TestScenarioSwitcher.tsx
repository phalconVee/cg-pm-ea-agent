import React, { useState, useEffect } from 'react';
import { applyTestScenario, getCurrentScenario, testScenarios, TestScenario } from '../utils/testScenarios';
import { taxState } from '../state/taxState';
import './TestScenarioSwitcher.css';

const TestScenarioSwitcher: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState<TestScenario | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to tax state changes to update current scenario
    const unsubscribe = taxState.subscribe(() => {
      setCurrentScenario(getCurrentScenario());
    });

    // Set initial scenario
    setCurrentScenario(getCurrentScenario());

    return unsubscribe;
  }, []);

  const handleScenarioChange = (scenario: TestScenario) => {
    applyTestScenario(scenario);
    setCurrentScenario(scenario);
    setIsOpen(false);
  };

  return (
    <div className="test-scenario-switcher">
      <button
        className="scenario-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Test Scenario Switcher"
      >
        🧪 Test Scenarios
        {currentScenario && (
          <span className="current-scenario-badge">
            {testScenarios[currentScenario].name}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="scenario-dropdown">
          <div className="scenario-dropdown-header">
            <h3>Test Scenarios</h3>
            <button
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="scenario-list">
            {(Object.keys(testScenarios) as TestScenario[]).map((scenario) => (
              <button
                key={scenario}
                className={`scenario-option ${
                  currentScenario === scenario ? 'active' : ''
                }`}
                onClick={() => handleScenarioChange(scenario)}
              >
                <div className="scenario-name">
                  {testScenarios[scenario].name}
                </div>
                <div className="scenario-description">
                  {testScenarios[scenario].description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestScenarioSwitcher;
