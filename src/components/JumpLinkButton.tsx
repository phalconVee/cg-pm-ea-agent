import React from 'react';
import { JumpLink } from '../types';
import { getScreenDisplayName } from '../utils/jumpLinkGenerator';
import './JumpLinkButton.css';

interface JumpLinkButtonProps {
  jumpLink: JumpLink;
  onClick: (jumpLink: JumpLink) => void;
}

const JumpLinkButton: React.FC<JumpLinkButtonProps> = ({ jumpLink, onClick }) => {
  return (
    <button
      className="jump-link-button"
      onClick={() => onClick(jumpLink)}
      aria-label={`Navigate to ${getScreenDisplayName(jumpLink.screen)}`}
    >
      <span className="jump-link-icon">
        <i className="fas fa-external-link-alt"></i>
      </span>
      <span className="jump-link-label">{jumpLink.label}</span>
    </button>
  );
};

export default JumpLinkButton;
