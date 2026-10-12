# Stride

A React Native + Expo fitness journal with a lavender, sage, and charcoal interface. Runs on Android, iOS, and web.

## Run

```powershell
cd D:\react-native\stride
npm.cmd install
npm.cmd start
```

Scan the Expo QR code with a compatible Expo Go installation. Use `npm.cmd run android` with an Android emulator, or `npm.cmd run web` for the browser preview. Local iOS simulator builds require macOS; a physical iPhone can connect through Expo Go.

## Included

- Daily movement ring with automatic step counting from the phone's motion sensor (`expo-sensors` Pedometer), plus distance and walking-calorie estimates.
- Seven-day steps chart; manual entry when the sensor is off, unavailable, or denied, and "add missed steps" when it is live.
- Step-goal streaks with progress toward 3-, 7-, 14-, and 30-day milestones.
- Water logging with undo and configurable goals.
- Yoga, strength, and cardio routines with a pause/resume timer.
- Completed sessions, estimated calories, and a rolling seven-day activity chart.
- Editable profile and goals; progress saved locally with AsyncStorage.
- Mobile bottom navigation and a desktop sidebar.

First launch shows **6,840 sample steps and 3 sample glasses**, labeled in the interface. New days start at zero. Steps: on iOS, Stride reads today's total from Core Motion, so steps taken while the app is closed are included, and it backfills the past six days. On Android, Stride reads today's total and the past six days from **Health Connect** (filled by the phone itself or by Google Fit, Samsung Health, Fitbit, etc.), so steps walked with the phone in a pocket and the app closed are included. It refreshes on open and every two minutes, and the live pedometer adds steps in between. Health Connect needs a development or EAS build (it is not in Expo Go). Without it, Android falls back to the pedometer, which only counts while Stride is open. Automatic counting can be turned off in Profile. The web preview always uses manual entry. Workout photos are bundled for offline use. Closing a workout discards its timer; completing it saves the session. Data stays on the current device/browser; there is no account or cloud synchronization.

Workout photography: Unsplash, photo IDs `1544367567-0f2fcb009e0b`, `1517836357463-d25dfeac3438`, and `1538805060514-97d9cc17730c`.

The generated Expo dependency tree currently reports 23 npm audit findings (7 moderate, 16 high). Compatible fixes were applied; remaining findings involve upstream dependencies. Avoid `npm audit fix --force`, which proposes downgrading the Expo framework to an incompatible major version.

## Android APK

The `preview` profile in `eas.json` builds a standalone, signed APK for direct installation on an Android phone.

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile preview
```

On the first build, allow EAS to create/link the Expo project and generate an Android keystore. When the build finishes, open the APK download link on your phone, download it, and allow installation from your browser when Android prompts. This build runs without Expo Go or a development server.

## Verify

```powershell
npm.cmd run typecheck
npm.cmd run build:web
npm.cmd test
```

Browser tests require Playwright Chromium (`npx.cmd playwright install chromium`). Tests cover logging persistence, profile validation, workout timing, responsive rendering, daily rollover, and weekly aggregation. Screenshots are saved in `screenshots/`.

To view the exported build: `npm.cmd run preview`, then visit http://127.0.0.1:8081.
