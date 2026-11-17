# Workout checklist

A mobile-first, dependency-free HTML/CSS/JavaScript app. Open Push, Pull or Legs & Core to see the checklist. Tap an exercise's large counter after each set; Undo restores the last completed set. A workout stays open across calendar days until you tap Complete workout; progression compares completed workouts.

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

On the home page, **View progression** opens an exercise selector with **Last 10 workouts**, **All workouts** and **Earlier results**. The workout filters include only explicitly completed sessions for that routine. Results show first/latest and heaviest sets, one chart point per completed workout, and every set's actual weight/reps grouped by workout number. Two workouts completed on the same date stay separate; a workout spanning several dates stays together. Switch the chart between weight and reps/seconds; bodyweight exercises chart reps/seconds. Dumbbell weights stay per hand. Separate exercises, equipment and measurement types have separate series.

Changing a routine target from 32 kg to 34 kg does not rewrite earlier 32 kg results. Reset Day clears checklist counters but retains actual results. Undo last set removes the result linked to that checklist tap; Undo Reset restores the counts and links. Reordering or removing a routine exercise preserves its records; removed exercises remain available as archived series.

Use **Add past set** to enter a result after the fact without changing checklist counters. Choose the workout it belongs to, or leave it as an earlier result without a known session. Editing a result preserves its session unless you change that choice. Each saved result can be edited or deleted from Progression. Deleting a result there leaves checklist counts alone. Existing checklist completions are not converted into invented reps or dates. Legacy session/history data remains in backups, and progression starts with the actual results you now record.

Records save in the existing localStorage state as `setRecords`, with a timestamp, actual reps/seconds, weight and snapshots of the exercise name/equipment/day. Exercise `actualSelection` stores the picker draft, and checklist `progressionSetIds` link recorded sets to Undo; reset recovery also stores those links. No existing routine or legacy history records are removed. Export and import include progression, and older backups without records still work. All recording and charts work offline.

To test: choose 5 reps on bench press at 32 kg and tap the counter; check the counter drops once and the result survives refresh. Change its target to 34 kg and log another set; verify both weights are shown in Progression. Switch workout filters and chart type, edit a result, try Add past set, and check reset/Undo Reset retain history. `node tests/progression.test.cjs` runs the progression regression checks.


## Completing workouts across days

Each routine has its own open workout, created automatically when you record a set. Continue yesterday’s incomplete Push workout today: its counters and linked sets remain part of the same session across refreshes and navigation. The checklist shows the workout number and whether it is in progress.

Tap **Complete workout** when finished. Confirming saves that session as completed and clears only that routine’s counters and set undo links, preparing the next workout number. Exercise settings, picker values, and all recorded results remain saved. You can finish with some sets skipped; the confirmation makes this explicit. Empty workouts cannot be completed. A rest timer for that routine is dismissed.

**Undo completion** reopens the saved workout and restores its counters and set links. It survives refreshes until you log a set in the next workout or use Reset Day. Completing and undoing completion roll back if saving fails. Reset Day remains a counter recovery tool: it retains results in the same open workout and does not complete it or start another session.

Existing checklist progress is retained. During migration, only results linked to current checklist counts (or reset recovery) join the open workout. Other earlier results stay accessible under Earlier results without invented session boundaries. Counts without recorded results do not gain invented weights or reps. Original legacy active/history data remains preserved.

Backups include routine IDs, `workoutSessions`, open `sessionId` references, and each result’s optional `sessionId`. Import validates session identities, numbering, and references; older backups still work. As with reset recovery and timers, completion undo recovery is cleared on import. Set timestamps remain as supporting details; progression grouping and ordering use workout identity and number.

Checks: finish half a workout, reload and log more sets on another day, then complete it and verify one chart point. Complete two workouts on the same date and verify separate points. Cancel completion, undo completion after refresh, log the next workout, verify other routines remain untouched, and export/import both open and completed sessions.
