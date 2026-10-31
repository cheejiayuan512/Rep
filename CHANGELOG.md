# Changelog

What changed in Rep, newest first. Store builds are listed as Android version code / iOS build number. Add a section here with every change you ship.

## 1.5.1 · Android 16 / iOS 23

- **Movement poses.** A small drawing of the lift sits beside each exercise in the picker and next to the name on the exercise page.
- **Set type menu.** Normal, Warm-up, Drop, and Failure open over the row. The sets underneath stay put.
- **RPE pad.** The rest bar sits on the effort keyboard. It no longer leaves a gap under the shorter keys.
- **Dynamic Island.** While you are not resting, the island shows how much of the workout is checked off. Rest still shows the countdown.
- **Session records.** Two singles after a best of one single is a personal record. The star is on the set that makes the session bigger. The same applies to a second bodyweight set.
- **Strength mark.** A small five-bar level sits beside the exercise name on the card and in search, including the set you are typing.
- **A broken save is kept.** If the on-device log cannot be read, Rep shows an error and leaves the file in place.
- **iPhone Duo.** The iOS build uses the iOS 27.1 SDK, so the app fills the unfolded display. Content stays off the side rail.
- **Logging pad.** Weight and reps use an in-app keypad with Next, delete, and a nudge (2.5 kg, 5 lb, or 1 rep). RPE opens a 6–10 scale and a line about how many reps were left. Notes still use the system keyboard.
- **One of something.** Analysis and badge counts say “1 set” and “1 workout” instead of the plural.
- **Past sets.** Tap an exercise name during a workout, or on a finished workout, to see every finished set and rep for that exercise.
- **Workout names.** The title shows a pencil and “Tap to rename”. A workout left as Workout is named when you finish, from the time of day and the muscles you trained.
- **Notes.** The pencil sits in the note field, lined up with the text.

## 1.5.0 · Android 15 / iOS 22

- **Finish discards an empty workout.** If nothing is checked off, Finish throws the session away instead of blocking.
- **Drop sets and failure sets.** Tap the set number and pick Normal, Warm-up, Drop, or Failure. Drop and failure count like working sets. The check springs in when a set is completed.
- **Supersets.** Superset with next groups a card with the one under it, in a workout or a routine. Rest waits until the round is done.
- **Home is fuller.** This week is four tiles, recent workouts sit underneath, and each routine card has a pencil. The routines list can edit or delete a template.
- **Workout summary.** Finishing shows the three stars, the session count, and a card of duration, volume, and best sets. Personal records sit on the bottom pill.
- **Notes** show a pencil, so the field reads as something you can edit.
- **Export CSV** on History writes kilograms in Strong's columns. Import still reads that file, including drop sets, failure sets, and rest rows.
- **Age** on Settings and Strength levels (14–80). The table peaks at 24–39; younger and older expected 1RMs are lower. Missing age leaves the table as-is.
- **Hide-keyboard chip on iOS** uses the system accessory above the pad, so it shows inside a workout. Android is unchanged.
- **Import CSV** on History reads Hevy, Strong, Jefit, or FitNotes from the header. Same name matching as Hevy. Real sample files will tighten the last two.

## 1.4.0 · Android 14 / iOS 21

- **Warmups sort by weight.** Lightest warmup rises to the top after you pause typing, or as soon as you mark W. Blank warmups stay last. Working sets do not move.
- **Four tabs.** Workout, History, Progress, Profile. Routines open from the Home heading. The exercise library is on Profile.
- **Less logging chrome.** Notes stay shut until you open them. Quick add only on an empty workout. Warmup rest lives in Profile only. Discard sits under the cards. The swipe-to-delete caption is gone.
- **Home starts.** No slogan. This week is one line. No extra History or Routines links.
- **Finish is Done.** Undo finish and View workout are quiet text. No confetti.
- **Less inventory.** Locked badges stay off Profile. A PR star is on the set only. The RPE column waits until you turn it on in Settings, or until you have logged one.

