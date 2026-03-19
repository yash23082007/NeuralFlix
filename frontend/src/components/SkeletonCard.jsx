import React from 'react';

const SkeletonCard = () => (
  <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ minWidth: 0 }}>
    <div className="aspect-[2/3] skeleton rounded-xl" />
    <div className="mt-2 space-y-1.5 px-1">
      <div className="skeleton h-3 rounded w-3/4" />
      <div className="skeleton h-2 rounded w-1/2" />
    </div>
  </div>
);

export const SkeletonRow = ({ count = 8 }) => (
  <div className="mb-8">
    <div className="skeleton h-6 w-40 rounded mb-4 mx-6 md:mx-12" />
    <div className="flex gap-4 px-6 md:px-12 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 md:w-48 lg:w-52 flex-shrink-0">
          <SkeletonCard />
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonCard;
