import { FAMILIES } from './content';
import { candidateFormArt } from './artCandidates';

// Draft production reservations, not claims that existing reference pictures already comply.
// Silhouette / material / mature attention structure / motion / three-color body palette.
const reservations:Record<number,readonly [string,string,string,string,readonly string[]]> = {
  1:['Split upright root-fork with a low hinged core','Ridged green cork and pale inner pith','Two short vertical seam openings above a settling root brace','Hesitates, then plants one brace deliberately',['#607c3c','#c3bb77','#463e35']],
  2:['Low stepped cairn with an off-centre resting hollow','Matte slate and weathered mineral bands','One long horizontal face groove, uneven stone overhangs','Settles its plates through a slow exhale',['#596879','#bab4a6','#7c998d']],
  3:['Drooping layered shelter with one uncurled edge','Velvet moss membranes over soft porous bark','Downward oval recess shaded by a single shelter fold','Opens one protective layer at a time',['#66794d','#8c6960','#c2b894']],
  4:['Long tapered light-keel with a small offset fin stack','Smoked translucent resin over fibrous ribs','Narrow directional triangular aperture, no paired animal eyes','Turns the aperture before the rest of the body follows',['#b3b666','#385758','#e6d88d']],
  5:['Three broad buoyant arcs around an open centre','Matte sky membranes with frosted edges','Tiny moving notch along the leading arc, no separate head','Skips sideways then pauses mid-arc',['#77a7b5','#d6baa0','#566d8e']],
  6:['Low many-contact floral body, unequal membrane wing pairs','Pollen-soft rose petals with amber transmitting membranes','Tiny widely spaced round amber sensory eyes; petal overhangs and antennae act','Offers one antenna and folds a wing to keep its own space',['#753c62','#df92ac','#efc977']],
  7:['Wide squared load-bearing body on two offset stone struts','Rough ochre stone and cool dark joints','Deep rectangular slit under a straight heavy plate ridge','Braces, shifts a load, then relaxes a strut',['#8c7655','#475365','#b29d78']],
  8:['Low tripodal root-runner growing into a long runner with three fern-sail groups','Layered jade fibre, copper sensory tissue and translucent sail edges','Integrated copper mask with diagonal unequal seed-lenses and one curved groove','Root-feet brace and drive while separate sail groups scan a route',['#46816f','#a8b86e','#9f7356']],
  9:['Broad shallow floating lens with two rippled side flanges','Milk-blue water gel bounded by soft translucent film','A level waterline slit that bends with surrounding tension','Spreads its flanges as inner ripples settle',['#85bcb9','#c5dce1','#658894']],
  10:['Looping tether knot with one weighted root anchor','Wine-coloured thread fibre and pale luminous sap','Small teardrop opening that tracks the tether, not a face mask','Loosens the outer thread while retaining its anchor',['#70475f','#b78b7e','#cdc089']],
  11:['Cluster of unequal airy bellows with open breathing pores','Peach sponge and thin moss-green rims','Three small pore openings; cheek chambers expand instead of smiling','Inflates one chamber and lets a buoyant exhale pass',['#d1a080','#8f9e6c','#765c6e']],
  12:['Flat tessellated crawling raft with one raised tile','Dry olive lichen plates over flexible dark fibres','Two offset polygonal windows, one stays open while tiles adjust','Rearranges outer plates around one fixed contact',['#7b8263','#b6aa77','#525d60']],
  13:['Violet teardrop seed with paired upper lobes and a hooked side arch','Satin luminous husk and translucent indigo leaf edges','Small asymmetric searching lids integrated into husk; one lifted natural ridge','Unfurls one selected light-thread then folds its reserve',['#34224f','#8863d9','#77cdd8']],
  14:['Open upward cistern body on a short curved runner','Jade porcelain-like living shell and warm liquid lining','Soft rising crescent crease with a deep shaded intake','Refills its chamber before tilting a measured offer',['#5d9b89','#d2c499','#597b87']],
  15:['Forward leaning leaf prow with an offset peeking hood','Papery chartreuse lamina and coral-veined margins','Single round off-centre opening half sheltered by a lifted leaf','Peeks around its own hood before advancing',['#a5b456','#c78676','#5c7566']],
  16:['Uneven nested light-bud opening from a slender heel','Pearlescent cream petals and muted lilac interior','Two narrow vertical glints only revealed between opening petals','Reveals an inner glow then steadies the opening',['#b1a0c1','#e1d8bc','#9c8c68']],
  17:['Broken crescent of suspended membrane facets','Smoky violet glass and muted magenta inner veins','One roaming aperture travels along the crescent, no eye sockets','Tests a gap by turning one facet independently',['#756282','#b783a5','#9faeae']],
  18:['Slanted living canopy over a narrow rooted chamber','Waxy blue-green leaf roof and jade living braces','Short oval slots under an overhang, one side always open','Tilts its canopy between shelter and welcome',['#438b82','#9fbb9b','#5d6d89']],
  19:['Fan of unequal rising signal vanes on a folded base','Thin pink opal vanes with sea-green structural ribs','Several aligned signal notches converge into a single focus','Flares its vanes then aligns them into one clear phrase',['#cd84a9','#75aa9d','#b5b9e0']],
  20:['Compressed spring-root coil under a split ember pod','Burnished rust bark with warm amber fissures','Alert tapered vent with a short lifted outer shutter','Compresses, releases once, then leaves room to settle',['#b76243','#dea167','#604e64']],
  21:['Small forward-leaning solar brace with one broad contact pad','Warm ochre mineral skin with coral cushion pads','Two tiny square glints above a rising brace, no snout','Reaches one contact forward despite a slight recoil',['#d4a04e','#b76f63','#77754e']],
  22:['Three unequal navigation facets around a tucked core','Cool pewter mineral film and subdued apricot seams','Small recessed hexagonal focus beneath three aligning planes','Orders three facets in a calm repeatable sequence',['#7597a3','#c3a289','#53627e']],
  23:['Branching open cradle with two equally offered openings','Soft ivory growth branches with dusty rose membranes','Two low almond recesses separated by a branched bridge, never glossy','Offers both branches without steering the other inward',['#cebcac','#ba869b','#7a8b76']],
  24:['Low angular segmented bridge with a narrow examining fore-joint','Smoky blue quartz plates and charcoal elastic seams','Unequal narrow faceted eye slits that examine one joint','Inspects then releases one plate from excessive tension',['#648197','#a5b3b7','#434f65']],
  25:['Compact red vaulted shield with an open protected underside','Charred clay crest and ember-soft lining','Short level eye openings under a firm crest, no mouse face','Opens the protected underside while bracing its front',['#9d594e','#d09574','#493e52']],
  26:['Wide mantle draped around one still suspended pool','Aqua silk membrane and dusky copper rim','Broad relaxed tide apertures placed on opposite mantle folds','Lowers the mantle until its pool becomes still',['#599da3','#b89679','#74869c']],
  27:['Open upright protective ring held by three slender forks','Pale honey mineral ring with moss-gold forks','Small turned focus embedded in the inner ring edge; no deer eyes','Turns the ring toward an opening without closing it',['#c5ac6e','#7e9471','#dad0b3']],
  28:['Offset stack of interlocking vanes with an open central axle','Brushed teal shell and matte brass joints','Rhythmic rectangular apertures align into a calm horizontal gaze','Releases its vanes after completing a useful sequence',['#578f94','#b49760','#536168']],
  29:['Floating zigzag of hinged mirage planes','Smoked lilac film and peach refracting edges','One offset diamond opening appears and disappears as a plane turns','Changes one hinge angle to make a different route visible',['#9982aa','#c99686','#687ea0']],
  30:['Asymmetric living sail on a curved homeward tether','Dry plum membrane and cream woven ribs','Narrow horizon slit in the sail edge with one backward-looking notch','Leans into a direction while the tether stays slack',['#806b91','#c2ad91','#638da0']],
  31:['Suspended face prism inside three unequal branching arches','Pale mineral glass with muted violet growth bands','Tiny upward triangular opening inside the prism; no animal skull','Raises the prism then aligns one branch to the ground',['#b2adc9','#d6c4a2','#73849a']],
  32:['Weathered hollow capsule with a small forward light corridor','Dark indigo porous shell and warm gold inner film','One steady square forward aperture, never a paired pupil face','Advances its light corridor before its surrounding shell',['#333d63','#be9b61','#66808e']],
  33:['Open sunburst of broad warm ribs around a flattened core','Soft coral mineral ribs and muted ochre inner surfaces','Two close-set horizontal channels beneath one broad open plane','Gathers its ribs to restore warmth before opening outward',['#cb8660','#e0b96b','#955b61']],
  34:['Wide slow suspended root canopy around a low hanging seed','Weathered aubergine wood and parchment-thin membranes','Very small reserved gaze at the canopy seam, broad still brow plane','Stills a membrane while its root core turns slowly',['#67546c','#a89779','#789386']],
  35:['Broken crescent frame carrying an off-centre dark mischievous core','Ink-plum ceramic skin with cool iridescent seams','One slit high and one small notch low; uneven knowing lid planes','Turns a forbidden-looking seam into an unexpected opening',['#302b48','#796784','#88aea1']],
  36:['Long angular articulated keel with tiered dorsal planes','Deep teal polished mineral and restrained pale-gold edges','Level rectangular inset gaze below a raised angular plane','Sets a slow shared cadence through successive segments',['#355c69','#9b956d','#879ca5']],
  37:['Loose orbiting ribbon wrapped around an elongated quiet core','Soft terracotta fibre and blue-gray satin lining','Small circular tracking recess along the inside ribbon, not its tip','Revisits a loop then opens one small deviation',['#a57869','#6f8d9d','#c3b099']],
  38:['Open load-bearing lattice around a compact optimistic core','Powder-blue living beams and warm moss pads','Tiny beam-set eyes looking through open structure','Tests a load, then removes one unnecessary brace',['#879eaf','#9caa79','#c5ad8e']],
  39:['Offset folded seasonal veil with a weighted central seam','Dusty apricot fabric-like lamina and blue-lilac underside','Long gently bowed seam opens into a wistful narrow gaze','Releases one old fold while holding the next one loosely',['#bc9583','#9997b2','#7a998f']],
  40:['Off-centre radial resonance core with unequal curling resonators','Copper living core, coral and desaturated teal resonant glass','Directional apertures, no eyes/pupils/mouth; opening and interval express intent','Recomposes a pulse with a deliberate quiet gap',['#8f503e','#dd8068','#5eaba9']],
  41:['Four-foot mantle-crawler growing into a broad arched guardian with three shelter fans','Black-cherry velvet tissue, sage face-plate and dusty-rose hinge fibres','One horizontal recessed sensory band containing three uneven light-notches','Steps out from under its mantle, then plants itself around an open refuge',['#53394c','#7e9784','#af8281']],
  42:['Three tall protective prism walls around a visibly open centre','Frosted sea-glass planes and muted rose joints','Thin vertical observation slit on each outer wall, no central face','Rotates a wall to shelter without sealing the centre',['#77a5a0','#b393a4','#bfc4b3']],
  43:['Two-foot spring-ribbon strider growing into a tall turning body with an immense asymmetric plume','Soft silver-lilac living satin, dusty-rose mask and muted blue sensory seams','Two narrow unequal mask slits separated by a broad plain bridge','Coils inward, then uncoils into a turning stride as balance ribbons open',['#a39bad','#c792a1','#657c94']],
  44:['Three-pad resonant hopper growing into a broad five-support bounding body','Dusty-blue resonant tissue, pale copper aperture membrane and periwinkle springs','Two unequal listening slots above one off-centre acoustic chamber','Leans and listens, then bounds while five reeds answer in different directions',['#7292ab','#c1a08e','#838ba0']],
  45:['Unequal nested lenses with one solid grounding tab','Frosted lavender optical gel and gray-green support film','Several small lens openings with one fixed low focus','Widens two interpretations while one lens stays anchored',['#9a96b4','#79958c','#c1b49d']],
  46:['Low warm hearth chamber with a single sheltering fold','Matte terracotta felt-like shell and rose-gold inner nap','Two rounded tiny amber slots under a low continuous soft ridge','Keeps one fold closed while offering the other outward',['#aa7365','#d4ac8b','#836979']],
  47:['Two uneven receptive membranes around a steady suspended centre','Translucent seafoam films with mauve inner tension fibres','Two soft curved slit openings far from the central core, no otter face','Receives a ripple then lets it pass out without following it',['#7ea9a0','#b291aa','#d0c8b3']],
  48:['Crossing thread scaffolds with three unequal free ends','Rose-brown braided silk and deep olive knots','Tiny opposing knot apertures focus on one reciprocal crossing','Tightens one reciprocal thread while other ends loosen',['#a67d83','#647a67','#c6ae92']],
  49:['Low asymmetric cluster of hooded lenses on a tilted support','Blue-black mineral lens housings and amber cloudy glass','Unequal lens apertures, unused ones close; no lynx eyes or ears','Closes spare lenses once sufficient evidence arrives',['#4c596d','#b49766','#80938e']],
  50:['Nested upright listening hollows with slow opening inner rings','Dark moss growth tissue and warm pale wood-grain rims','A single inclined listening hollow without pupils or a human mask','Repeats a small opening gesture through successive rings',['#536b5d','#a69473','#747a8f']],
};

