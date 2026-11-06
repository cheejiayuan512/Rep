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
- Create the App Store Connect app, age rating, and review notes. Support URL is `https://www.voiddeck.digital/en/contact`. Privacy URL is `https://www.voiddeck.digital/en/rep/privacy`. `supportsTablet` is true, so Apple also wants a 13-inch iPad screenshot.
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
- Live Activity extension: `com.cheejiayuan.rep.ExpoWidgetsTarget`, App Group `group.com.cheejiayuan.rep`. Both the app and the extension need a profile with that App Group. The iOS push entitlement is stripped by `plugins/without-push-entitlement.js` because Rep sends no remote push.
- App Store name: Rep Workout Log. SKU `rep-ios`
- `eas.json` production profile uses `autoIncrement`. Android submit track is `internal`.

## Screenshots

`npm run assets` builds the store screenshots from the real app. It exports the web bundle, opens it in Chromium at each store size, seeds the demo log, and frames every screen on a backdrop. No Mac and no simulator.

- Output: `store-assets/ios/iphone-6.9`, `store-assets/ios/ipad-13`, `store-assets/android/phone`.
- Sizes: 1320 x 2868 (iPhone 6.9"), 2064 x 2752 (iPad 13"), 1080 x 1920 (Play phone). These are the sizes the stores accept.
- `scripts/store-shots.ts` is the shot list, the caption on each shot, and which devices take it.
- `fixtures/Rep-demo-log.json` is the log on screen. Regenerate it with `npm run seed:demo`.
- `store-assets/manifest.json` stores the source hash. `npm run assets:if-changed` exits early when the app source, the demo log, and the shot list are unchanged, so a patch release reuses the committed PNGs.
- Commit the PNGs. Only `store-assets/.cache` is ignored.

The web build reports no safe-area insets, so the capture sets the probe `react-native-safe-area-context` measures to the values a real device reports. Without that the tab bar is 49pt tall and clips its own labels. The same script widens the tab label box, which react-native-web renders as an inline box.

Optional backdrops go in `store-assets/art/backdrop-phone.png` (1320 x 2868) and `backdrop-tablet.png` (2064 x 2752). Without them every frame uses the gradient.

`npm run art` draws them with a local ComfyUI server, so it is free and offline. It needs ComfyUI running (`python main.py --port 8188`) with `DreamShaper_8_pruned.safetensors` in `models/checkpoints/`. `npm run art:force` redraws both. The script blurs and dims the result, because a backdrop that looks like a screenshot would be misleading metadata; the UI itself is always a real capture. Commit the PNGs, not the server.

The same run also writes `store-assets/play/icon.png` (512 x 512) and `feature-graphic.png` (1024 x 500). Play will not publish a listing without them, and they are the only drawn images in the set.

## Copy

`store-assets/features.json` is the description: an `intro`, an array of feature `paragraphs`, and an `outro`. Edit a paragraph there, not the 1300-character blob.

`npm run copy` prints the assembled description and the release notes. `npm run copy:write` saves them into `store-assets/listing.json`.

- Release notes come from `whats-new.json` `bullets` when it has any.
- Otherwise they are the commit subjects since the previous tag that touched `src/`, `App.tsx`, `index.ts`, `app.json`, or `assets/`, filtered to drop chore/docs/ci commits.
- With no previous tag there is nothing honest to generate, so the notes already in the listing stay.

Names, keywords, URLs, and contact details are editorial and are never generated. `scripts/store-copy.ts` writes only `description` and `whatsNew`.

## Video

