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

Add this only after credentials exist and the GitHub repo is connected to the Expo project. Trigger on version tags, not on `master`.

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build_android:
    type: build
    params:
      platform: android
      profile: production
  build_ios:
    type: build
    params:
      platform: ios
      profile: production
  submit_android:
    needs: [build_android]
    type: submit
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
  submit_ios:
    needs: [build_ios]
    type: submit
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
```

Save it as `.eas/workflows/release.yml`. Release with `git tag v1.0.1` and `git push origin v1.0.1`.

Do not add the Expo "deploy to production" example that fingerprints `main` and publishes an over-the-air update. EAS Update is out of scope until a store binary is already in testers' hands.

Confirm workflow syntax against `https://docs.expo.dev/eas/workflows/examples/deploy-to-production/` before changing the file. That page's `main` trigger is not this project's trigger.
