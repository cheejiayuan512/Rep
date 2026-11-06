---
name: release-automation
description: >-
  Automate Rep releases to TestFlight and Play internal testing. Use when the
  user asks about CI, EAS Workflows, auto-submit, tags, or deploying to the
  App Store or Play Store on push.
---

# Release automation

Automate the upload to testers. Do not automate the public release, and do not run a production build on every push to `master`.

`master` receives direct pushes. The EAS Free plan has a monthly build cap. A workflow on every commit spends that cap and can ship a broken tree. Apple still requires a person to submit a TestFlight build for App Review.

## Default command

After the first manual release in [store-release](../store-release/SKILL.md), ship with:

```bash
eas build --platform all --profile production --auto-submit
```

`--auto-submit` uses the submit profile with the same name as the build profile. iOS goes to TestFlight and stops. It does not start App Review.

## Play track

In `eas.json`, keep Android on internal testing:

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "completed"
      }
    }
  }
}
```

Do not set `track` to `production`. Promoting to the public Play track stays a Play Console action.

## Tag workflow

`.eas/workflows/release.yml` is the tag workflow. It builds both platforms with the `production` profile, then submits iOS to TestFlight and Android to the internal track. Trigger on version tags, not on `master`. Run it by hand with `npx eas-cli@latest workflow:run release.yml`.

It needs two things set up once:

- The GitHub repo connected to the Expo project, so a tag push starts the run.
- The App Store Connect API key and the Play service account key assigned to the app in Expo. `eas.json` points its key paths at `$EXPO_ASC_API_KEY_PATH` and `$GOOGLE_SERVICE_ACCOUNT_KEY_PATH`; on Expo workers those variables are unset, so the paths resolve to empty and Expo Submit falls back to the key assigned to the app. Assign them with `eas credentials --platform ios` and `eas credentials --platform android`.

Release with:

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Listing and screenshots

The tag workflow ends with a `store_listing` job. After both submits succeed it installs Chromium, runs `npm run assets:if-changed`, `npm run copy:write`, and `npm run upload:if-changed`. A failed build never touches the store page.

It reads four variables from the `production` environment: `EXPO_ASC_API_KEY`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, and `GOOGLE_SERVICE_ACCOUNT_KEY`. The two keys are secret file variables, created with `eas env:create production --name EXPO_ASC_API_KEY --value <path to .p8> --type file --visibility secret`. They are already set for this project.

The screenshots it uploads are the committed PNGs unless the app source moved since they were made. `store-assets/manifest.json` holds a content hash, so a clean CI checkout still matches. Run `npm run assets` before tagging when you have changed the UI, so the frames you reviewed are the ones that ship.

`npm run upload:apply` on this computer does the same thing without a tag. Use it when only the copy changed.

Do not add the Expo "deploy to production" example that fingerprints `main` and publishes an over-the-air update. EAS Update is out of scope until a store binary is already in testers' hands.

Confirm workflow syntax against `https://docs.expo.dev/eas/workflows/examples/deploy-to-production/` before changing the file. That page's `main` trigger is not this project's trigger.