`npm run video` writes `store-assets/video/walkthrough.mp4`: 1080 x 1920, H.264, about 26 seconds, no audio. It is a real recording of the web build - it resumes the live session, ticks off sets (the app's own check animation and rest timer), finishes it, opens a past workout, and shows progress and strength levels - played inside the same frame, backdrop, and caption style the screenshots use, with a wordmark intro and outro.

The stage adds a slow Ken Burns drift on the phone and a wipe on the lime rule at each caption. Captions are keyed to the raw capture's clock and fire when the screen actually changes, so a slow click cannot desync them.

It records twice: once for the app, once for the stage. `--keep-raw` keeps the bare capture. `FFMPEG_PATH` overrides the ffmpeg location.

Play does not accept a video file. It takes a **YouTube URL** in `store-assets/listing.json` as `android.video`, so the clip has to be uploaded by hand and the link pasted in.

It is not an App Store app preview. Apple requires previews to be captured from the app on a device or simulator, and this machine is Windows.

## Listing and upload

`store-assets/listing.json` is the single source for the store text: App Store name, subtitle, keywords, promo text, description, release notes, and URLs; Play title, short description, contact details, and optional video. Edit that file, not the consoles.

`npm run upload` is a dry run. It checks every length limit, every screenshot size, and prints what it would send. `npm run upload:apply` writes to both stores.

- App Store Connect: name, subtitle, privacy URL on the app info; description, keywords, promo text, support/marketing URL, and release notes on the version; screenshots replaced set by set. 6.9" screenshots upload into `APP_IPHONE_67` because the API has no `APP_IPHONE_69`.
- Google Play: one edit with the listing text, contact details, icon, feature graphic, and phone screenshots, then committed. A failed upload discards the edit.
- `--prune` deletes App Store screenshot sets this script does not fill. Use it once to drop the old 6.1" set.
- `store-assets/upload.json` records the last pushed hash, so `npm run upload:if-changed` can skip a store whose inputs have not moved. It is committed so the tag workflow can skip too; a local upload leaves it dirty.

Credentials: locally `EXPO_ASC_API_KEY_PATH` and `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` are file paths. On an Expo worker the same values come from the `production` environment variables `EXPO_ASC_API_KEY` and `GOOGLE_SERVICE_ACCOUNT_KEY`, which arrive as paths to the files the worker wrote. `scripts/store-upload.ts` accepts either shape.

The version has to be editable. App Store Connect refuses writes to a version that is waiting for review or already live, so bump `expo.version` in `app.json` before uploading again.

## Commands

```powershell
npx eas-cli@latest build --platform android --profile production --non-interactive --no-wait
npx eas-cli@latest build --platform ios --profile production --no-wait
npx eas-cli@latest submit --platform ios --id BUILD_ID --non-interactive --no-wait
```

The iOS submit needs the same API key variables, and `eas.json` must point at them with `ascApiKeyPath`, `ascApiKeyIssuerId`, and `ascApiKeyId`. Android submit needs `serviceAccountKeyPath` set to `$GOOGLE_SERVICE_ACCOUNT_KEY_PATH`. Set that variable to the Play JSON path before `eas submit`. Without those fields, `--non-interactive` tries to create the keys and fails. The iOS upload lands in TestFlight and stops.

EAS CLI substitutes those `$VARIABLE` paths from the environment where it runs, so they resolve on this computer. On Expo workers the variables are unset and the paths resolve to empty, which makes Expo Submit use the key assigned to the app instead. Assign both keys once with `eas credentials --platform ios` (App Store Connect: Manage your API Key) and `eas credentials --platform android` (Google Service Account) before the first workflow run.

`npm run release` runs `eas build --platform all --profile production --auto-submit`. `release:ios` and `release:android` do one platform.

## Public release stays manual

TestFlight is not the App Store. In App Store Connect, attach the build and submit it for review.

Play internal testing is not production. Finish the listing, content rating, and privacy policy, then promote the release.

Rep stores workouts on the device. Privacy answers should say the app does not upload the log. Change that answer before shipping Firebase backup from `docs/todo.md`.

A free app pays no store commission. If the app later sells digital goods, look up the current Apple and Google commission before stating a percentage.

## Later versions

Bump `expo.version` in `app.json` for each user-facing release. Each upload needs a new build number. Leave `autoIncrement` on rather than editing native projects.

Follow [release-automation](../release-automation/SKILL.md) for repeat uploads. Do not turn the first release into a push-to-`master` workflow.
