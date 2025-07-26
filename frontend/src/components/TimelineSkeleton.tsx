import React from 'react';

interface TimelineSkeletonProps {
  count?: number;
}

export const TimelineSkeleton: React.FC<TimelineSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="timeline-skeleton">
      {/* Header skeleton */}
      <div className="skeleton-header">
        <div className="skeleton skeleton-text skeleton-title"></div>
        <div className="skeleton skeleton-text skeleton-subtitle"></div>
      </div>

      {/* Filters skeleton */}
      <div className="skeleton-filters">
        <div className="skeleton skeleton-filter"></div>
        <div className="skeleton skeleton-filter"></div>
        <div className="skeleton skeleton-filter"></div>
      </div>

      {/* Timeline groups skeleton */}
      <div className="skeleton-timeline">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="skeleton-group">
            <div className="skeleton-group-header">
              <div className="skeleton skeleton-text skeleton-date"></div>
              <div className="skeleton skeleton-badge"></div>
            </div>
            
            <div className="skeleton-records">
              {[...Array(Math.floor(Math.random() * 3) + 1)].map((_, j) => (
                <div key={j} className="skeleton-record">
                  <div className="skeleton skeleton-icon"></div>
                  <div className="skeleton-record-content">
                    <div className="skeleton skeleton-text skeleton-record-title"></div>
                    <div className="skeleton skeleton-text skeleton-record-data"></div>
                    <div className="skeleton skeleton-text skeleton-record-time"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton loading styles
const skeletonStyles = `
.timeline-skeleton {
  padding: 1rem 2rem;
  background: var(--bg-primary);
  min-height: 100vh;
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--border-radius-sm);
}

.skeleton-header {
  margin-bottom: 2rem;
  text-align: center;
}

.skeleton-title {
  height: 2rem;
  width: 200px;
  margin: 0 auto 0.5rem auto;
}

.skeleton-subtitle {
  height: 1rem;
  width: 300px;
  margin: 0 auto;
}

.skeleton-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.skeleton-filter {
  height: 2.5rem;
  width: 120px;
}

.skeleton-timeline {
  max-width: 800px;
  margin: 0 auto;
}

.skeleton-group {
  margin-bottom: 2rem;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.skeleton-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.skeleton-date {
  height: 1.5rem;
  width: 150px;
}

.skeleton-badge {
  height: 1.5rem;
  width: 80px;
  border-radius: 12px;
}

.skeleton-records {
  padding: 1rem;
}

.skeleton-record {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--border-radius-sm);
}

.skeleton-record:last-child {
  margin-bottom: 0;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-record-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-record-title {
  height: 1.25rem;
  width: 60%;
}

.skeleton-record-data {
  height: 1rem;
  width: 80%;
}

.skeleton-record-time {
  height: 0.875rem;
  width: 40%;
}

.skeleton-text {
  height: 1rem;
}

/* Responsive skeleton */
@media (max-width: 768px) {
  .timeline-skeleton {
    padding: 1rem;
  }
  
  .skeleton-filters {
    flex-direction: column;
    align-items: center;
  }
  
  .skeleton-filter {
    width: 100%;
    max-width: 200px;
  }
  
  .skeleton-group-header {
    padding: 1rem;
  }
  
  .skeleton-record {
    padding: 0.75rem;
  }
  
  .skeleton-record-title {
    width: 70%;
  }
  
  .skeleton-record-data {
    width: 85%;
  }
}

/* Animation timing variations for more realistic effect */
.skeleton-group:nth-child(2n) .skeleton {
  animation-delay: -0.5s;
}

.skeleton-group:nth-child(3n) .skeleton {
  animation-delay: -1s;
}

.skeleton-record:nth-child(2n) .skeleton {
  animation-delay: -0.3s;
}

/* Pulse effect for icons */
.skeleton-icon {
  animation: skeleton-loading 1.5s infinite, pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Fade in effect when skeleton appears */
.timeline-skeleton {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .skeleton-icon,
  .timeline-skeleton {
    animation: none !important;
  }
  
  .skeleton {
    background: var(--bg-tertiary);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .skeleton {
    background: var(--text-muted);
    opacity: 0.3;
  }
}
`;

// Inject skeleton styles
if (typeof document !== 'undefined') {
  const existingStyles = document.getElementById('timeline-skeleton-styles');
  if (!existingStyles) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'timeline-skeleton-styles';
    styleSheet.textContent = skeletonStyles;
    document.head.appendChild(styleSheet);
  }
}

export default TimelineSkeleton;