# Island 014 signature mission candidates

Scoring uses phone-scale visual WOW, thematic fit, deterministic world change,
replay value, mobile cost and compatibility with the canonical 36-tile board.

| # | Mission | Visual payoff | WOW | Fit | Cost | Decision |
|---|---|---|---:|---:|---:|---|
| 1 | The Great Honeyfall Coronation | Four nectar reservoirs feed the palace; its crown opens, a liquid-honey helix rises, hex cells illuminate outward, bees form a living crown and every cliff fall swells into a golden cascade. | 10 | 10 | 7 | **Selected** |
| 2 | Queen Bee Sky Parade | Build launch flowers that release a choreographed bee air fleet trailing pollen ribbons around the palace. | 9 | 9 | 6 | Runner-up; weaker persistent world change. |
| 3 | Royal Jelly Volcano | Uncap a deep jelly spring that erupts through the central court and crystallises into amber bridges. | 9 | 8 | 8 | Too close to a volcano and risks route obstruction. |
| 4 | Honeycomb City Bloom | Repair pollinator engines so flowers rapidly bloom across every terrace in a colour wave. | 8 | 10 | 5 | Beautiful but less singular than the coronation. |
| 5 | The Living Wax Cathedral | Collect wax seals and watch robots extrude ornate new palace wings cell by cell. | 8 | 9 | 7 | Overlaps landmark construction rather than feeling like a unique mission. |
| 6 | Nectar Constellation | Aim giant honey lenses that draw a glowing bee constellation across the sky and awaken distant hive islets. | 9 | 8 | 6 | Strong sky moment, weaker gooey-honey emphasis. |
| 7 | The Golden Swarm Rescue | Rescue trapped worker swarms and reunite them in a giant spiralling bee tornado that powers the city. | 8 | 8 | 7 | Motion-heavy and less readable at low quality. |
| 8 | Hive Archives Memory River | Release illuminated story glyphs that flow like honey from the Archives through the whole kingdom. | 8 | 9 | 6 | More contemplative than spectacular. |
| 9 | Nectar Trials Grand Prix | Open a flower-to-flower bee race with moving gates, pollen boosts and a palace finish. | 8 | 8 | 8 | Fun but needs a separate racing interaction surface. |
| 10 | Amber Moon Harvest | Rotate giant honey mirrors to catch a golden moonbeam and turn the waterfalls luminous at night. | 9 | 8 | 8 | Requires a full day/night variant and changes the source mood.

## Selected mission: The Great Honeyfall Coronation

Player loop proposal:

1. The mission unlocks after its canonical briefing acknowledgement.
2. Four route-relative Royal Nectar pickup clusters award one sealed nectar
   charge each through canonical roll-action state.
3. The mission tray spends one earned charge at a time through a mutex-protected
   action service. Each spend opens one persistent reservoir and lights one
   palace conduit; progression is monotonic and cycle-scoped.
4. The fourth spend commits completion before presentation begins.
5. Presentation focuses the palace, opens the crown valves, raises a viscous
   honey helix, runs a large readable honeycomb light wave, gathers the bee
   crown and thickens every island honeyfall. Reduced motion shows the same
   committed result as a restrained crown opening, glow wave and settled full
   falls without camera flight or fast particles.
6. Completion leaves the reservoirs, conduits, open crown and richer honeyfalls
   visible in the world. A developer query replays the spectacle without
   changing canonical state.

The mission animation owns no gameplay truth. It reads the committed before
and after stage and remains interrupt-safe.
