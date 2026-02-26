import { useState, useEffect, useRef, useCallback } from 'react';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Home, Send, Wallet, CreditCard, User, Menu, Plus, ArrowDown, QrCode, Banknote } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface AppLayoutProps {
  children: React.ReactNode;
}

const StatusBar = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div data-testid="status-bar" className="bg-[#D50000] text-white h-6 px-3 flex justify-between items-center text-xs">
      <div data-testid="text-time">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center space-x-1">
        <div className="flex items-center space-x-0.5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-2 w-0.5 bg-white rounded-sm" style={{ height: `${n * 2 + 2}px` }}></div>
          ))}
        </div>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path d="M19.55 4.1l-.3 1.7a7.34 7.34 0 010 12.4l.3 1.7A9 9 0 0019.55 4.1zM15.78 7.39l-.35 1.75a3.35 3.35 0 010 5.72l.35 1.75a5 5 0 000-9.22zM8 10v4a1 1 0 001 1h2a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1z" />
            <path d="M4.26 15H3a1 1 0 01-1-1v-4a1 1 0 011-1h1.26a8 8 0 000 6z" />
          </svg>
        </div>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path d="M17 6H7a5 5 0 00-5 5v2a5 5 0 005 5h10a5 5 0 005-5v-2a5 5 0 00-5-5zm0 10H7a3 3 0 01-3-3v-2a3 3 0 013-3h10a3 3 0 013 3v2a3 3 0 01-3 3z" />
            <path d="M20.25 11.75H17v.5h3.25a.25.25 0 00.25-.25v-.25h-.25z" />
            <circle cx="7" cy="12" r="1" />
            <circle cx="10" cy="12" r="1" />
            <circle cx="13" cy="12" r="1" />
          </svg>
        </div>
        <div className="font-semibold">100%</div>
      </div>
    </div>
  );
};

const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

const BottomNavBar = () => {
  const [_, navigate] = useLocation();
  const [location] = useLocation();
  
  const isActive = (path: string) => location === path;

  const handleNavClick = (path: string) => {
    triggerHapticFeedback();
    navigate(path);
  };
  
  return (
    <div data-testid="bottom-nav" className="mobile-footer shadow-lg border-t border-gray-200">
      <div className="mobile-nav">
        <button
          data-testid="nav-home"
          onClick={() => handleNavClick('/home')}
          className={`mobile-nav-item ${isActive('/home') ? 'text-[#D50000]' : 'text-gray-500'}`}
        >
          <Home className="mobile-nav-icon" size={20} />
          <span>Inicio</span>
        </button>
        
        <button
          data-testid="nav-transfers"
          onClick={() => handleNavClick('/transfers')}
          className={`mobile-nav-item ${isActive('/transfers') ? 'text-[#D50000]' : 'text-gray-500'}`}
        >
          <Send className="mobile-nav-icon" size={20} />
          <span>Enviar</span>
        </button>
        
        <button
          data-testid="nav-qr"
          onClick={() => handleNavClick('/qr')}
          className="relative"
        >
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-[#D50000] rounded-full p-3 shadow-lg border-4 border-white">
            <QrCode className="text-white" size={22} />
          </div>
          <div className="mobile-nav-item pt-6 text-gray-500">
            <span>QR</span>
          </div>
        </button>
        
        <button
          data-testid="nav-payments"
          onClick={() => handleNavClick('/payments')}
          className={`mobile-nav-item ${isActive('/payments') ? 'text-[#D50000]' : 'text-gray-500'}`}
        >
          <CreditCard className="mobile-nav-icon" size={20} />
          <span>Pagos</span>
        </button>
        
        <button
          data-testid="nav-profile"
          onClick={() => handleNavClick('/profile')}
          className={`mobile-nav-item ${isActive('/profile') ? 'text-[#D50000]' : 'text-gray-500'}`}
        >
          <User className="mobile-nav-icon" size={20} />
          <span>Perfil</span>
        </button>
      </div>
    </div>
  );
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="page-content" className="fade-in mobile-content">
      {children}
    </div>
  );
};

const PullToRefresh = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      triggerHapticFeedback();
      queryClient.invalidateQueries().then(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing]);

  return (
    <div
      ref={containerRef}
      data-testid="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 relative flex flex-col min-h-0"
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          data-testid="pull-to-refresh-indicator"
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: isRefreshing ? 40 : pullDistance > 0 ? pullDistance : 0 }}
        >
          <div className={`w-6 h-6 border-2 border-[#D50000] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1), transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
};

const GestureDetector = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [_, navigate] = useLocation();
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isGestureActive, setIsGestureActive] = useState(false);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setIsGestureActive(true);
  };
  
  const handleTouchEnd = () => {
    setIsGestureActive(false);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isGestureActive) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;
    
    if (Math.abs(diffX) > 100 && Math.abs(diffY) < 50) {
      if (diffX > 0) {
        navigate('/home');
      }
    }
  };
  
  return (
    <div 
      ref={containerRef}
      data-testid="gesture-detector"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col min-h-0"
    >
      {children}
    </div>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const {
    isReceiveMoneyModalOpen,
    isAddMoneyModalOpen,
    isWithdrawMoneyModalOpen
  } = useStore();

  return (
    <div data-testid="app-layout" className="mobile-container">
      <StatusBar />
      
      <GestureDetector>
        <PullToRefresh>
          <PageTransition>
            {children}
          </PageTransition>
        </PullToRefresh>
      </GestureDetector>
      
      <BottomNavBar />
      
      <LoadingOverlay />
    </div>
  );
};

export default AppLayout;
