import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  getPatientDashboardData,
  recordPatientVitals,
  recordPatientLabResult,
  recordPatientLifestyle,
  updatePatientRecommendation,
  generatePatientRecommendations,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { HealthOverview } from './HealthOverview';
import { BiometricMatrix } from './BiometricMatrix';
import { RiskIntelligence } from './RiskIntelligence';
import { HealthTrendChart } from './HealthTrendChart';
import { HealthTimeline } from './HealthTimeline';
import { RecommendationsPreview } from './RecommendationsPreview';
import { UpcomingCare } from './UpcomingCare';
import { QuickActions } from './QuickActions';
import { ShieldCheckIcon } from '../Icons';
import { DashboardRecordForm } from './DashboardRecordForm';

async function getDashboardWithRecommendations(user) {
  const data = await getPatientDashboardData(user);
  if (!data.isRealBackend || !user?.id) return data;

  try {
    await generatePatientRecommendations(user.id);
    return await getPatientDashboardData(user);
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw error;
    return { ...data, recommendationGenerationError: error.message };
  }
}

export function PatientDashboard({
  onNavigateToMLStudio,
  onNavigateToRecords,
  onNavigateToDoctorPortal,
}) {
  const { user, logout } = useAuth();
  const { navigate } = useNavigation();
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardUserId, setDashboardUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [recordMode, setRecordMode] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getDashboardWithRecommendations(user)
      .then((data) => {
        if (isMounted) {
          setDashboardError(null);
          setDashboardData(data);
          setDashboardUserId(user?.id);
          setIsLoading(false);
          if (data.recommendationGenerationError) {
            setNotification({ type: 'info', message: `Recommendations could not be refreshed: ${data.recommendationGenerationError}` });
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err.status === 401) {
            logout();
            setDashboardData(null);
          } else if (err.status === 403) {
            setDashboardData(null);
            setNotification({ type: 'info', message: err.message });
            setDashboardError(err.message);
          } else {
            setDashboardError(err.message || 'Dashboard data could not be loaded.');
          }
          if (err.status === 401) setDashboardError(err.message);
          setDashboardUserId(user?.id);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, logout, retryCount]);

  const reloadDashboard = async () => {
    const data = await getDashboardWithRecommendations(user);
    setDashboardData(data);
    setDashboardUserId(user?.id);
    if (data.recommendationGenerationError) {
      setNotification({ type: 'info', message: `Recommendations could not be refreshed: ${data.recommendationGenerationError}` });
    }
    return data;
  };

  const saveDashboardRecord = async (values) => {
    const requests = {
      lab: recordPatientLabResult,
      vitals: recordPatientVitals,
      lifestyle: recordPatientLifestyle,
    };
    await requests[recordMode](user.id, values);
    setRecordMode(null);
    setNotification({ type: 'success', message: 'Record saved to your CarePulse health record.' });
    try {
      await reloadDashboard();
    } catch (err) {
      setNotification({ type: 'info', message: `Record saved, but the dashboard could not refresh: ${err.message}` });
    }
  };

  const handleRecommendationToggle = async (actionId, isCompleted) => {
    await updatePatientRecommendation(user.id, actionId, isCompleted);
    try {
      await reloadDashboard();
    } catch (err) {
      setNotification({ type: 'info', message: `Status saved, but the dashboard could not refresh: ${err.message}` });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getDashboardWithRecommendations(user);
      setDashboardData(data);
      setDashboardError(null);
      setNotification(data.recommendationGenerationError
        ? { type: 'info', message: `Dashboard refreshed, but recommendations could not be refreshed: ${data.recommendationGenerationError}` }
        : { type: 'success', message: 'Biometric telemetry & predictive models synced with latest records.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      if (err.status === 401) {
        logout();
        setDashboardData(null);
            setDashboardError(err.message);
      } else if (err.status === 403) {
        setDashboardData(null);
        setNotification({ type: 'info', message: err.message });
      } else {
        setNotification({ type: 'error', message: err.message || 'Dashboard could not be refreshed.' });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickAction = (actionType) => {
    switch (actionType) {
      case 'ml-assessment':
        if (onNavigateToMLStudio) onNavigateToMLStudio();
        else {
          const el = document.getElementById('risk-intelligence-title');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'add-lab':
        setRecordMode('lab');
        break;
      case 'update-lifestyle':
        setRecordMode('lifestyle');
        break;
      case 'record-vitals':
        setRecordMode('vitals');
        break;
      case 'view-records':
        if (onNavigateToRecords) onNavigateToRecords();
        else {
          const el = document.getElementById('health-timeline-title');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'doctor-brief':
        if (onNavigateToDoctorPortal) onNavigateToDoctorPortal();
        else {
          const el = document.getElementById('upcoming-care-title');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      default:
        break;
    }
  };

  const retryDashboard = () => {
    setDashboardData(null);
    setDashboardError(null);
    setDashboardUserId(null);
    setIsLoading(true);
    setRetryCount((count) => count + 1);
  };

  if (isLoading || dashboardUserId !== user?.id) {
    return (
      <section id="patient-dashboard" className="patient-dashboard-section" aria-busy="true">
        <div className="container dashboard-container">
          <div className="dashboard-loading-skeleton">
            <div className="skeleton-hero-block" />
            <div className="skeleton-grid-block">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (dashboardError) {
    return (
      <section id="patient-dashboard" className="patient-dashboard-section">
        <div className="container dashboard-container">
          <div className="dashboard-error-panel" role="alert">
            <h2>Dashboard unavailable</h2>
            <p>{dashboardError}</p>
            <button type="button" className="btn-onboarding-next" onClick={retryDashboard}>Retry loading dashboard</button>
          </div>
        </div>
      </section>
    );
  }

  const {
    patient,
    biometrics,
    riskIntelligence,
    trendData,
    recentActivities,
    recommendations,
    upcomingCare,
    isRealBackend,
    isDemo,
    isLocalOnly,
  } = dashboardData || {};

  return (
    <section
      id="patient-dashboard"
      className="patient-dashboard-section"
      aria-label="Patient Health Intelligence Dashboard"
    >
      <div className="container dashboard-container">
        {/* Floating Notification Toast */}
        {notification && (
          <motion.div
            className={`dashboard-toast toast-${notification.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
          >
            <ShieldCheckIcon size={18} />
            <span>{notification.message}</span>
          </motion.div>
        )}

        {/* 1. Dashboard Header Strip & Overview */}
        <HealthOverview
          patient={patient}
          isRealBackend={isRealBackend}
          isDemo={isDemo}
          isLocalOnly={isLocalOnly}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onEditProfile={() => navigate('/onboarding')}
        />

        {/* 2. Quick Action Toolbar */}
        <QuickActions
          onAddLab={() => handleQuickAction('add-lab')}
          onRunMLAssessment={() => handleQuickAction('ml-assessment')}
          onUpdateLifestyle={() => handleQuickAction('update-lifestyle')}
          onRecordVitals={() => handleQuickAction('record-vitals')}
          onViewRecords={() => handleQuickAction('view-records')}
          onPrepareDoctorBrief={() => handleQuickAction('doctor-brief')}
        />

        {recordMode && <DashboardRecordForm type={recordMode} onCancel={() => setRecordMode(null)} onSave={saveDashboardRecord} />}

        {/* 3. Biometric Telemetry Matrix */}
        <BiometricMatrix biometrics={biometrics} />

        {/* 4. Disease Risk Intelligence (ML Predictive Models) */}
        <RiskIntelligence
          riskData={riskIntelligence}
          isRealBackend={isRealBackend}
          isDemo={isDemo}
          isLocalOnly={isLocalOnly}
          onNavigateToMLStudio={() => handleQuickAction('ml-assessment')}
        />

        {/* 5. Longitudinal Health Trend Visualization */}
        <HealthTrendChart trendData={trendData} />

        {/* 6. Asymmetric Two-Column Split: Recommendations & Upcoming Care */}
        <div className="dashboard-two-col-grid">
          <div className="dashboard-col-left">
            <RecommendationsPreview
              recommendations={recommendations}
              onToggle={handleRecommendationToggle}
              canPersist={!!isRealBackend}
              onExploreCarePlan={() => handleQuickAction('update-lifestyle')}
            />
          </div>
          <div className="dashboard-col-right">
            <UpcomingCare
              upcomingCare={upcomingCare}
              onPrepareDoctorVisit={() => handleQuickAction('doctor-brief')}
            />
          </div>
        </div>

        {/* 7. Health Journey Chronology / Longitudinal Timeline */}
        <HealthTimeline activities={recentActivities} />
      </div>
    </section>
  );
}
