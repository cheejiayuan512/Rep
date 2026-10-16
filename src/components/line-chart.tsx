import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import type { ChartPoint } from '../domain/metrics';
import { formatChartTick } from '../domain/units';
import { formatDay } from '../domain/format';
import { colors } from '../theme/colors';

interface LineChartProps {
  points: ChartPoint[];
}

const HEIGHT = 208;

export const LineChart: React.FC<LineChartProps> = ({ points }) => {
  const [width, setWidth] = useState(0);
  const handleLayout = useCallback((widthNext: number) => {
    setWidth(widthNext);
  }, []);
  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      handleLayout(event.nativeEvent.layout.width);
    },
    [handleLayout],
  );

  if (points.length === 0) {
    return <Text style={styles.empty}>Complete a weighted set to plot this.</Text>;
  }

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {width > 0 ? <ChartCanvas points={points} width={width} /> : null}
    </View>
  );
};

interface ChartCanvasProps {
  points: ChartPoint[];
  width: number;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ points, width }) => {
  const left = 52;
  const right = 12;
  const top = 16;
  const axis = 28;
  const plotWidth = Math.max(1, width - left - right);
  const plotHeight = HEIGHT - top - axis;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(Math.abs(max) * 0.2, 1);
  const yMin = min - span * 0.25;
  const yMax = max + span * 0.25;
  const yFor = (value: number) => top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const xFor = (index: number) => (points.length === 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth);
  const polyline = points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(' ');
  const first = points[0];
  const middle = points[Math.floor((points.length - 1) / 2)];
  const last = points[points.length - 1];
  const maxLabel = formatChartTick(max);
  const minLabel = formatChartTick(min);

  return (
    <Svg height={HEIGHT} width={width}>
      <Line stroke={colors.border} strokeWidth={1} x1={left} x2={width - right} y1={yFor(max)} y2={yFor(max)} />
      {minLabel === maxLabel ? null : <Line stroke={colors.border} strokeWidth={1} x1={left} x2={width - right} y1={yFor(min)} y2={yFor(min)} />}
      <SvgText fill={colors.faint} fontSize="11" textAnchor="end" x={left - 8} y={yFor(max) + 4}>
        {maxLabel}
      </SvgText>
      {minLabel === maxLabel ? null : (
        <SvgText fill={colors.faint} fontSize="11" textAnchor="end" x={left - 8} y={yFor(min) + 4}>
          {minLabel}
        </SvgText>
      )}
      <Polyline fill="none" points={polyline} stroke={colors.accent} strokeLinejoin="round" strokeWidth={2.5} />
      {points.map((point, index) => (
        <Circle cx={xFor(index)} cy={yFor(point.value)} fill={index === points.length - 1 ? colors.accent : colors.text} key={`${point.at}-${index}`} r={index === points.length - 1 ? 4.5 : 3} />
      ))}
      {first ? (
        <SvgText fill={colors.faint} fontSize="11" textAnchor="start" x={left} y={HEIGHT - 6}>
          {formatDay(first.at)}
        </SvgText>
      ) : null}
      {middle && points.length > 2 ? (
        <SvgText fill={colors.faint} fontSize="11" textAnchor="middle" x={xFor(Math.floor((points.length - 1) / 2))} y={HEIGHT - 6}>
          {formatDay(middle.at)}
        </SvgText>
      ) : null}
      {last && points.length > 1 ? (
        <SvgText fill={colors.faint} fontSize="11" textAnchor="end" x={width - right} y={HEIGHT - 6}>
          {formatDay(last.at)}
        </SvgText>
      ) : null}
    </Svg>
  );
};

const styles = StyleSheet.create({
  empty: {
    color: colors.muted,
    fontSize: 14,
    paddingVertical: 24,
  },
  wrap: {
    height: HEIGHT,
    marginBottom: 8,
    overflow: 'hidden',
    width: '100%',
  },
});
