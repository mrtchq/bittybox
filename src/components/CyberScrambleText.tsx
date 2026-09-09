import React, { useEffect, useState, useRef } from 'react';

const GLYPHS = '0123456789ABCDEF01#*$%@&<>[]_~!?/\\';

interface CyberScrambleTextProps {
  text: string;
  className?: string;
  speed?: number; // ms per step
  delay?: number; // initial delay in ms
  as?: keyof React.JSX.IntrinsicElements;
  onComplete?: () => void;
}

export const CyberScrambleText: React.FC<CyberScrambleTextProps> = ({
  text,
  className = '',
  speed = 25,
  delay = 0,
  as: Component = 'span',
  onComplete,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let iteration = 0;
    const maxIterations = text.length;
    let timer: NodeJS.Timeout | null = null;

    const startScramble = () => {
      const interval = setInterval(() => {
        setDisplayText(() => {
          return text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' ';
              if (index < iteration) {
                return text[index];
              }
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
            .join('');
        });

        if (iteration >= maxIterations) {
          clearInterval(interval);
          setDisplayText(text);
          if (onComplete) onComplete();
        }

        iteration += 1 / 2; // Settle character every 2 ticks
      }, speed);

      return () => clearInterval(interval);
    };

    if (delay > 0) {
      timer = setTimeout(startScramble, delay);
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      const cleanup = startScramble();
      return cleanup;
    }
  }, [text, speed, delay, onComplete]);

  return <Component className={className}>{displayText}</Component>;
};
