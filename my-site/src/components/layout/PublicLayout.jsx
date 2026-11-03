import { useState } from 'react';
import { BioGridBackground } from '../BioGridBackground';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import { EmergencyModal } from '../EmergencyModal';

export function PublicLayout({ children }) {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  return (
    <div className="app-layout public-layout-container">
      {/* Subtle Atmospheric Biological Background */}
      <BioGridBackground />

      {/* Public Marketing Navigation Bar */}
      <Navbar onOpenEmergency={() => setIsEmergencyModalOpen(true)} />

      {/* Main Content View Slot */}
      <main id="main-content" className="public-main-content">
        {children}
      </main>

      {/* Public Footer */}
      <Footer onOpenEmergency={() => setIsEmergencyModalOpen(true)} />

      {/* Emergency Guidance Modal Dialog */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
}
