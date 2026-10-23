# Changelog

What changed in Rep, newest first. Store builds are listed as Android version code / iOS build number. Add a section here with every change you ship.

## 1.1.0 · Android 9 / iOS 16 (2026-10-23)

- **Workout on the Lock Screen the whole time.** While a workout is open, the iOS Live Activity (Lock Screen and Dynamic Island) and the Android notification stay up between rests. They show the next set ("Set 2 of 4 · 100 kg × 5"), the rest countdown or the time since you started, and a **Done** button that checks that set off and starts its rest without opening the app. iOS 17 or later is needed for the button.
- **Rest defaults by exercise.** Heavy barbell compounds (squat, deadlift, bench, overhead press) rest 3:00, other compounds 2:00, isolation moves 1:30, calves and core 1:00. Custom exercises are classed from their name and equipment. Picking a rest on a card still overrides it.
- **-15 / +15 only change the running rest.** They no longer rewrite the exercise's rest or a default.
- **Warmup rest multiplier.** Warmup sets rest ¼, ½ (default), ¾, or the full exercise rest. Set it from any card's rest picker.
- **Warmups sort to the top.** Marking a set as a warmup moves it above the working sets, and working sets are numbered 1, 2, 3 without counting warmups.
- **Swap an exercise.** A card's **Swap** opens the library and replaces that exercise in place. Sets nobody has checked off are refilled from the new exercise's last session; checked-off sets stay.
- **Cable attachments.** Cable exercises have an attachment chip (rope, straight bar, V-bar, lat bar, EZ bar, single handle, D-handles, ankle strap) on the workout card and in the Exercises tab. A new workout starts with the last one you picked. Finished workouts show it.
- **Whole-session 1RM.** The 1RM calculator has a **Whole session** mode: enter every working set (RPE optional) or load your last session of an exercise. RPE becomes reps in reserve, sets within 10% of the best estimate are blended, and low-rep sets count more.
- The rest bar survives leaving the workout screen and coming back.
- This changelog.

## 1.1.0 · Android 8 / iOS 15 (2026-10-23)

- **Faster.** Saving no longer blocks the screen, so Start workout and the picker's Done open the next screen right away, even with hundreds of imported workouts.
- **Start workout** replaces "Start empty workout". **Create a routine** is full width.
- **This week** panel on the Workout tab: workouts, volume, time, sets, and week streak, each against last week.
- **History cards** show duration, volume, set count, PR count, and up to four exercises with their best set. **Workout detail** is a table per exercise with warmups marked W, RPE, estimated 1RM, and a volume and best-1RM footer.
- **Analysis** (30 days, 90 days, 1 year): totals with change, muscle-group and rep-range split, training days, average RPE, and top lifts.
- **1RM calculator** with Epley, Brzycki, Lombardi, and a training-weights table.
- **Exercises tab**: search, filter, add, rename, recategorize, and delete unused custom exercises. The picker no longer deletes.
- **Profile**: no avatar or dashboard; 12 badges with icons (records, marathon, early bird, night owl, warmups are new).

## 1.1.0 · Android 7 / iOS 14 (2026-10-23)

- Edit a finished workout from History, or duplicate it into a new one.
- An exercise can be in a workout or routine only once. Tapping an added exercise in the picker removes it.
- Shorter Android countdown title so the timer is not cut off.

## 1.1.0 · Android 6 / iOS 13 (2026-10-23)

- Rest countdown as an iOS Live Activity (Lock Screen and Dynamic Island) and an Android Live Update (status bar chip on Android 16, Samsung Now Bar).

## 1.0.x (2026-10-16 to 2026-10-22)

- Local workout log: one card per exercise with sets, reps, weight in kg or lb, RPE, and notes. Routines, history, personal records, and charts.
- Hevy CSV import, a local profile with levels and badges, and drag to reorder exercises.
- PR stars and toast, per-exercise rest timer with a lock-screen alert, Undo for deleted sets and exercises, variants folded in the picker, and a keyboard Done bar.
