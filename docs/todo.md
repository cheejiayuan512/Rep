# Start here

This list is for someone new to the project. Do the steps in order. Check one box, run the app, then move on. History and Progress already work on the phone. Do not rebuild those screens. The new work is an account, a cloud copy of the log, and a few smaller improvements.

Read `README.md` and `docs/tour.md` once before step 1.

## 1. Use the app once

- [ ] `npm install`, then `npx expo start`, then press `w`.
- [ ] Start an empty workout, add Back Squat, type `100` kg and `5` reps, check the set, and tap Finish.
- [ ] Open the **History** tab. The workout should be there. Tap it and read the set.
- [ ] Open the **Progress** tab, tap Back Squat, and switch the chart between 1RM, Weight, and Volume.
- [ ] Run `npm test`. It should say the tests passed.

## 2. Change one sentence

This teaches you where a screen lives. No new feature yet.

- [ ] In `src/features/history/history-screen.tsx`, change the subtitle under the History title.
- [ ] Save and look at the History tab in the browser.
- [ ] Run `npx tsc --noEmit`.

## 3. Create the Firebase project

Workout numbers belong in **Cloud Firestore** (the database). Photos, if you add them later, belong in **Cloud Storage** (files). Sign-in belongs in **Authentication**.

Do this in the [Firebase console](https://console.firebase.google.com/) before writing app code. Ask for the project to be created if you do not have access.

- [ ] Create a project, or open the one you were given.
- [ ] Add a web app and copy the config object (`apiKey`, `authDomain`, `projectId`, and the rest).
- [ ] Turn on **Email/Password** under Authentication. Leave Google for later.
- [ ] Create a Firestore database.
- [ ] Put the web config in a file that is not committed if it contains anything private. The client `apiKey` is not a secret. Never commit a service-account JSON or a private key.

## 4. Sign up, sign in, sign out

Keep the log working when nobody is signed in. The account is an extra, not a lock on the app.

- [ ] Install the client library with `npx expo install firebase`.
- [ ] Add a small account screen: email, password, **Create account**, **Sign in**, and **Sign out**.
- [ ] After sign-in, show the email on the Workout home screen.
- [ ] Sign out returns to the signed-out home screen. The local log stays on the device.
- [ ] A wrong password shows a short message, not a crash.

## 5. Back up the log

The whole log is already one JSON document. `src/data/database.ts` saves it on the device under `rep.database.v1`. Copy that same document to the cloud. Do not invent a second shape for workouts.

- [ ] When someone is signed in, save that document in Firestore at `users/{uid}/backup/log`.
- [ ] Save again after a workout is finished, discarded, or deleted.
- [ ] On sign-in, if this device has no workouts and the cloud does, download the cloud copy.
- [ ] If both sides have data, keep the copy with the newer update and say which one you kept.
- [ ] Add Firestore rules so a user can read and write only `users/{their uid}`. Check this in the Firebase console with two accounts.
- [ ] Sign in on the web app, finish a workout, and find that workout in the Firestore document.

## 6. History, smaller tasks

The list and the detail page already exist (`src/features/history/`). Add to them.

- [ ] Add a search box on History, the same idea as the search on Progress. Match the workout name and the exercise names.
- [ ] When the search matches nothing, show a short empty message.
- [ ] On the workout detail page, the Delete button already asks first. Try it, then confirm the workout is gone from History and from Progress.

## 7. Progress, smaller tasks

The list, the record cards, and the chart already exist (`src/features/progress/`).

- [ ] On one exercise's chart, add a range switch: last 4 weeks, last 3 months, all time.
- [ ] Warmups and incomplete sets stay off the chart and off the records. There is a test for that. Run `npm test` after you filter.
- [ ] The kg/lb switch on Progress still only changes the labels. The saved weight stays kilograms.

## 8. Pick one extra

Do these only after step 5 works. One is enough for a first pull request.

- [ ] **This week** on the home screen: how many workouts were finished in the last 7 days.
- [ ] **Repeat last workout**: a button that starts a new workout copied from the previous finished one.
- [ ] **Plate calculator**: given a target weight, show which plates go on each side of a 20 kg bar. This is display math only. Put it in `src/domain/` and add a test.
- [ ] **Edit a finished workout**: from History, change the reps on a set and see Progress update.
- [ ] **Google sign-in**: add it beside email/password. Email must already work.
- [ ] **A photo on a workout**: upload the file to Cloud Storage under `users/{uid}/photos/`, and save only the path in the workout. The sets themselves stay in Firestore.

## Rules that still apply

- Weight is stored in kilograms.
- The first logged set is not a personal-record banner.
- Warmups and incomplete sets do not count.
- Removing an exercise does not ask for confirmation. Discarding a workout does.
- Do not add a `src/app/` folder.
- Do not edit `ios/` or `android/` by hand.
- Run `npm test` and `npx tsc --noEmit` before you push.
