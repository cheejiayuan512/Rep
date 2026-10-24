/**
 * One glyph per profile badge, drawn on a 24-unit grid like the tab icons.
 */
import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { BadgeId } from '../domain/profile';

interface BadgeGlyphProps {
  id: BadgeId;
  color: string;
  size?: number;
}

export const BadgeGlyph: React.FC<BadgeGlyphProps> = React.memo(function BadgeGlyph({ id, color, size = 26 }) {
  const stroke = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {glyph(id, color, stroke)}
    </Svg>
  );
});

type Stroke = { stroke: string; strokeLinecap: 'round'; strokeLinejoin: 'round'; strokeWidth: number };

function glyph(id: BadgeId, color: string, stroke: Stroke): React.ReactNode {
  switch (id) {
    case 'logger':
      return (
        <>
          <Rect height="16" rx="2" width="13" x="5.5" y="4.5" {...stroke} />
          <Path d="M9 12.5l2.2 2.2 4-4.4" {...stroke} />
        </>
      );
    case 'lifter':
      return (
        <>
          <Rect fill={color} height="8" rx="1.5" width="3" x="2" y="8" />
          <Rect fill={color} height="8" rx="1.5" width="3" x="19" y="8" />
          <Rect fill={color} height="4" rx="1" width="3" x="5.5" y="10" />
          <Rect fill={color} height="4" rx="1" width="3" x="15.5" y="10" />
          <Rect fill={color} height="2.5" rx="1" width="7" x="8.5" y="10.75" />
        </>
      );
    case 'scribe':
      return <Path d="M5 19l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L9 18l-4 1zM13.5 7.5l3 3" {...stroke} />;
    case 'explorer':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...stroke} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" {...stroke} />
        </>
      );
    case 'streak':
      return <Path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1.1 2.5 2 2.8C11 8.5 11.3 5.5 12 3z" {...stroke} />;
    case 'reps':
      return <Path d="M5 11a6 6 0 0 1 10.3-4.2L17 8.5M17 4.5v4h-4M19 13a6 6 0 0 1-10.3 4.2L7 15.5M7 19.5v-4h4" {...stroke} />;
    case 'heavy':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...stroke} />
          <Circle cx="12" cy="12" r="4" {...stroke} />
          <Circle cx="12" cy="12" fill={color} r="1.2" />
        </>
      );
    case 'records':
      return <Path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5.5a2.5 2.5 0 0 0 2.8 3.4M16 6h2.5a2.5 2.5 0 0 1-2.8 3.4M12 13v4M9 20h6M10 17h4" {...stroke} />;
    case 'marathon':
      return <Path d="M7 4h10M7 20h10M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8" {...stroke} />;
    case 'early':
      return (
        <>
          <Circle cx="12" cy="12" r="3.8" {...stroke} />
          <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" {...stroke} />
        </>
      );
    case 'night':
      return <Path d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9z" {...stroke} />;
    case 'warmup':
      return <Path d="M10 14V5.5a2 2 0 0 1 4 0V14a4 4 0 1 1-4 0zM12 9v7.5" {...stroke} />;
    case 'bigday':
      return <Path d="M3 20h18M6 20v-5M10.5 20V10M15 20v-7M19.5 20V5" {...stroke} />;
    case 'sets':
      return (
        <>
          <Path d="M4 6.5l1.5 1.5 3-3M4 12.5l1.5 1.5 3-3M4 18.5l1.5 1.5 3-3" {...stroke} />
          <Path d="M12 6.5h8M12 12.5h8M12 18.5h8" {...stroke} />
        </>
      );
    case 'century':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <SvgText fill={color} fontSize="7.5" fontWeight="bold" textAnchor="middle" x="12" y="14.6">
            100
          </SvgText>
        </>
      );
    case 'weekender':
      return (
        <>
          <Rect height="15" rx="2" width="17" x="3.5" y="5.5" {...stroke} />
          <Path d="M3.5 10h17M8 3.5v4M16 3.5v4" {...stroke} />
          <Rect fill={color} height="3.5" rx="0.8" width="3.5" x="12.5" y="13.5" />
          <Rect fill={color} height="3.5" rx="0.8" width="3.5" x="16" y="13.5" />
        </>
      );
    case 'allrounder':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...stroke} />
          <Path d="M12 4v16M4 12h16" {...stroke} />
          <Path d="M12 4a8 8 0 0 1 8 8h-8z" fill={color} />
        </>
      );
    case 'rpe':
      return <Path d="M4 16.5a8 8 0 0 1 16 0M12 16.5l4-5M7 16.5h.01M17 16.5h.01" {...stroke} />;
    case 'quick':
      return <Path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" {...stroke} />;
    case 'strong':
      return <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM8.5 12l2.5 2.5 4.5-5" {...stroke} />;
  }
}
