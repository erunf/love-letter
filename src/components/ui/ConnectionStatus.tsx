import { useOnlineStore } from '../../store/onlineStore';

export function ConnectionStatus() {
  const isConnected = useOnlineStore(s => s.isConnected);
  const roomCode = useOnlineStore(s => s.roomCode);
  const error = useOnlineStore(s => s.error);

  if (error) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-sm py-1.5 px-4">
        {error}
      </div>
    );
  }

  // Only show "Reconnecting" if we have an active room but lost connection
  if (roomCode && !isConnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-sm py-1.5 px-4 animate-pulse">
        Reconnecting...
      </div>
    );
  }

  return null;
}
