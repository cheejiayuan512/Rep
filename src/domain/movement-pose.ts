/**
 * Which small pose drawing belongs to an exercise. Variants of one movement
 * share a pose. A custom name is matched by its words. Unknown names get a
 * standing figure.
 */
import { movementFamily } from './exercise-families';

export type MovementPose =
  | 'squat'
  | 'bench'
  | 'deadlift'
  | 'row'
  | 'press'
  | 'curl'
  | 'pulldown'
  | 'pullup'
  | 'lunge'
  | 'thrust'
  | 'calf'
  | 'crunch'
  | 'fly'
  | 'lateral'
  | 'shrug'
  | 'legcurl'
  | 'pushdown'
  | 'pushup'
  | 'dip'
  | 'legpress'
  | 'legextension'
  | 'plank'
  | 'legraise'
  | 'twist'
  | 'swing'
  | 'carry'
  | 'clean'
  | 'jump'
  | 'kick'
  | 'abduct'
  | 'rollout'
  | 'facepull'
  | 'pullover'
  | 'upright'
  | 'frontraise'
  | 'reardelt'
  | 'skull'
  | 'overhead'
  | 'backext'
  | 'deadbug'
  | 'generic';

const poseById: Record<string, MovementPose> = {
  'ab-wheel-rollout': 'rollout',
  'arnold-press': 'press',
  'back-extension': 'backext',
  'back-squat': 'squat',
  'barbell-bench-press': 'bench',
  'barbell-curl': 'curl',
  'box-squat': 'squat',
  'barbell-row': 'row',
  'barbell-shrug': 'shrug',
  'belt-squat': 'squat',
  'bench-dip': 'dip',
  'bicycle-crunch': 'crunch',
  'bird-dog': 'kick',
  'box-jump': 'jump',
  'bulgarian-split-squat': 'lunge',
  burpee: 'jump',
  'cable-crossover': 'fly',
  'cable-crunch': 'crunch',
  'cable-curl': 'curl',
  'cable-fly': 'fly',
  'cable-front-raise': 'frontraise',
  'cable-kickback': 'kick',
  'cable-lateral-raise': 'lateral',
  'cable-pull-through': 'deadlift',
  'cable-rear-delt-fly': 'reardelt',
  'chest-supported-row': 'row',
  'chin-up': 'pullup',
  'clean-and-jerk': 'clean',
  'close-grip-bench-press': 'bench',
  crunch: 'crunch',
  'dead-bug': 'deadbug',
  deadlift: 'deadlift',
  'decline-barbell-bench-press': 'bench',
  'decline-dumbbell-press': 'bench',
  dip: 'dip',
  'donkey-calf-raise': 'calf',
  'donkey-kick': 'kick',
  'dumbbell-bench-press': 'bench',
  'dumbbell-curl': 'curl',
  'dumbbell-fly': 'fly',
  'dumbbell-kickback': 'pushdown',
  'dumbbell-pullover': 'pullover',
  'dumbbell-romanian-deadlift': 'deadlift',
  'dumbbell-row': 'row',
  'dumbbell-shoulder-press': 'press',
  'dumbbell-shrug': 'shrug',
  'ez-bar-curl': 'curl',
  'face-pull': 'facepull',
  'farmer-carry': 'carry',
  'floor-press': 'bench',
  'front-raise': 'frontraise',
  'front-squat': 'squat',
  'glute-bridge': 'thrust',
  'glute-ham-raise': 'legcurl',
  'goblet-squat': 'squat',
  'good-morning': 'deadlift',
  'hack-squat': 'squat',
  'hammer-curl': 'curl',
  'hang-clean': 'clean',
  'hanging-knee-raise': 'legraise',
  'hanging-leg-raise': 'legraise',
  'hip-abduction': 'abduct',
  'hip-adduction': 'abduct',
  'hip-thrust': 'thrust',
  'hollow-hold': 'plank',
  'incline-barbell-bench-press': 'bench',
  'incline-dumbbell-curl': 'curl',
  'incline-dumbbell-press': 'bench',
  'inverted-row': 'row',
  'kettlebell-swing': 'swing',
  'landmine-press': 'press',
  'lat-pulldown': 'pulldown',
  'muscle-up': 'pullup',
  'lateral-raise': 'lateral',
  'leg-extension': 'legextension',
  'leg-press': 'legpress',
  'lying-leg-curl': 'legcurl',
  'machine-chest-press': 'bench',
  'machine-fly': 'fly',
  'machine-lateral-raise': 'lateral',
  'machine-preacher-curl': 'curl',
  'machine-row': 'row',
  'machine-shoulder-press': 'press',
  'machine-triceps-extension': 'pushdown',
  'nordic-curl': 'legcurl',
  'overhead-cable-extension': 'overhead',
  'overhead-press': 'press',
  'overhead-triceps-extension': 'overhead',
  'pallof-press': 'twist',
  'pec-deck': 'fly',
  'pendlay-row': 'row',
  plank: 'plank',
  'power-clean': 'clean',
  'power-snatch': 'clean',
  'preacher-curl': 'curl',
  'pull-up': 'pullup',
  'push-press': 'press',
  'push-up': 'pushup',
  'rear-delt-fly': 'reardelt',
  'reverse-curl': 'curl',
  'reverse-lunge': 'lunge',
  'reverse-pec-deck': 'reardelt',
  'romanian-deadlift': 'deadlift',
  'russian-twist': 'twist',
  'safety-bar-squat': 'squat',
  'seated-cable-row': 'row',
  'seated-calf-raise': 'calf',
  'seated-leg-curl': 'legcurl',
  'side-plank': 'plank',
  'single-arm-cable-row': 'row',
  'single-leg-calf-raise': 'calf',
  'single-leg-hip-thrust': 'thrust',
  'single-leg-rdl': 'deadlift',
  'sissy-squat': 'squat',
  'sit-up': 'crunch',
  'skull-crusher': 'skull',
  'spider-curl': 'curl',
  'split-squat': 'lunge',
  'standing-calf-raise': 'calf',
  'stiff-leg-deadlift': 'deadlift',
  'step-up': 'lunge',
  'straight-arm-pulldown': 'pulldown',
  't-bar-row': 'row',
  'toes-to-bar': 'legraise',
  thruster: 'squat',
  'triceps-pushdown': 'pushdown',
  'upright-row': 'upright',
  'v-up': 'crunch',
  'walking-lunge': 'lunge',
  'wall-sit': 'squat',
  woodchop: 'twist',
  'zercher-squat': 'squat',
  'zottman-curl': 'curl',
};

