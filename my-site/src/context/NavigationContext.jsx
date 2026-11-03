import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { isAuthenticated, hasCompletedOnboarding, isLoading: isAuthLoading } = useAuth();
  
  // Read initial path from window.location.pathname or fallback to '/'
  const getInitialPath = () => {
    const path = window.location.pathname;
    return path && path !== '' ? path : '/';
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath);

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to browser popstate (back / forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route protection rules
  useEffect(() => {
    if (isAuthLoading) return;

    const isAppRoute = currentPath.startsWith('/app');
    const isAuthRoute = currentPath === '/login' || currentPath === '/register';

    const timer = setTimeout(() => {
      if (isAppRoute && !isAuthenticated) {
        navigate('/login', { replace: true });
      } else if (isAuthenticated && isAuthRoute) {
        if (!hasCompletedOnboarding) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/app/dashboard', { replace: true });
        }
      } else if (isAuthenticated && !hasCompletedOnboarding && isAppRoute) {
        navigate('/onboarding', { replace: true });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [currentPath, isAuthenticated, hasCompletedOnboarding, isAuthLoading, navigate]);

  const value = {
    currentPath,
    navigate,
    isAppRoute: currentPath.startsWith('/app'),
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
