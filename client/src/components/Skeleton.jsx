import React from 'react';

export const Skeleton = ({ width, height, borderRadius = '4px', style }) => {
  return (
    <div
      style={{
        width: width || '100%',
        height: height || '20px',
        backgroundColor: 'var(--color-medium-grey)',
        borderRadius: borderRadius,
        animation: 'pulse 1.5s infinite ease-in-out',
        ...style
      }}
    />
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="responsive-padding" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Hero Cards */}
        <div className="card col-span-2" style={{ height: '150px', background: 'var(--color-medium-grey)' }}>
          <Skeleton width="40%" height="20px" style={{ marginBottom: '1rem' }} />
          <Skeleton width="60%" height="60px" />
        </div>
        <div className="card col-span-2" style={{ height: '150px', background: 'var(--color-medium-grey)' }}>
          <Skeleton width="40%" height="20px" style={{ marginBottom: '1rem' }} />
          <Skeleton width="60%" height="60px" />
        </div>

        {/* Charts */}
        <div className="card col-span-2" style={{ height: '400px' }}>
          <Skeleton width="30%" height="30px" style={{ marginBottom: '2rem' }} />
          <Skeleton width="100%" height="300px" />
        </div>
        <div className="card" style={{ height: '400px' }}>
          <Skeleton width="50%" height="30px" style={{ marginBottom: '2rem' }} />
          <Skeleton width="100%" height="300px" borderRadius="50%" />
        </div>
      </div>
    </div>
  );
};
