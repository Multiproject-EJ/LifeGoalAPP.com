# Island 006 ↔ 016 Swap: Fisherman's Village and Moonveil Nexus

Date: 2026-09-27
Runtime islands: 006 and 016

## User Decision

Eivind moved Fisherman's Village forward so it plays right before the
underwater Island 007 (Abyssal Pearl Kingdom). Fisherman's Village is an
entertaining early island, and its fisherman will later hint that a creature
egg is buried in the water world.

- runtime 006 → source pack 022 (Fisherman's Village, *The Hundred-Kilo Catch*)
- runtime 016 → source pack 006 (Moonveil Nexus, *Rephase the Moon Mirrors*)

Source-pack identities and file names do not change.

## Why 006 and not 004

Islands 006, 011 and 016 are the Journey Disc Arena cadence
(`(n - 1) % 5 === 0`) and both islands have the ordinary role, so a 006 ↔ 016
swap keeps every Arena, Boss and Disc Arena beat in the same place.

## Runtime Contract

- `FISHERMANS_VILLAGE_ISLAND_NUMBER = 6`; the moon-mirrors staged descriptor is
  keyed to 16. Board code reads the constant, never a literal.
- The staged restoration presentation (moon mirror stages, palette, finale
  height) follows runtime 16.
- Mission ledgers are keyed by `cycle:island`. A different mission type in a
  slot is ignored and the correct mission starts fresh, so only a player who is
  *currently* on 006 or 016 restarts that island's signature mission.
  Landmarks, wallets and all other islands are unaffected.
- Voyage Map portraits for 006 and 016 were recaptured.

## Rollback

Reverse the two routing rows, the constant, the descriptor key and the two
briefing entries. No save data is deleted.
