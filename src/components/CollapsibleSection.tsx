import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
}

export default function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false,
  icon 
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="collapsible-section">
      <button
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="title">
          {icon && <i className={icon}></i>}
          <span>{title}</span>
        </div>
        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} collapsible-icon`}></i>
      </button>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
} 