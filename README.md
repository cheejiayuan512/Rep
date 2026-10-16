# Rep

Rep is a phone app for logging workouts. You write down the weight and reps for each set, save routines, and look back at history, personal records, and charts. There is no account and no social feed. The log stays on the device.

## Run it

You need [Node.js 22](https://nodejs.org/) (that install includes npm) and [Git](https://git-scm.com/).

```bash
git clone https://github.com/cheejiayuan512/Rep.git
cd Rep
npm install
npx expo start
```

Then:

- Press `w` to open the app in a browser. This is the easiest way to look around.
- Or install **Expo Go** on a phone, join the same Wi-Fi as your computer, and scan the QR code in the terminal.

Save a file while the server is running and the app reloads. Stop the server with `Ctrl+C`.

If the app looks stuck on an old version, stop the server and start it again with `npx expo start -c`.

## What the app does

- **Workout** starts an empty session or resumes the one already in progress. Only one workout can be open at a time.
- **Routines** are saved lists of exercises. Starting one copies your last completed sets in as a template.
- **History** lists finished workouts. Open one to see each exercise, its notes, and its sets.
- **Progress** shows personal records and a chart for each exercise you have trained.
- Each exercise is one card. The card holds the sets (weight, reps, RPE) and a notes box for the whole exercise.
- The kg/lb switch changes what you see. The saved number is always kilograms.
- Removing an exercise deletes it immediately. Discarding a whole workout still asks first.

## A map of the folders

| Folder | What lives there |
| --- | --- |
| `App.tsx` | The root of the UI. Start reading here. |
| `src/features/` | One folder per tab: workout, routines, history, progress. Each file ending in `-screen.tsx` is a page. |
| `src/components/` | Pieces of UI reused by those pages, such as a button or one exercise card. |
| `src/navigation/` | Which page opens when you tap a tab or a button. |
| `src/state/` | A few shared values: are we ready, kg or lb, which workout is open. |
| `src/domain/` | The rules: units, personal records, how dates are written. No buttons here. |
| `src/data/` | Saving and loading the log on the device. |
| `src/theme/` | Colors and spacing. |
| `docs/tour.md` | Follow one logged set from the button you tap to the saved file. |

Each source file starts with a comment that says what that file is for.

## Words you will see

- A **component** is a function that returns UI. `Button` is a component. So is a whole screen.
- **JSX** is the HTML-like syntax inside those functions: `<Text>Rep</Text>`.
- **Props** are the inputs you pass into a component, like `label="Start empty workout"`.
- **State** is data that can change. When it changes, React draws the screen again.
- A **hook** is a function whose name starts with `use`, such as `useState`. Hooks are how a component remembers things.
- **TypeScript** is JavaScript plus labels for what kind of value something holds (`string`, `number`, or a shape you defined). A red underline usually means the label and the value disagree.
- **StyleSheet** is where the colors, size, and spacing for a component are written. Styles sit at the bottom of the file.

## A safe first edit

Open `src/theme/colors.ts` and change `accent`. That lime green (`#D6FF4A`) is the highlight color on buttons and the selected tab.

Then open `src/features/workout/workout-home-screen.tsx` and change the sentence in `styles` usage:

```tsx
<Text style={styles.tagline}>Log the sets. Keep the numbers that move.</Text>
```

Save. If `npx expo start` is running, the home screen updates.

## Rules that are easy to break

- Store weight in kilograms. Convert to pounds only with the helpers in `src/domain/units.ts`.
- Do not put screens in a new `src/app/` folder. This project does not use Expo Router.
- Do not create or edit `ios/` or `android/` by hand. Native setup belongs in `app.json`.
- Install a new package with `npx expo install <package>`, not `npm install <package>`, so the version matches Expo.

## Working on it together

```bash
git checkout -b my-change
# edit files
git add .
git commit -m "Say why you changed it."
git push -u origin my-change
```

Open a pull request on GitHub from that branch. Ask for collaborator access if the push is rejected.

Check types before you push:

```bash
npx tsc --noEmit
```

The personal-record math also has a small test:

```bash
npx tsx src/domain/metrics.test.ts
```

It should print `metrics ok`.

## For coding agents

`AGENTS.md` and `.cursor/` are instructions for AI tools. You can ignore them until the README and `docs/tour.md` feel familiar.
