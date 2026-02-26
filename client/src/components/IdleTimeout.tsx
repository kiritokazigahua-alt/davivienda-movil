import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const IDLE_TIMEOUT = 25 * 60 * 1000;
const WARNING_BEFORE = 5 * 60 * 1000;

export const IdleTimeout = () => {
  const { isAuthenticated, logout, user } = useStore();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [, setLocation] = useLocation();
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.isAdmin === 1;

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await logout();
    setLocation('/');
  }, [clearAllTimers, logout, setLocation]);

  const resetTimers = useCallback(() => {
    if (!isAuthenticated || isAdmin) return;
    lastActivityRef.current = Date.now();
    clearAllTimers();
    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      const remaining = Math.ceil(WARNING_BEFORE / 1000);
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - WARNING_BEFORE);

    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT);
  }, [isAuthenticated, isAdmin, clearAllTimers, handleLogout]);

  const handleContinue = useCallback(async () => {
    setShowWarning(false);
    try {
      const res = await fetch('/api/auth/session-status', { credentials: 'include' });
      const data = await res.json();
      if (!data.active) {
        handleLogout();
        return;
      }
    } catch {
      handleLogout();
      return;
    }
    resetTimers();
  }, [resetTimers, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    
    const throttledReset = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!showWarning) resetTimers();
      }, 5000);
    };

    events.forEach(event => document.addEventListener(event, throttledReset, { passive: true }));
    resetTimers();

    return () => {
      events.forEach(event => document.removeEventListener(event, throttledReset));
      clearAllTimers();
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [isAuthenticated, isAdmin, resetTimers, clearAllTimers, showWarning]);

  if (!isAuthenticated || isAdmin) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent data-testid="idle-timeout-dialog" className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Sesión a punto de expirar
          </DialogTitle>
          <DialogDescription>
            Por su seguridad, su sesión se cerrará automáticamente por inactividad.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-6">
          <div data-testid="text-countdown" className="text-4xl font-bold text-amber-600 tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            data-testid="button-logout-now"
            variant="outline"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
          <Button
            data-testid="button-continue-session"
            className="bg-[#D50000] hover:bg-[#B30000]"
            onClick={handleContinue}
          >
            Continuar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
