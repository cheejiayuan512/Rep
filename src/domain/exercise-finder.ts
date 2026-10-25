/**
 * Find an exercise from the movement when you do not know its name:
 * where you feel it, what you are holding, and how your body is placed.
 * Built-in exercises carry a body position and a one-line description of the move.
 * Custom exercises match on muscle and equipment only.
 */
import type { Equipment, Exercise, MuscleGroup } from './types';

export const bodyPositions = ['Standing', 'Seated', 'Lying on a bench', 'Bent over', 'On the floor', 'Hanging or on bars'] as const;

export type BodyPosition = (typeof bodyPositions)[number];

export interface FinderAnswers {
  muscle: MuscleGroup | null;
  equipment: Equipment | null;
  position: BodyPosition | null;
}

export interface FinderMatch {
  exercise: Exercise;
  /** True when every answered question matches. */
  exact: boolean;
}

/** Plain words for each muscle group, for someone who does not know the gym name. */
export const feelLabels: Record<MuscleGroup, string> = {
  Back: 'Back or lats',
  Biceps: 'Front of upper arm',
  Calves: 'Calves',
  Chest: 'Chest',
  Core: 'Abs or core',
  'Full body': 'All over',
  Glutes: 'Glutes',
  Hamstrings: 'Back of thighs',
  Quads: 'Front of thighs',
  Shoulders: 'Shoulders',
  Triceps: 'Back of upper arm',
};

export const usingLabels: Record<Equipment, string> = {
  Barbell: 'Long bar with plates',
  Bodyweight: 'Just my body',
  Cable: 'Cable on a pulley',
  Dumbbell: 'Dumbbells',
  Kettlebell: 'Kettlebell',
  Machine: 'Machine with a seat or pad',
  Other: 'Something else',
};

interface Move {
  position: BodyPosition;
  cue: string;
}

