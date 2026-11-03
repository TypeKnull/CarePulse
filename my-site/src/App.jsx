import { AuthProvider } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { PublicLandingView } from './views/PublicLandingView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { OnboardingView } from './views/OnboardingView';
import { WorkspaceView } from './views/WorkspaceView';
import './App.css';

function AppRouter() {
  const { currentPath } = useNavigation();

  if (currentPath === '/login') {
    return (
      <PublicLayout>
        <LoginView />
      </PublicLayout>
    );
  }

  if (currentPath === '/register') {
    return (
      <PublicLayout>
        <RegisterView />
      </PublicLayout>
    );
  }

  if (currentPath === '/onboarding') {
    return (
      <PublicLayout>
        <OnboardingView />
      </PublicLayout>
    );
  }

  if (currentPath.startsWith('/app')) {
    return <WorkspaceView />;
  }

  return (
    <PublicLayout>
      <PublicLandingView />
    </PublicLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppRouter />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
