import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

export function ContainerScroll({ titleComponent, children }) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // 3D Tilt perspective mapping (Smooth flattening on scroll into view)
  const rotateX = useTransform(
    scrollYProgress,
    [0.1, 0.45],
    shouldReduceMotion ? [0, 0] : isMobile ? [8, 0] : [18, 0]
  );

  const scale = useTransform(
    scrollYProgress,
    [0.1, 0.45],
    shouldReduceMotion ? [1, 1] : isMobile ? [0.95, 1] : [0.92, 1]
  );

  const opacity = useTransform(scrollYProgress, [0.05, 0.25], [0.8, 1]);

  return (
    <div className="container-scroll-section" ref={containerRef}>
      <div className="container container-scroll-wrapper">
        {/* Title Header */}
        <div className="container-scroll-header">
          {titleComponent}
        </div>

        {/* 3D Perspective Card Container */}
        <div className="container-scroll-perspective">
          <motion.div
            style={{
              rotateX,
              scale,
              opacity,
              transformStyle: 'preserve-3d',
            }}
            className="container-scroll-card"
          >
            <div className="container-scroll-card-inner">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
