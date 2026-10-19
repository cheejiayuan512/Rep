---
name: store-release
description: >-
  Publish the Rep Expo app to the Apple App Store and Google Play with EAS
  Build and EAS Submit. Use when the user asks about shipping, store listings,
  TestFlight, Play Console, bundle ids, signing, eas build, eas submit, or
  what it costs to publish.
---

# Store release

Rep ships from Windows through EAS. Do not create or edit `ios/` or `android/` by hand. Expo Go is for development, not the stores.

Read the `expo` major version in `package.json`, then confirm commands against `https://docs.expo.dev/llms.txt` before running them. Current guides: [create a build](https://docs.expo.dev/build/setup/), [App Store submit](https://docs.expo.dev/submit/ios/), [Play submit](https://docs.expo.dev/submit/android/).

## Identifiers

`app.json` has no `ios.bundleIdentifier` or `android.package`. Both are required, and they must not change after the first store upload.

Ask before writing them. The working example is `com.cheejiayuan.rep` for both.

## First release

Do this by hand once, so Expo stores the signing credentials.

1. Confirm an Expo account, an Apple Developer membership, and a Google Play Console account. Quote fees only after checking [Apple](https://developer.apple.com/programs/whats-included/), [Play Console](https://support.google.com/googleplay/android-developer/answer/6112435), and [expo.dev/pricing](https://expo.dev/pricing). The shape is an annual Apple fee, a one-time Play registration, and the EAS Free plan (a monthly cap of iOS and Android builds, low-priority queue). Do not recommend a paid EAS plan unless builds are frequent.
2. Create the app in App Store Connect and in Play Console with those identifiers.
3. `npm install --global eas-cli`, then `eas login`, then `eas build:configure`.
4. Let EAS generate the Android keystore and the iOS distribution certificate. Do not rotate or delete them. A lost Android keystore blocks updates to the same Play listing.
5. `eas build --platform android --profile production` produces an `.aab`. `eas build --platform ios --profile production` produces an `.ipa`.
6. `eas submit --platform android` and `eas submit --platform ios`.

Play submit needs a Google service account key uploaded with `eas credentials --platform android`. The first submit lands on the internal testing track. iOS lands in TestFlight after processing. EAS does not write the store description, screenshots, or privacy answers.

## Public release stays manual

TestFlight is not the App Store. In App Store Connect, attach the build and submit it for review.

Play internal testing is not production. Finish the listing, content rating, and privacy policy, then promote the release.

Rep stores workouts on the device. Privacy answers should say the app does not upload the log. Change that answer before shipping Firebase backup from `docs/todo.md`.

A free app pays no store commission. If the app later sells digital goods, look up the current Apple and Google commission before stating a percentage.

## Later versions

Bump `expo.version` in `app.json` for each user-facing release. Each upload needs a new build number. Set `"autoIncrement": true` on the production build profile in `eas.json` rather than editing native projects.

Follow [release-automation](../release-automation/SKILL.md) for repeat uploads. Do not turn the first release into a push-to-`master` workflow.
