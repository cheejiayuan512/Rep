/**
 * Android home screen widget. This function runs in the widget process:
 * only Jetpack Compose views, and every value it uses is declared inside it.
 */
import { Column, Text } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize, padding } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

interface HomeWidgetProps {
  heading: string;
  primary: string;
  secondary: string;
}

const RepWidget = (props: HomeWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme !== 'light';
  const backgroundColor = dark ? '#0C0F14' : '#F4F7FB';
  const text = dark ? '#F4F7FB' : '#12160A';
  const muted = dark ? '#93A0B3' : '#5C6775';
  const accent = dark ? '#D6FF4A' : '#4C6B00';

  return (
    <Column modifiers={[fillMaxSize(), background(backgroundColor), padding(16, 16, 16, 16)]} verticalArrangement="center">
      <Text color={muted} style={{ fontSize: 13, fontWeight: '600' }}>
        {props.heading}
      </Text>
      <Text color={accent} style={{ fontSize: 26, fontWeight: '700' }}>
        {props.primary}
      </Text>
      <Text color={text} style={{ fontSize: 14 }}>
        {props.secondary}
      </Text>
    </Column>
  );
};

export default createWidget('RepWidget', RepWidget, {
  heading: 'This week',
  primary: '0 workouts',
  secondary: 'Start a workout in Rep',
});
