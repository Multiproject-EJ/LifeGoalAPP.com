# Robot-family building movement contract

This contract defines how the three HabitGame helpers construct, repair, decorate and present things. The motion names are semantic actions, not generic looping animation labels.

## Shared physical rules

- All three hover while working. The hover core stabilizes against tool forces rather than bobbing freely during precise contact.
- Hands and tools approach a target, establish contact, perform the action, then release. Avoid limbs moving through the body or a carried object.
- Shoulder, elbow and wrist pivots remain independently addressable so future inverse kinematics can replace the procedural poses without rebuilding the model.
- Modular sockets are part of the action vocabulary: attach, verify lock, use, stow and detach.
- Reduced-motion mode keeps the readable key pose and removes rapid strokes, spins and celebratory oscillation.

## Role choreography

| Action | Heavy Worker | Project Manager / PA | Mini Artist |
| --- | --- | --- | --- |
| Listen | Lowers primary hands and aims crown sensors | Tilts toward speaker; curious brain network | Pauses brush and turns visor toward speaker |
| Work | Alternates primary-arm pressure while crown arms hold fasteners/tools | Tracks progress and indicates the current operation | Performs short precision strokes or part placement |
| Lift / install | Raises both primary arms symmetrically; crown arms stabilize the top edge | Marks target height/orientation and checks alignment | Inspects seam or inserts small fixings |
| Carry / stabilize | Cradles load close to the shell to keep its center of mass controlled | Leads the route and signals clearance | Trails the load, watching corners and loose pieces |
| Direct project | Holds ready pose | Pointer sweeps between task and teammate; curious/focused brain | Stops tool motion and acknowledges instruction |
| Inspect work | Crown manipulators probe joins while main hands support | Slow pointer scan; focused progress/check brain | Leans toward detail with brush held clear |
| Paint / detail | Holds panel or workpiece steady | Points out detail region and records completion | Leads with repeated wrist/brush strokes; tray stays level |
| Celebrate | Opens arms and raises crown manipulators | Energized spiral brain and upward pointer | Raises both small arms with a quick happy turn |

## Project Manager brain states

- **Calm waveform:** idle, waiting, background coordination.
- **Curious network:** listening, asking, routing information or directing a new task.
- **Focused progress:** planning, inspecting, measuring and supervising active construction.
- **Energized spiral:** success, discovery, urgent positive momentum.

## Required future animation hooks

- Contact targets for both Heavy Worker palms and both crown claws.
- Carry-object anchor centered between the Heavy Worker's hands.
- Pointer tip target and gaze/visor target for the Project Manager.
- Brush tip target plus tray-level constraint for the Mini Artist.
- Add-on attach/detach events and socket occupancy state.
- Hover stabilization strength so lifting reads as weight-bearing rather than weightless waving.