export const VISUAL_IDENTITIES=FAMILIES.map(family=>{
  const brief=reservations[family.number];
  if(!brief)throw new Error(`Missing visual reservation for ${family.id}`);
  return {familyId:family.id,silhouette:brief[0],material:brief[1],matureAttention:brief[2],motion:brief[3],palette:brief[4],
    dominantEmotion:family.emotions?.[0]??'Brief pending',status:'draft' as const,
    form1Rule:'May soften proportions and use baby-like eyes; preserve the reserved body and attention landmarks.',
    matureRule:'Forms 2+: mature family-specific attention anatomy; no shared glossy baby-eye template, cosmetic eyeliner or obligatory anger.',
  };
});
export const visualIdentityFor=(id:string)=>VISUAL_IDENTITIES.find(brief=>brief.familyId===id);
export const BODY_PLAN_POLICY={totalFamilies:50,creatureBodiedMinimum:40,abstractExceptionMaximum:10} as const;
export const ART_PRODUCTION_BATCHES = [
  {label:'Contrast gate: seed / floral / eyeless resonance',numbers:[13,6,40]},
  {label:'Preferred anchors: protective / mischievous / composed',numbers:[25,35,36]},
  {label:'Remaining preferred reference families',numbers:[8,34,41,42,43,44]},
  {label:'Care and shelter differentiation; review shared-motive pair',numbers:[27,46,9,47,3,23]},
  {label:'Invented attention anatomy: lenses, vanes, lattice and hollows',numbers:[17,28,49,38,45,50]},
  {label:'Grounded common-family silhouette spread',numbers:[1,2,4,5,7,10]},
  {label:'Soft forms without repeated baby faces',numbers:[11,12,14,15,16,18]},
  {label:'Signal, spring, brace, navigation, facets and mantle',numbers:[19,20,21,22,24,26]},
  {label:'Unusual mature membranes, branching and ribbon bodies',numbers:[29,30,31,32,33,37]},
  {label:'Final gaps, then whole-roster collision review',numbers:[39,48]},
].map((batch,index)=>({...batch,order:index+1,families:batch.numbers.map(number=>FAMILIES.find(f=>f.number===number)!)}));
export function artProductionStatus() {
  const forms=FAMILIES.flatMap(f=>f.forms.map(form=>({familyId:f.id,ordinal:form.ordinal,candidate:candidateFormArt(f.id,form.ordinal),approved:form.productionAsset!==null})));
  return {totalFamilies:FAMILIES.length,totalForms:forms.length,candidateForms:forms.filter(f=>f.candidate).length,
    matureFamilies:FAMILIES.filter(f=>f.forms.some(form=>form.ordinal>1&&candidateFormArt(f.id,form.ordinal))).length,
    firstForms:forms.filter(f=>f.ordinal===1&&f.candidate).length,approvedForms:forms.filter(f=>f.approved).length};
}
