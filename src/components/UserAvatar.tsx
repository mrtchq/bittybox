import React, { useState } from 'react';
import { User } from 'lucide-react';
import { auth } from '../lib/firebase';
import { BittyUser } from '../types';

export interface UserAvatarProps {
  user?: BittyUser | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatusDot?: boolean;
  isOnline?: boolean;
  altText?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showStatusDot = false,
  isOnline = true,
  altText,
}) => {
  const [imgError, setImgError] = useState(false);

  // Determine potential photo URL sources
  const firebasePhoto = auth.currentUser?.photoURL;
  const userAvatar = user?.avatar;
  
  // Check if avatar string is a URL
  const isAvatarUrl = (str?: string): boolean => {
    if (!str) return false;
    return (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('data:') ||
      str.startsWith('blob:')
    );
  };

  const photoUrl = (isAvatarUrl(userAvatar) ? userAvatar : null) || 
                   (isAvatarUrl(firebasePhoto || undefined) ? firebasePhoto : null);

  // Compute initials fallback
  const getInitials = (): string => {
    if (user?.displayName && user.displayName.trim().length > 0) {
      const parts = user.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user?.email && user.email.includes('@')) {
      const namePart = user.email.split('@')[0];
      return namePart.slice(0, 2).toUpperCase();
    }
    return 'BB';
  };

  // Dimensions based on size
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg',
  }[size];

  const dotSizeClasses = {
    xs: 'w-1.5 h-1.5 bottom-0 right-0',
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5',
    xl: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
  }[size];

  const displayName = user?.displayName || user?.email || 'User';

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-indigo-600 p-[2px] shadow-[0_0_15px_rgba(0,242,255,0.35)] transition-transform duration-200 hover:scale-105 overflow-hidden`}
      >
        <div className="w-full h-full bg-[#070214] rounded-[10px] overflow-hidden flex items-center justify-center font-cyber font-bold text-cyan-200 select-none">
          {photoUrl && !imgError ? (
            <img
              src={photoUrl}
              alt={altText || displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-[10px]"
            />
          ) : userAvatar && !isAvatarUrl(userAvatar) && userAvatar.length <= 4 && !/^[a-zA-Z0-9]+$/.test(userAvatar) ? (
            // Emoji or symbol avatar (e.g. ⚡, 🚀, 📦)
            <span className="leading-none">{userAvatar}</span>
          ) : (
            // Stylized Initials Fallback with Gradient
            <div className="w-full h-full bg-gradient-to-tr from-[#0b1b2b] via-[#102942] to-[#173b5e] flex items-center justify-center text-cyan-300 font-mono tracking-wider font-bold">
              {getInitials()}
            </div>
          )}
        </div>
      </div>

      {/* Online / Active Status Dot */}
      {showStatusDot && (
        <span
          className={`absolute ${dotSizeClasses} rounded-full ring-2 ring-[#0a0316] ${
            isOnline
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
              : 'bg-slate-500'
          }`}
        />
      )}
    </div>
  );
};
