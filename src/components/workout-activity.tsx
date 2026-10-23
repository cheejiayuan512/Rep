/**
 * The open workout on the iOS Lock Screen and in the Dynamic Island: the next
 * set, a Done button that checks it off, and either the rest countdown or the
 * time since the workout started.
 * The function below runs inside the widget extension, not the app: it can use
 * only @expo/ui/swift-ui views, no hooks, and nothing declared outside it.
 * iOS ticks both timers itself, so the app sends nothing while you rest.
 */
import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, font, foregroundStyle, frame, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export interface WorkoutActivityProps {
  /** Milliseconds since 1970. Props cross to the extension as JSON. */
  workoutStartedAt: number;
  /** The exercise of the next set, or a closing line when every set is done. */
  exerciseName: string;
  /** "Set 2 of 4" or "Warmup". Empty when nothing is left. */
  setLabel: string;
  /** Such as "100 kg × 5". Empty when unknown. */
  nextSet: string;
  /** Both 0 when not resting. The activity's stale date is the rest end, so it falls back to elapsed time on its own. */
  restStartedAt: number;
  restEndsAt: number;
  /** False when the next set has no reps yet, so Done would have nothing to log. */
  canComplete: boolean;
}

const WorkoutActivity = (props: WorkoutActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : '#D6FF4A';
  const resting = props.restEndsAt > 0 && !environment.isStale;
  const rest = { lower: new Date(props.restStartedAt), upper: new Date(props.restEndsAt) };
  const elapsed = { lower: new Date(props.workoutStartedAt), upper: new Date(props.workoutStartedAt + 24 * 60 * 60 * 1000) };
  const detail = [props.setLabel, props.nextSet].filter((part) => part.length > 0).join(' · ');

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        <VStack alignment="leading">
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#93A0B3')]}>{resting ? 'Rest · up next' : 'Up next'}</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle('#F4F7FB')]}>{props.exerciseName}</Text>
          {detail ? <Text modifiers={[font({ size: 13 }), foregroundStyle('#93A0B3')]}>{detail}</Text> : null}
        </VStack>
        <Spacer />
        <VStack alignment="trailing">
          {resting ? (
            <Text countsDown modifiers={[font({ size: 36, weight: 'heavy' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 110, alignment: 'trailing' })]} timerInterval={rest} />
          ) : (
            <Text countsDown={false} modifiers={[font({ size: 22, weight: 'bold' }), monospacedDigit(), foregroundStyle('#F4F7FB'), frame({ width: 110, alignment: 'trailing' })]} timerInterval={elapsed} />
          )}
          {props.canComplete ? (
            <Button label="Done" modifiers={[buttonStyle('borderedProminent'), controlSize('small'), tint(accent)]} systemImage="checkmark" target="complete-set" />
          ) : null}
        </VStack>
      </HStack>
    ),
    compactLeading: <Image color={accent} systemName={resting ? 'timer' : 'figure.strengthtraining.traditional'} />,
    compactTrailing: resting ? (
      <Text countsDown modifiers={[monospacedDigit(), foregroundStyle(accent), frame({ width: 44 })]} timerInterval={rest} />
    ) : (
      <Text countsDown={false} modifiers={[monospacedDigit(), foregroundStyle('#F4F7FB'), frame({ width: 52 })]} timerInterval={elapsed} />
    ),
    minimal: <Image color={accent} systemName={resting ? 'timer' : 'figure.strengthtraining.traditional'} />,
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ leading: 8, top: 8 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#93A0B3')]}>{resting ? 'Rest · up next' : 'Up next'}</Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' })]}>{props.exerciseName}</Text>
      </VStack>
    ),
    expandedTrailing: resting ? (
      <Text countsDown modifiers={[font({ size: 32, weight: 'heavy' }), monospacedDigit(), foregroundStyle(accent), frame({ width: 100, alignment: 'trailing' }), padding({ trailing: 8, top: 8 })]} timerInterval={rest} />
    ) : (
      <Text countsDown={false} modifiers={[font({ size: 22, weight: 'bold' }), monospacedDigit(), frame({ width: 100, alignment: 'trailing' }), padding({ trailing: 8, top: 8 })]} timerInterval={elapsed} />
    ),
    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 8 })]}>
        <Text modifiers={[font({ size: 14 }), foregroundStyle('#93A0B3')]}>{detail}</Text>
        <Spacer />
        {props.canComplete ? (
          <Button label="Done" modifiers={[buttonStyle('borderedProminent'), controlSize('small'), tint(accent)]} systemImage="checkmark" target="complete-set" />
        ) : null}
      </HStack>
    ),
  };
};

// The native name stays "RestActivity" so activities started by older builds keep matching.
export default createLiveActivity('RestActivity', WorkoutActivity);
