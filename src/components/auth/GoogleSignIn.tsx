import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            }
          ) => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

export function GoogleSignIn() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const login = useAuthStore(s => s.login);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load Google Identity Services script
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.onload = initGoogle;
    } else {
      initGoogle();
    }

    function initGoogle() {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          login(response.credential);
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'medium',
        text: 'signin_with',
        shape: 'pill',
      });
    }
  }, [login]);

  // Don't render on localhost if not configured for local dev
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!GOOGLE_CLIENT_ID) return null;
  if (isLocalhost) {
    return (
      <div className="text-xs px-3 py-1.5 rounded-full opacity-50" style={{ color: '#999' }}>
        Sign in available on production
      </div>
    );
  }

  return <div ref={buttonRef} />;
}
