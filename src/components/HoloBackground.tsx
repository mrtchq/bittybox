import React from 'react';
import { WorkspaceTheme } from '../types';

interface HoloBackgroundProps {
  theme?: WorkspaceTheme;
}

/**
 * The fixed, decorative starfield behind the Bitty Box workspace.
 * Theme controls still style the workspace chrome; the home canvas deliberately
 * remains the supplied neutral-black sky so the center card stays dominant.
 */
export const HoloBackground: React.FC<HoloBackgroundProps> = () => (
  <div
    className="bitty-starfield fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    aria-hidden="true"
  >
    <div id="stars" />
    <div id="stars2" />
    <div id="stars3" />
  </div>
);
