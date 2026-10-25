/**
 * The pictures on the bottom tabs, drawn as SVG so they stay sharp.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

export const WorkoutIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Rect fill={color} height="8" rx="1.5" width="3" x="2" y="8" />
      <Rect fill={color} height="8" rx="1.5" width="3" x="19" y="8" />
      <Rect fill={color} height="4" rx="1" width="3" x="5.5" y="10" />
      <Rect fill={color} height="4" rx="1" width="3" x="15.5" y="10" />
      <Rect fill={color} height="2.5" rx="1" width="7" x="8.5" y="10.75" />
    </Svg>
  );
};

export const RoutinesIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Rect height="16" rx="2" stroke={color} strokeWidth="1.8" width="14" x="5" y="4" />
      <Path d="M8 9h8M8 13h8M8 17h5" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
    </Svg>
  );
};

export const HistoryIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" />
      <Path d="M12 8v4.5l3 2" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
    </Svg>
  );
};

export const ProfileIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.8" />
      <Path d="M5.5 19.2c1.4-3 3.6-4.4 6.5-4.4s5.1 1.4 6.5 4.4" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
    </Svg>
  );
};

export const ExercisesIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M9 7.5a3 3 0 0 1 6 0" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
      <Path d="M7.6 9.5h8.8l1.4 9a1.5 1.5 0 0 1-1.5 1.7H7.7a1.5 1.5 0 0 1-1.5-1.7l1.4-9z" stroke={color} strokeLinejoin="round" strokeWidth="1.8" />
    </Svg>
  );
};

export const ProgressIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M4 16l5-5 3.5 3.5L20 7" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <Path d="M15 7h5v5" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </Svg>
  );
};

export const ChevronDownIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </Svg>
  );
};

export const KeyboardHideIcon: React.FC<IconProps> = ({ color, size = 22 }) => {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Rect height="10" rx="1.6" stroke={color} strokeWidth="1.7" width="16" x="4" y="5" />
      <Path d="M7 8h.01M10.5 8h.01M14 8h.01M17 8h.01M7 11h.01M10.5 11h.01M14 11h.01M17 11h.01" stroke={color} strokeLinecap="round" strokeWidth="1.8" />
      <Path d="M8 17.5l4 3 4-3" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </Svg>
  );
};
