# First 20 islands: mission presentation visibility

Scope: source audit and local implementation. Not a 20-island visual signoff.
User requested drilling visibility, unobscured major animations and automatic
controller hide/restore. Existing gameplay, rewards and manual tuck state remain
unchanged. Prior release commit f33d2aba remains unpushed; these are follow-up edits.

## Shared change
Hide the ordinary controller while a modal owns attention or a tracked mission
presentation runs. Keep it mounted and preserve its manual tuck state. Stop auto
roll at mission start; hide menu/audio panels. Active skiff/shooter controls are
exempt because they are needed to play. Scene reports changes only at presentation
boundaries and resets the flag on cleanup; no React updates per unchanged frame.
Ambient animation and persistent inspection cameras do not qualify.

## Source audit by runtime island
| Island | Relevant presentation / treatment |
|---|---|
|001|Arrival plus Assembly blast/build/marina; real timelines report ownership.|
|002|Opening ceremony tracked; ordinary re-docking stays playable.|
|003|Drilling/commissioning/thaw tracked; Frostwell cinematic overlay reduced to bottom status strip with Finish control.|
|004|Causeway staged restoration's actual transition flag.|
|005|Concord/collection modal hides controller; ambient island remains unaffected.|
|006|Moon Mirrors staged transition flag.|
|007|Breathline staged transition flag.|
|008|Jungle buildup/zenith camera plus Compass ceremony; no replacement handover authored here.|
|009|Ignition staged transition flag.|
|010|Powerworks existing construction timeline.|
|011|Shared modal/build presentation coverage; no new bespoke camera takeover added.|
|012|Treasure reveal reports actual target/display convergence; fully displayed treasure is not a cinematic.|
|013|Canyon blast camera and train ride ownership.|
|014|Honeyfall reports its 4.8s stage/8.2s finale transition; permanent flowing waterfall releases ownership.|
|015|Modal/build coverage; palace interaction remains intact, no new roof/camera changes.|
|016|Fishing and water-dragon camera ownership reported; fishing HUD retained.|
|017|Summoning (4.5s) and spirit release/settle (4.3s) report ownership; reduced motion bypasses both. Puzzle controls retained.|
|018|Pollination staged transition flag (runtime/source island numbers differ).|
|019|Staged restart plus active Wonder Ride; no hide based on permanently completed mission.|
|020|Mission modal hides ordinary controller; active Iron Skiff controls remain available.|

## Verification gates
Pure policy tests cover active/idle/modal overlap, restoration and interactive
controls. Architecture guard and diff check required. Browser inspection has been
timing out; verify narrow-screen Frostwell, close/skip, reduced motion, travel
during playback and the outstanding rows before claiming complete visual coverage.
Do not silently dismiss unrelated forms or discard player input to show an effect.

Follow-up source audit: all four previously outstanding lifecycle hooks are now
implemented. Found a real Honeyfall overlap: its reward timer fires at 7.2s while
the finale runs 8.2s. Shared win celebrations now queue while a reported world
presentation is active and drain afterward; queued UI receipts clear on island
change and never grant rewards themselves. This does not constitute device or
visual signoff. Prior TypeScript job predates these changes; latest code still
requires a fresh full compile/build after that outstanding job completes.