## 1.3.0 · Android 13 / iOS 20

- **More built-in exercises.** About 65 gym staples are in the library now: pec deck, T-bar and Pendlay rows, shrugs, EZ-bar curls, Nordic curl, kettlebell swing, farmer carry, core holds, Olympic lifts, and the usual machine variants. They show up on the next open without wiping custom exercises.
- **Hide-keyboard chip** on iOS and Android, for every field — a keyboard-down button above the pad, not a Done word.
- **Leave a workout by swiping down** or tapping the down chevron. The session stays in progress. **Discard** is next to the clock.
- **Warmups stay above working sets** on load, and Previous lines up warmup with warmup.
- **Tap Previous** to copy that session's weight and reps into the current set.
- **Undo finish** on the complete screen reopens the workout.
- **Less card clutter.** Muscle group is gone. Swap and Remove are icons. Rest is just `1:00`. Drag ⋮ to reorder, same as a routine.
- **RPE PR.** The same (or harder) load at a lower RPE is a personal record.

## 1.2.0 · Android 12 / iOS 19

- **Routines look like a workout.** Each exercise is a card with planned sets, weight, and reps. Add set, swipe a set left to delete it, and tap a set number to mark a warmup. Starting the routine copies those sets in.
- **Drag to reorder routines.** The three dots on a card replace Up / Down.
- **Swipe a routine card left to remove it,** with Undo for 5 seconds.
- **Small plates are exact.** Weights keep two decimals, so 8.75 kg stays 8.75 when saved and when **Add set** copies it (it used to become 8.8). Estimated 1RMs still show one decimal.
- **Machine setup.** Machine and cable cards have a stack chip (Precor, Life Fitness, Hammer Strength, Generic, or a name you type). Previous shows `20 × 12 · Life Fitness`. PRs and the exercise chart only compare the same stack. Older sets stay **Unknown brand** until you name them.
- **Switch stack, load that stack's last session.** The setup list shows `last 20 × 12` on stacks you have used. Tapping Precor refills unchecked sets from your last Precor session (or blanks them). Checked-off sets stay. Undo for 5 seconds.

## 1.1.0 · Android 10 / iOS 17 (2026-10-24)

- **Quick add.** A blank workout shows up to eight exercises you train most (or the main lifts when the log is new). Tap one to add it. A shorter row stays under **Add exercise**.
- **Typo-tolerant search.** The picker and the Exercises tab find "benhc pres", "db curl", "rdl", or "ohp", and match muscle and equipment words.
- **Swipe a set left to delete it.** The small × is gone, so the row has more room. Undo still works for 5 seconds.
- **Workout complete screen.** Finishing shows confetti, time, volume, sets and reps, new PRs, XP earned with the level bar, badges unlocked, and each exercise's session 1RM.
- **Heavier warmups rest longer.** Warmup rest now scales with how close the warmup is to your working weight: a light ramp-up rests the multiplier's share, and a warmup near working weight rests almost the full time.
- **Session 1RM in History.** Workout detail shows a session 1RM blended from all working sets next to the best single-set e1RM. The 1RM calculator opens in **Whole session** mode.
- **No more blank flash.** Screens open with their data instead of loading after the first frame.
- **Units live in Profile.** kg / lb, warmup rest, and bodyweight are under **Settings** on the Profile tab.
- **Badges explain themselves.** Tap a badge to see what it counts, where you are, and each tier's target. **Show all** expands the full list. 8 new badges: Big day, Set stacker, Century, Weekender, All-rounder, RPE logger, Quick session, and Strong.
- **Levels make sense.** "Level 8 of 20" with a title (Starter to Legend), XP toward the next level, how many XP are left, and how XP is earned. The medal star is centered.
- **Strength levels.** Enter bodyweight and sex in Profile to rate your squat, bench, deadlift, press, row, and more from Beginner to Elite, with the percentile of lifters you beat and the kg to the next level.

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