const poseByFamily: Record<string, MovementPose> = {
  'Bench Press': 'bench',
  'Calf Raise': 'calf',
  Crunch: 'crunch',
  Curl: 'curl',
  Deadlift: 'deadlift',
  'Chest Fly': 'fly',
  'Hip Thrust': 'thrust',
  'Lateral Raise': 'lateral',
  'Leg Curl': 'legcurl',
  Lunge: 'lunge',
  Pulldown: 'pulldown',
  'Pull-Up': 'pullup',
  Row: 'row',
  'Shoulder Press': 'press',
  Shrug: 'shrug',
  Squat: 'squat',
  'Sit-Up': 'crunch',
  'Triceps Extension': 'pushdown',
};

/** More specific phrases first. "leg curl" has to win before "curl". */
const nameRules: Array<{ pattern: RegExp; pose: MovementPose }> = [
  { pattern: /leg curl|nordic|glute-ham|glute ham/, pose: 'legcurl' },
  { pattern: /hip thrust|glute bridge/, pose: 'thrust' },
  { pattern: /pull[- ]?through|deadlift|romanian|\brdl\b|good morning/, pose: 'deadlift' },
  { pattern: /pullover/, pose: 'pullover' },
  { pattern: /bench|chest press|floor press/, pose: 'bench' },
  { pattern: /overhead|shoulder press|\bohp\b|arnold|push press|landmine/, pose: 'press' },
  { pattern: /pulldown|pull-down/, pose: 'pulldown' },
  { pattern: /pull-?up|chin-?up/, pose: 'pullup' },
  { pattern: /upright row/, pose: 'upright' },
  { pattern: /face pull/, pose: 'facepull' },
  { pattern: /\brow\b/, pose: 'row' },
  { pattern: /squat|wall sit/, pose: 'squat' },
  { pattern: /lunge|split squat|step-?up|bulgarian/, pose: 'lunge' },
  { pattern: /fly|crossover|pec deck/, pose: 'fly' },
  { pattern: /lateral/, pose: 'lateral' },
  { pattern: /rear delt|reverse pec/, pose: 'reardelt' },
  { pattern: /front raise/, pose: 'frontraise' },
  { pattern: /shrug/, pose: 'shrug' },
  { pattern: /calf/, pose: 'calf' },
  { pattern: /donkey|glute kick|cable kickback/, pose: 'kick' },
  { pattern: /push-?down|kickback/, pose: 'pushdown' },
  { pattern: /skull/, pose: 'skull' },
  { pattern: /curl/, pose: 'curl' },
  { pattern: /\bdip\b/, pose: 'dip' },
  { pattern: /push-?up|burpee/, pose: 'pushup' },
  { pattern: /leg press/, pose: 'legpress' },
  { pattern: /leg extension/, pose: 'legextension' },
  { pattern: /back extension/, pose: 'backext' },
  { pattern: /plank|hollow/, pose: 'plank' },
  { pattern: /crunch|sit-?up|v-?up/, pose: 'crunch' },
  { pattern: /leg raise|knee raise/, pose: 'legraise' },
  { pattern: /twist|woodchop|pallof/, pose: 'twist' },
  { pattern: /swing/, pose: 'swing' },
  { pattern: /carry|farmer/, pose: 'carry' },
  { pattern: /clean|snatch|jerk/, pose: 'clean' },
  { pattern: /jump/, pose: 'jump' },
  { pattern: /rollout|ab wheel/, pose: 'rollout' },
  { pattern: /abduct|adduct/, pose: 'abduct' },
  { pattern: /donkey|kick/, pose: 'kick' },
  { pattern: /dead bug/, pose: 'deadbug' },
  { pattern: /press/, pose: 'bench' },
];

export function poseForFamily(family: string): MovementPose {
  return poseByFamily[family] ?? 'generic';
}

export function poseForExercise(exerciseId: string, name = ''): MovementPose {
  const known = poseById[exerciseId];
  if (known) {
    return known;
  }
  const family = movementFamily(exerciseId);
  if (family) {
    const pose = poseByFamily[family];
    if (pose) {
      return pose;
    }
  }
  const haystack = name.toLowerCase();
  for (const rule of nameRules) {
    if (rule.pattern.test(haystack)) {
      return rule.pose;
    }
  }
  return 'generic';
}
