import React, { useState } from 'react';

const sizeClasses = {
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-xl',
};

export default function UserAvatar({ user, size = 'md', onClick }) {
  const [imgError, setImgError] = useState(false);
  const initials = (user?.name?.split(' ') || [])
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');

  const photo = !imgError && (user?.profilePicture || user?.avatarUrl);

  return (
    <div
      className={`rounded-full bg-purple-200 flex items-center justify-center font-bold overflow-hidden ${sizeClasses[size] || sizeClasses.md} cursor-pointer`}
      onClick={onClick}
      title={user?.name}
      style={{ userSelect: 'none' }}
    >
      {photo ? (
        <img
          src={photo}
          alt={user?.name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white">
          {initials || '?'}
        </span>
      )}
    </div>
  );
}


