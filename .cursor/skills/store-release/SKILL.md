---
name: store-release
description: >-
  Publish the Rep Expo app to the Apple App Store and Google Play with EAS
  Build and EAS Submit. Use when the user asks about shipping, store listings,
  TestFlight, Play Console, bundle ids, signing, eas build, eas submit, Apple
  login, an App Store Connect API key, or what it costs to publish.
---

# Store release

Rep ships from Windows through EAS. Do not create or edit `ios/` or `android/` by hand. Expo Go is for development, not the stores. Use `npx eas-cli@latest`. The global `eas-cli` on this machine is too old.

Read the `expo` major version in `package.json`, then confirm commands against `https://docs.expo.dev/llms.txt` before running them. Guides: [create a build](https://docs.expo.dev/build/setup/), [App Store submit](https://docs.expo.dev/submit/ios/), [Play submit](https://docs.expo.dev/submit/android/).

Read [local.md](local.md) for this computer's Apple team and API key. That file is gitignored. If it is missing, ask for the `.p8` path, Key ID, and Issuer ID. Do not ask for the file contents.

## Who does what

The agent runs:

- Expo device login. Start it, take the number the user sends, and resume the login.
- `app.json` identifiers, `eas.json`, and `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`.
- Android production builds. EAS creates the keystore in non-interactive mode. Do not rotate or delete it.
- The iOS build once the App Store Connect API key environment variables are set.
- `Y` on `Generate a new Apple Distribution Certificate?` and `Generate a new Apple Provisioning Profile?` in a real terminal.
- `eas submit` for iOS, which lands in TestFlight, and for Android, which stays on the internal track.

The user has to do:

- Keep the Apple Developer membership Active. If the Apple Account is already the Account Holder, renew that membership. Do not enroll a second time. After payment, the page can still say Expired for a day or two.
- Create the App Store Connect app, screenshots, age rating, and review notes. Support URL is `https://www.voiddeck.digital/en/contact`. Privacy URL is `https://www.voiddeck.digital/en/rep/privacy`. `supportsTablet` is true, so Apple also wants a 13-inch iPad screenshot.
- Approve Apple sign-in on their iPhone, and type an Apple ID password into a real terminal. This chat shell has no keyboard (`process.stdin.isTTY` is false), so EAS treats it as non-interactive and will not accept that password here.
- Create the App Store Connect API key in the browser when the password path is locked. Apple error `-20209` means the account is locked. Do not retry the password. A passkey can still open the website. The user downloads the `.p8` once and sends the path, Key ID, and Issuer ID.
- Create the Play Console app with package `com.cheejiayuan.rep`, make the service-account JSON, and finish Data safety and the content rating. A personal Play account needs 12 testers opted in for 14 days on closed testing before production. Internal testing does not count. An organization account skips that wait.
- Submit the TestFlight build for App Review, and promote the Play release to production.

## This machine

Set these before an iOS build or submit. Values are in [local.md](local.md).

- `EXPO_ASC_API_KEY_PATH`
- `EXPO_ASC_KEY_ID`
- `EXPO_ASC_ISSUER_ID`
- `EXPO_APPLE_TEAM_ID`
- `EXPO_APPLE_TEAM_TYPE`

The first distribution certificate cannot be created when EAS is non-interactive. Open a real PowerShell window with those variables and run the iOS build there. Answer the certificate and provisioning-profile questions `Y`. Later builds can use the stored credentials.

Do not commit `*.p8`, `*.p12`, a Play service-account JSON, or `mcp-shell.log`.

## Identifiers

These are already chosen. Do not change the bundle id or package after the first upload.

- Bundle id and Android package: `com.cheejiayuan.rep`
- Expo project: `@cheejiayuan512/Rep`. The project id is `extra.eas.projectId` in `app.json`.
- Apple team: `ZC96W3Y7JU`, type `INDIVIDUAL`
- App Store name: Rep Workout Log. SKU `rep-ios`
- `eas.json` production profile uses `autoIncrement`. Android submit track is `internal`.

## Commands

```powershell
npx eas-cli@latest build --platform android --profile production --non-interactive --no-wait
npx eas-cli@latest build --platform ios --profile production --no-wait
npx eas-cli@latest submit --platform ios --id BUILD_ID --non-interactive --no-wait
```

The iOS submit needs the same API key variables. It uploads to TestFlight and stops.

## Public release stays manual

TestFlight is not the App Store. In App Store Connect, attach the build and submit it for review.

Play internal testing is not production. Finish the listing, content rating, and privacy policy, then promote the release.

Rep stores workouts on the device. Privacy answers should say the app does not upload the log. Change that answer before shipping Firebase backup from `docs/todo.md`.

A free app pays no store commission. If the app later sells digital goods, look up the current Apple and Google commission before stating a percentage.

## Later versions

Bump `expo.version` in `app.json` for each user-facing release. Each upload needs a new build number. Leave `autoIncrement` on rather than editing native projects.

Follow [release-automation](../release-automation/SKILL.md) for repeat uploads. Do not turn the first release into a push-to-`master` workflow.
