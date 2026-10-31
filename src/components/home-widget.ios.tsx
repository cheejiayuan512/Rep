/**
 * Home screen and Lock Screen widget. This function runs in the widget
 * extension: only SwiftUI views, and every value it uses is declared inside it.
 */
import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

interface HomeWidgetProps {
  heading: string;
  primary: string;
  secondary: string;
}

const RepWidget = (props: HomeWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme !== 'light';
  const text = dark ? '#F4F7FB' : '#12160A';
  const muted = dark ? '#93A0B3' : '#5C6775';
  const accent = dark ? '#D6FF4A' : '#4C6B00';
  const compact = environment.widgetFamily === 'accessoryRectangular' || environment.widgetFamily === 'accessoryInline';
  const small = environment.widgetFamily === 'systemSmall' || compact;

  return (
    <VStack alignment="leading" modifiers={[padding({ all: compact ? 0 : 16 })]}>
      <Text modifiers={[font({ size: compact ? 12 : 13, weight: 'semibold' }), foregroundStyle(muted)]}>{props.heading}</Text>
      <Text modifiers={[font({ size: small ? 22 : 28, weight: 'bold' }), foregroundStyle(accent)]}>{props.primary}</Text>
      {compact ? null : <Text modifiers={[font({ size: 14 }), foregroundStyle(text)]}>{props.secondary}</Text>}
    </VStack>
  );
};

export default createWidget('RepWidget', RepWidget, {
  heading: 'This week',
  primary: '0 workouts',
  secondary: 'Start a workout in Rep',
});
