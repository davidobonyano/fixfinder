import React, { useState } from 'react';
import { resolveImageUrl } from '../utils/api';

const sizeClasses = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-lg',
};

export default function UserAvatar({ user, size = 'md', onClick, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initials = (user?.name?.split(' ') || [])
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');

  const photo = !imgError && resolveImageUrl(user?.profilePicture || user?.avatarUrl);

  return (
    <div
      className={`rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm ${sizeClasses[size] || sizeClasses.md} ${onClick ? 'cursor-pointer hover:border-trust transition-all' : ''} ${className}`}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
      title={user?.name}
      style={{ userSelect: 'none' }}
    >
      {photo ? (
        <img
          src={photo}
          alt={user?.name || 'Avatar'}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-stone-400 dark:text-stone-500 font-tight tracking-widest uppercase">
          {initials || '?'}
        </span>
      )}
    </div>
  );
}