const moves: Record<string, Move> = {
  'ab-wheel-rollout': { cue: 'Kneel, roll a wheel forward until you are stretched out, then roll back.', position: 'On the floor' },
  'arnold-press': { cue: 'Press dumbbells overhead, turning your palms from facing you to facing forward.', position: 'Seated' },
  'back-squat': { cue: 'Bar across your upper back. Sit down between your heels and stand back up.', position: 'Standing' },
  'barbell-bench-press': { cue: 'Lie on a flat bench, lower the bar to your chest, press it back up.', position: 'Lying on a bench' },
  'barbell-curl': { cue: 'Palms up, curl the bar from your thighs to your shoulders.', position: 'Standing' },
  'barbell-row': { cue: 'Lean forward with a flat back and pull the bar to your stomach.', position: 'Bent over' },
  'bulgarian-split-squat': { cue: 'Back foot up on a bench, lower into a lunge on the front leg.', position: 'Standing' },
  'cable-crunch': { cue: 'Kneel under a high cable, rope by your head, crunch down toward your knees.', position: 'On the floor' },
  'cable-curl': { cue: 'Facing a low cable, curl the bar or handle up to your shoulders.', position: 'Standing' },
  'cable-fly': { cue: 'Stand between two pulleys and bring the handles together in front of your chest.', position: 'Standing' },
  'cable-lateral-raise': { cue: 'Side on to a low cable, raise the handle out to your side to shoulder height.', position: 'Standing' },
  'cable-pull-through': { cue: 'Facing away from a low cable, rope between your legs, hinge forward and stand up tall.', position: 'Standing' },
  'chest-supported-row': { cue: 'Chest down on an angled bench, pull the weights up toward your ribs.', position: 'Lying on a bench' },
  'chin-up': { cue: 'Hang from a bar with palms facing you and pull your chin over it.', position: 'Hanging or on bars' },
  'close-grip-bench-press': { cue: 'Bench press with your hands about shoulder width apart, elbows tucked.', position: 'Lying on a bench' },
  crunch: { cue: 'On your back, knees bent, curl your shoulders off the floor.', position: 'On the floor' },
  deadlift: { cue: 'Lift the bar from the floor to your hips with a flat back, then put it down.', position: 'Standing' },
  'decline-barbell-bench-press': { cue: 'Head lower than your hips on a sloped bench, press the bar from your lower chest.', position: 'Lying on a bench' },
  dip: { cue: 'Hold yourself up on two parallel bars, lower by bending your elbows, push back up.', position: 'Hanging or on bars' },
  'dumbbell-bench-press': { cue: 'Lie on a flat bench and press two dumbbells up from your chest.', position: 'Lying on a bench' },
  'dumbbell-curl': { cue: 'Palms up, curl dumbbells from your sides to your shoulders.', position: 'Standing' },
  'dumbbell-fly': { cue: 'Lie on a bench, open your arms wide with dumbbells, then hug them back together.', position: 'Lying on a bench' },
  'dumbbell-kickback': { cue: 'Lean forward, elbow pinned at your side, straighten your arm back behind you.', position: 'Bent over' },
  'dumbbell-romanian-deadlift': { cue: 'Hinge at the hips with soft knees, lower dumbbells down your legs, stand up.', position: 'Standing' },
  'dumbbell-row': { cue: 'One hand and knee on a bench, pull a dumbbell up to your hip.', position: 'Bent over' },
  'dumbbell-shoulder-press': { cue: 'Press two dumbbells from your shoulders to overhead.', position: 'Seated' },
  'face-pull': { cue: 'Pull a rope at face height toward your forehead, elbows high and wide.', position: 'Standing' },
  'front-squat': { cue: 'Bar resting on the front of your shoulders, squat down and stand up.', position: 'Standing' },
  'glute-bridge': { cue: 'On your back, knees bent, push your hips up toward the ceiling.', position: 'On the floor' },
  'goblet-squat': { cue: 'Hold one dumbbell or kettlebell at your chest and squat.', position: 'Standing' },
  'good-morning': { cue: 'Bar on your back, bow forward from the hips with a flat back, then stand up.', position: 'Standing' },
  'hack-squat': { cue: 'Shoulders under pads on an angled sled, squat down and push back up.', position: 'Standing' },
  'hammer-curl': { cue: 'Curl dumbbells with your palms facing each other, like holding hammers.', position: 'Standing' },
  'hanging-leg-raise': { cue: 'Hang from a bar and raise your legs up in front of you.', position: 'Hanging or on bars' },
  'hip-abduction': { cue: 'Sit with pads on the outside of your knees and push your legs apart.', position: 'Seated' },
  'hip-thrust': { cue: 'Upper back against a bench, bar across your hips, push your hips up.', position: 'On the floor' },
  'incline-barbell-bench-press': { cue: 'On a bench tilted up, press the bar from your upper chest.', position: 'Lying on a bench' },
  'incline-dumbbell-curl': { cue: 'Lean back on a tilted bench, arms hanging down, curl the dumbbells up.', position: 'Seated' },
  'incline-dumbbell-press': { cue: 'On a bench tilted up, press two dumbbells from your upper chest.', position: 'Lying on a bench' },
  'lat-pulldown': { cue: 'Sit under a wide bar on a cable and pull it down to your upper chest.', position: 'Seated' },
  'lateral-raise': { cue: 'Raise dumbbells out to your sides until your arms are level with your shoulders.', position: 'Standing' },
  'leg-extension': { cue: 'Sit with a pad on your shins and straighten your knees.', position: 'Seated' },
  'leg-press': { cue: 'Sit back in a sled and push the foot platform away with your legs.', position: 'Seated' },
  'lying-leg-curl': { cue: 'Lie face down with a pad behind your ankles and curl your heels toward your glutes.', position: 'Lying on a bench' },
  'machine-chest-press': { cue: 'Sit upright and push the handles forward away from your chest.', position: 'Seated' },
  'overhead-press': { cue: 'Press the bar from your shoulders to straight overhead.', position: 'Standing' },
  'overhead-triceps-extension': { cue: 'Hold a weight overhead, lower it behind your head, then straighten your arms.', position: 'Standing' },
  plank: { cue: 'Hold a straight line from head to heels on your forearms and toes.', position: 'On the floor' },
  'power-clean': { cue: 'Pull the bar fast from the floor and catch it on the front of your shoulders.', position: 'Standing' },
  'preacher-curl': { cue: 'Upper arms resting on a slanted pad, curl the bar up.', position: 'Seated' },
  'pull-up': { cue: 'Hang from a bar with palms facing away and pull your chin over it.', position: 'Hanging or on bars' },
  'push-press': { cue: 'Dip your knees, then drive the bar from your shoulders to overhead.', position: 'Standing' },
  'push-up': { cue: 'Hands on the floor, body straight, lower your chest and push back up.', position: 'On the floor' },
  'rear-delt-fly': { cue: 'Lean forward and open your arms out to the sides to work the back of the shoulders.', position: 'Bent over' },
  'romanian-deadlift': { cue: 'Hinge at the hips with soft knees, slide the bar down your legs, stand up.', position: 'Standing' },
  'seated-cable-row': { cue: 'Sit with feet braced and pull a cable handle to your stomach.', position: 'Seated' },
  'seated-calf-raise': { cue: 'Sit with a pad on your knees and lift your heels.', position: 'Seated' },
  'seated-leg-curl': { cue: 'Sit with a pad behind your ankles and pull your heels down under the seat.', position: 'Seated' },
  'skull-crusher': { cue: 'Lie on a bench and lower the bar toward your forehead by bending only your elbows.', position: 'Lying on a bench' },
  'standing-calf-raise': { cue: 'Stand on the balls of your feet and rise up onto your toes.', position: 'Standing' },
  'straight-arm-pulldown': { cue: 'Arms straight, push a high cable bar down to your thighs.', position: 'Standing' },
  thruster: { cue: 'Front squat, and as you stand, press the bar overhead in one move.', position: 'Standing' },
  'triceps-pushdown': { cue: 'Elbows at your sides, push a high cable rope or bar down until your arms are straight.', position: 'Standing' },
  'upright-row': { cue: 'Pull the bar straight up along your body to chest height, elbows high.', position: 'Standing' },
  'walking-lunge': { cue: 'Step forward into a lunge, then bring the back foot through into the next one.', position: 'Standing' },
};

