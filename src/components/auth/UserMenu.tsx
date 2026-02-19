import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { GoogleSignIn } from './GoogleSignIn';
import { THEME } from '../../styles/loveLetterStyles';

interface UserMenuProps {
  onViewStats?: () => void;
  onViewLeaderboard?: () => void;
}

export function UserMenu({ onViewStats, onViewLeaderboard }: UserMenuProps) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <GoogleSignIn />
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full px-2 py-1 transition-all"
        style={{
          background: 'rgba(15, 15, 25, 0.8)',
          border: `1px solid ${open ? THEME.gold : 'rgba(255,255,255,0.1)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: THEME.goldDark, color: '#fff' }}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-slate-300 max-w-[100px] truncate hidden sm:block">
          {user.displayName.split(' ')[0]}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            {onViewStats && (
              <button
                onClick={() => { onViewStats(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                My Stats
              </button>
            )}
            {onViewLeaderboard && (
              <button
                onClick={() => { onViewLeaderboard(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Leaderboard
              </button>
            )}
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
