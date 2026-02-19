import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  show: boolean;
}

export function Toast({ message, show }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