/** What the movement looks like, or null for custom exercises. */
export function movementCue(exerciseId: string): string | null {
  return moves[exerciseId]?.cue ?? null;
}

export function bodyPositionOf(exerciseId: string): BodyPosition | null {
  return moves[exerciseId]?.position ?? null;
}

const RESULT_LIMIT = 8;

/**
 * The muscle answer filters; equipment and position rank. Exact matches come
 * first, then the nearest misses, so a wrong guess on one question still
 * shows the move. Unanswered questions ("Not sure") match everything.
 */
export function findExercises(exercises: readonly Exercise[], answers: FinderAnswers): FinderMatch[] {
  const scored = exercises
    .filter((exercise) => answers.muscle == null || exercise.muscleGroup === answers.muscle)
    .map((exercise) => {
      const equipmentHit = answers.equipment == null || exercise.equipment === answers.equipment;
      const position = bodyPositionOf(exercise.id);
      const positionHit = answers.position == null || position === answers.position;
      return { exact: equipmentHit && positionHit, exercise, score: (equipmentHit ? 2 : 0) + (positionHit ? 1 : 0) };
    })
    .sort((left, right) => right.score - left.score || Number(right.exercise.isCustom) - Number(left.exercise.isCustom) || left.exercise.name.localeCompare(right.exercise.name));
  return scored.slice(0, RESULT_LIMIT).map(({ exact, exercise }) => ({ exact, exercise }));
}
