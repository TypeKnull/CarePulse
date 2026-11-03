import { createContext, useContext, useState, useCallback } from 'react';
import {
  getActiveSessionUser,
  loginUser as apiLoginUser,
  registerUser as apiRegisterUser,
  logoutUser as apiLogoutUser,
  getCurrentUserProfile as apiGetCurrentUserProfile,
  saveOnboardingProfile as apiSaveOnboardingProfile,
  saveUserAssessmentRecord as apiSaveUserAssessmentRecord,
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getActiveSessionUser());
  const isLoading = false;

  const login = async ({ email, password, isDemoMode = false }) => {
    const result = await apiLoginUser({ email, password, isDemoMode });
    setUser(result.user);
    return result;
  };

  const register = async ({ fullName, email, password }) => {
    const result = await apiRegisterUser({ fullName, email, password });
    setUser(result.user);
    return result;
  };

  const logout = useCallback(() => {
    apiLogoutUser();
    setUser(null);
  }, []);

  const updateProfile = async (onboardingData) => {
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    const updated = await apiSaveOnboardingProfile(user.id, onboardingData);
    setUser(updated);
    return updated;
  };

  const refreshProfile = useCallback(async () => {
    const refreshed = await apiGetCurrentUserProfile();
    if (refreshed) setUser(refreshed);
    return refreshed;
  }, []);

  const saveAssessment = (assessment) => {
    if (!user) return;
    const updated = apiSaveUserAssessmentRecord(user.id, assessment);
    setUser(updated);
    return updated;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isDemoMode: !!user?.isDemo,
    hasCompletedOnboarding: !!user?.hasCompletedOnboarding,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    saveAssessment,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
