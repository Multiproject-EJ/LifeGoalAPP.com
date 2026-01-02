import React from 'react';

type StatsCardProps = {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
};

/**
 * Individual stat card with animation - inspired by "Spotify Wrapped" style
 */
export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon, 
  label, 
  value, 
  color,
  delay = 0 
}) => {
  return (
    <div 
      className="stats-card"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="stats-card-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="stats-card-content">
        <div className="stats-card-value">{value}</div>
        <div className="stats-card-label">{label}</div>
      </div>
      
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stats-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }

        .stats-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stats-card-content {
          flex: 1;
          min-width: 0;
        }

        .stats-card-value {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #06b6d4, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
          margin-bottom: 0.25rem;
        }

        .stats-card-label {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
};
