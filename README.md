# Workout checklist

A mobile-first, dependency-free HTML/CSS/JavaScript app. Open Push, Pull or Legs & Core to see the checklist. Tap an exercise's large counter after each set; Undo restores the last completed set. There are no start/finish sessions or history screens.

## Run locally

```bash
cd /home/c/Projects/workout-app
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000 in a modern browser. Stop the server with Ctrl+C. Keep using the same browser profile, hostname and port to access the same saved data.

## Progress and editing

Progress saves automatically in localStorage, including across refreshes and day navigation. Reset Day asks for confirmation and clears only that day's completed counts. Exercise editing supports name, equipment, weight, total sets, reps or seconds. Edits preserve completed counts and notes. If total sets are reduced below the completed count, the exercise shows Done; Undo can reduce that count. Tap Edit Day at the top of a day to reveal exercise editing, removal and Add exercise. Tap Done Editing to return to the uncluttered checklist. Counters and Undo stay available. Dumbbell weights are per hand. Seconds in exercise targets remain targets, separate from the optional rest timer.

## Existing saved data

Storage still uses `clay-training-v1`. On first use of the checklist, the original JSON is copied to `clay-training-v1-before-checklist` before migration. Schema version 2 adds `completed` to each routine exercise. Completed sets from an unfinished session are copied to matching exercise IDs once. Saved routine settings remain authoritative; session-specific weight/reps and exercises no longer in the routine remain in the preserved legacy active record. Existing history and active records remain in saved data but have no interface and impose no restrictions. Migration does not reapply old progress after resets.

Export backup downloads the current state, legacy records, and (when present) the original data under `beforeChecklist`. Import backup accepts current exports and older session-based exports after validation and confirmation. It replaces the current routines, progress and settings. Before replacement, current data is saved under `clay-training-v1-before-import` and included in the next export under `beforeImport`. To recover it, save that nested object as a JSON file and import it. Import preserves the backed-up exercise settings without reapplying the one-time corrections. Clearing browser site data removes local records, so export before migrating browsers/devices. Corrupt JSON is not overwritten; migration also stops if the original cannot be backed up.

## Offline support

The service worker caches a complete app release on its first successful online load. Updates download while online and wait until all app windows/tabs close before activation; close and reopen after downloading an update. Offline startup needs a previously cached visit at the same address. Updates never clear workout localStorage. See [DEPLOYMENT.md](DEPLOYMENT.md) for free HTTPS hosting, Pixel installation, data migration and release instructions.

## Manual checks

1. Open each day directly and tap counters through Done; undo a completed set.
2. Navigate between days and refresh/reopen the browser. Counts should persist independently.
3. Edit weight, sets and reps. Check saved values and completed counts after refresh.
4. Cancel Reset Day, then confirm it. Only that day's counts should clear.
5. Add/remove an exercise; check the confirmation on removal.
6. Export a backup and inspect its JSON. Existing users should see preserved legacy records and `beforeChecklist`.
7. After an online load and caching completes, stop the server and reload to check offline operation.
8. Check on a Pixel 10 (or mobile browser emulation): button size, scrolling, dialog controls and absence of horizontal overflow.

Confirmed defaults: skull crushers 2 × 20 with 11 kg dumbbells per hand; swings 3 × 15 with 24 kg dumbbells; goblet squat 3 × 10 with a 24 kg kettlebell. These corrections apply once to matching saved routine exercises without clearing progress. Subsequent edits remain editable and are not reapplied on reload. Legacy session/history records are unchanged.

The home page Dark mode button switches the whole app, including the editor. The preference is saved with your workout data and included in exports.

## Progress, rest and reset recovery

Each day displays completed sets and a progress bar, capped at the current target for each exercise. Edit Day reveals Move up / Move down buttons; order saves immediately without changing exercise progress.

Each day has a Start rest button and a Rest duration selector at the top. The default is 3:00; select a different duration to save it for that day. Completing sets never starts or stops a timer. Start rest begins (or restarts) the countdown manually; changing the duration affects the next countdown. Skip rest dismisses it. The deadline saves across refreshes and navigation. It shows Rest complete when elapsed; it does not issue background notifications or play audio. A closed or backgrounded browser may delay the display update until you return. Old per-exercise rest settings remain in saved data for preservation but are ignored and no longer editable.

After Reset Day, Undo Reset Day restores the prior completed counts without changing settings. This recovery survives navigation and refreshes, but clears when you complete or undo a set on that same day. Another reset replaces the previous recovery snapshot.

Additional checks: verify the progress bar responds to count/undo/reset; check the default 3:00 rest button, set different durations on different days and check manual start, refresh, skip and completion; verify completing sets never starts or restarts a timer; move exercises and refresh; reset and restore counts; export then import (test cancellation first); reject malformed or invalid JSON without changing data.

## Android installation

The project is prepared for GitHub Pages and Android Chrome installation. Nothing has been published. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for setup, installation and future updates.

## Progression records

Each exercise has a native scrolling **Reps completed** picker with values **1–30**. Choose the reps you actually achieved, then tap the large remaining-sets counter: this saves one timestamped result at the exercise's saved weight and completes one checklist set, without opening a dialog. The picker initially uses your target (capped at 30), and remembers your selection per exercise across taps, navigation and refreshes. Timed exercises have a **Seconds completed** picker (1–3600) so carries can still record 60 seconds or another duration. Changing a target or measurement in Edit exercise resets the picker to that new target; changing the picker itself does not alter your routine target. Undo reverses the last checklist completion and its linked result.

On the home page, **View progression** opens an exercise selector and Week / Month / Year / All time filters. These mean the last 7 / 30 / 365 local calendar days (including today), or all recorded dates. Results show first/latest and heaviest sets, a daily chart and every set's actual weight/reps. Switch the chart between weight and reps/seconds; bodyweight exercises chart reps/seconds. Dumbbell weights stay per hand. Separate exercises, equipment and measurement types have separate series.

Changing a routine target from 32 kg to 34 kg does not rewrite earlier 32 kg results. Reset Day clears checklist counters but retains actual results. Undo last set removes the result linked to that checklist tap; Undo Reset restores the counts and links. Reordering or removing a routine exercise preserves its records; removed exercises remain available as archived series.

Use **Add past set** to enter a result after the fact without changing today's counters. Each saved result can be edited or deleted from Progression. Deleting a result there leaves checklist counts alone. Existing checklist completions are not converted into invented reps or dates. Legacy session/history data remains in backups, and progression starts with the actual results you now record.

Records save in the existing localStorage state as `setRecords`, with a timestamp, actual reps/seconds, weight and snapshots of the exercise name/equipment/day. Exercise `actualSelection` stores the picker draft, and checklist `progressionSetIds` link recorded sets to Undo; reset recovery also stores those links. No existing routine or legacy history records are removed. Export and import include progression, and older backups without records still work. All recording and charts work offline.

To test: choose 5 reps on bench press at 32 kg and tap the counter; check the counter drops once and the result survives refresh. Change its target to 34 kg and log another set; verify both weights are shown in Progression. Switch time periods and chart type, edit a result, try Add past set, and check reset/Undo Reset retain history. `node tests/progression.test.cjs` runs the progression regression checks.
