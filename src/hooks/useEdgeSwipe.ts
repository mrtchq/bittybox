import { useEffect, useRef } from 'react';

interface EdgeSwipeConfig {
  onSwipeFromLeft?: () => void;
  onSwipeFromRight?: () => void;
  onSwipeLeftToClose?: () => void;
  onSwipeRightToClose?: () => void;
  isLeftOpen?: boolean;
  isRightOpen?: boolean;
  edgeThreshold?: number; // Distance in px from edge to consider as edge swipe start
  swipeThreshold?: number; // Minimum horizontal distance to trigger swipe action
}

export function useEdgeSwipe({
  onSwipeFromLeft,
  onSwipeFromRight,
  onSwipeLeftToClose,
  onSwipeRightToClose,
  isLeftOpen = false,
  isRightOpen = false,
  edgeThreshold = 50,
  swipeThreshold = 60,
}: EdgeSwipeConfig) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const start = touchStartRef.current;
      touchStartRef.current = null;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const deltaTime = Date.now() - start.time;

      // Ignore slow drags or predominantly vertical gestures (scrolls)
      if (deltaTime > 800) return;
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2) return;

      const screenWidth = window.innerWidth;

      // 1. If Left Panel is open: swipe left closes it
      if (isLeftOpen) {
        if (deltaX < -swipeThreshold && onSwipeLeftToClose) {
          onSwipeLeftToClose();
          return;
        }
      }

      // 2. If Right Panel is open: swipe right closes it
      if (isRightOpen) {
        if (deltaX > swipeThreshold && onSwipeRightToClose) {
          onSwipeRightToClose();
          return;
        }
      }

      // 3. Neither is open: edge swipes reveal panels
      if (!isLeftOpen && !isRightOpen) {
        // Swipe from far left edge to the right -> Open Left Panel
        if (start.x <= edgeThreshold && deltaX > swipeThreshold && onSwipeFromLeft) {
          onSwipeFromLeft();
          return;
        }

        // Swipe from far right edge to the left -> Open Right Panel
        if (start.x >= screenWidth - edgeThreshold && deltaX < -swipeThreshold && onSwipeFromRight) {
          onSwipeFromRight();
          return;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    onSwipeFromLeft,
    onSwipeFromRight,
    onSwipeLeftToClose,
    onSwipeRightToClose,
    isLeftOpen,
    isRightOpen,
    edgeThreshold,
    swipeThreshold,
  ]);
}
