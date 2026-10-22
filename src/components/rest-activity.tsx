/**
 * The rest timer on the iOS Lock Screen and in the Dynamic Island.
 * The function below runs inside the widget extension, not the app: it can use
 * only @expo/ui/swift-ui views, no hooks, and nothing declared outside it.
 * iOS ticks the countdown itself, so the app sends nothing while you rest.
 */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export interface RestActivityProps {
  exerciseName: string;
  /** Milliseconds since 1970. Props cross to the extension as JSON. */
  startedAt: number;
  endsAt: number;
  /** The set waiting after this rest, such as "100 kg × 5". Empty when unknown. */
  nextSet: string;
}

const RestActivity = (props: RestActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : '#D6FF4A';
  const interval = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        <VStack alignment="leading">
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#93A0B3')]}>Rest</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle('#F4F7FB')]}>{props.exerciseName}</Text>
          {props.nextSet ? <Text modifiers={[font({ size: 13 }), foregroundStyle('#93A0B3')]}>Next: {props.nextSet}</Text> : null}
        </VStack>
        <Spacer />
        <Text countsDown modifiers={[font({ size: 40, weight: 'heavy' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 120, alignment: 'trailing' })]} timerInterval={interval} />
      </HStack>
    ),
    compactLeading: <Image color={accent} systemName="timer" />,
    compactTrailing: <Text countsDown modifiers={[monospacedDigit(), foregroundStyle(accent), frame({ width: 44 })]} timerInterval={interval} />,
    minimal: <Image color={accent} systemName="timer" />,
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ leading: 8, top: 8 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#93A0B3')]}>Rest</Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' })]}>{props.exerciseName}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <Text countsDown modifiers={[font({ size: 32, weight: 'heavy' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 100, alignment: 'trailing' }), padding({ trailing: 8, top: 8 })]} timerInterval={interval} />
    ),
    expandedBottom: props.nextSet ? <Text modifiers={[font({ size: 14 }), foregroundStyle('#93A0B3')]}>Next set: {props.nextSet}</Text> : null,
  };
};

export default createLiveActivity('RestActivity', RestActivity);
