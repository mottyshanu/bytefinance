import React from 'react';

export const Skeleton = ({ width, height, borderRadius = 'var(--radius-sm)', style, className }) => {
  return (
    <div
      className={className}
      style={{
        width: width || '100%',
        height: height || '20px',
        backgroundColor: 'var(--color-medium-grey)',
        borderRadius: borderRadius,
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="responsive-padding" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Stats Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card" style={{ height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '60%' }}>
                <Skeleton width="80px" height="14px" style={{ marginBottom: '0.75rem' }} />
                <Skeleton width="120px" height="36px" />
              </div>
              <Skeleton width="40px" height="40px" borderRadius="50%" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ height: '400px' }}>
          <Skeleton width="150px" height="24px" style={{ marginBottom: '2rem' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '300px', gap: '1rem', paddingBottom: '1rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} width="100%" height={`${Math.random() * 60 + 20}%`} borderRadius="4px 4px 0 0" />
            ))}
          </div>
        </div>
        <div className="card" style={{ height: '400px' }}>
          <Skeleton width="150px" height="24px" style={{ marginBottom: '2rem' }} />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <Skeleton width="250px" height="250px" borderRadius="50%" />
          </div>
        </div>
      </div>
    </div>
  );
};
