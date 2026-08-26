# Projection route decision

Decision: skip reference projection for the world materials.

The source is a UI-heavy portrait composite rather than a de-lit orthographic
surface reference. Projecting its pixels would bake text, HUD, lighting,
perspective and occlusion into the procedural world and would fail at orbit
angles. Honey, bronze, wax-stone, rock, foliage and flower response will be
authored as independent procedural PBR materials from cropped evidence. The
source remains the camera/palette/identity comparison target.
