"""Author Island001 V2 hatchery from approved images, not from retired runtime meshes.
Run Blender --background --python scripts/island001-v2-blender/hatchery.py.
Logical axes X right, Y up, Z front; Blender coordinates are (X,-Z,Y).
"""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/gauntlets/island-001-v2/blender-route/hatchery'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
    for data in list(datablocks):
        if data.users == 0: datablocks.remove(data)


def xyz(p): return (p[0], -p[2], p[1])
def empty(name, parent=None, stage=None):
    obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj); obj.parent=parent
    if stage is not None: obj['constructionStage']=stage
    return obj
root=empty('ISLAND_001_V2_LOTUS_HATCHERY')
root['assetStatus']='draft-family02-correction-b04'; root['representation']='explicit-solid-arcades-and-seven-layered-inward-glazing-vaults'
root['landmarkId']='hatchery'; root['logicalAxes']='Y-up; front+Z; root ground0'
root['sockets']={'lift':[.72,.15,1.07], 'egg':[0,1.365,-.20]}
owners={name:empty('hatchery-'+name,root,i+1) for i,name in enumerate(['terraces','wings','conservatory','egg'])}

def material(name,color,rough=.65,metal=0,alpha=1):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.diffuse_color=(*color,alpha)
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,alpha)
    bsdf.inputs['Roughness'].default_value=rough;bsdf.inputs['Metallic'].default_value=metal;bsdf.inputs['Alpha'].default_value=alpha
    if alpha<1:
        mat.use_backface_culling=False
        try:mat.surface_render_method='BLENDED'
        except (TypeError,AttributeError):pass
    return mat
stone=material('ivory-limestone',(0.79,.74,.63)); trim=material('light-limestone',(0.9,.85,.74));
brass=material('structural-brass',(.66,.43,.16),.32,.68)
glass=material('blue-petal-glass',(.25,.63,.84),.2,.02,.43)
water=material('cascade-water',(.13,.57,.68),.27,.05)
eggmat=material('pale-egg',(.88,.9,.82),.28,.05)


def mesh(name,verts,faces,mat,owner,level=1):
    data=bpy.data.meshes.new(name+'-mesh');data.from_pydata([xyz(v) for v in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=owners[owner]
    obj.data.materials.append(mat);obj['buildLevel']=level;obj['constructionStage']=owners[owner]['constructionStage'];obj['semanticOwner']='hatchery-'+owner
    return obj

def modifier_apply(obj,mod):
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

def bevel(obj,width=.018,segments=2):
    mod=obj.modifiers.new('authored-soft-stone-edges','BEVEL');mod.width=width;mod.segments=segments
    modifier_apply(obj,mod)
    return obj

def slab(name,outline,bottom,top,mat=stone,owner='terraces',level=1,edge=.008):
    n=len(outline);verts=[(x,y,z) for y in [bottom,top] for x,z in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,mat,owner,level)
    if edge:bevel(o,edge,2)
    return o


# FAMILY 2: walls are positive solid masonry pieces. There are NO Boolean cuts.
# A room consists of floor, full-height corner/bay piers, spandrels above each
# round opening, and a continuous roof. Each roof has measured support stations.
roof_contracts=[]
def oriented_solid(name,profile,a,b,depth,mat=stone,owner='wings',level=1):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);ux,uz=dx/length,dz/length;nx,nz=-uz,ux
    verts=[(a[0]+ux*s+nx*d,y,a[1]+uz*s+nz*d) for d in [-depth/2,depth/2] for s,y in profile]
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,owner,level)

def arcade_run(name,a,b,bottom,top,pitch=.68,depth=.115,owner='wings',level=1):
    length=math.dist(a,b);count=max(1,round(length/pitch));bay=length/count
    # Positive piers always remain connected to the floor and roof.
    pier=min(.115,bay*.22);opening=bay-pier;archrise=min(opening*.52,(top-bottom)*.35)
    spring=top-.085-archrise
    stations=[];support=[]
    for i in range(count+1):
        s=i*bay;half=pier*.5
        obj=oriented_solid(f'{name}-pier-{i}',[(s-half,bottom),(s+half,bottom),(s+half,top+.006),(s-half,top+.006)],a,b,depth,owner=owner,level=level)
        support.append(obj.name)
        stations.append({'x':a[0]+(b[0]-a[0])*i/count,'z':a[1]+(b[1]-a[1])*i/count,'support':obj.name})
    for i in range(count):
        left=i*bay+pier*.5;right=(i+1)*bay-pier*.5
        profile=[]
        for k in range(21):
            q=-1+2*k/20
            profile.append(((left+right)*.5+q*opening*.5,spring+archrise*math.sqrt(max(0,1-q*q))))
        profile.extend([(right,top+.006),(left,top+.006)])
        obj=oriented_solid(f'{name}-arch-spandrel-{i}',profile,a,b,depth,owner=owner,level=level)
        support.append(obj.name)
    return stations,support

def room(name,outline,bottom,top,level=1,pitch=.68,roof_thickness=.1):
    slab(name+'-interior-floor',outline,bottom-.045,bottom+.012,trim,'wings',level,edge=.004)
    stations=[];supports=[]
    for i,(a,b) in enumerate(zip(outline,outline[1:]+outline[:1])):
        st,sp=arcade_run(name+f'-wall-{i}',a,b,bottom,top,pitch,level=level)
        stations+=st;supports+=sp
    roof=slab(name+'-supported-occupied-roof',outline,top-.012,top+roof_thickness,trim,'wings',level,edge=.006)
    roof_contracts.append({'name':name,'roof':roof.name,'floorTop':bottom+.012,'roofUnderside':top-.012,'stations':stations,'supports':supports,'level':level})
    return roof

# Low, broad connected nursery wraps inhabited arches around all elevations.
grade=[(-1.43,-.35),(-1.23,-.91),(-.53,-1.11),(.66,-1.09),(1.25,-.81),(1.49,-.13),(1.37,.65),(.89,1.16),(.21,1.29),(-.61,1.2),(-1.24,.76),(-1.48,.18)]
slab('continuous-lower-arrival-court',grade,0,.18,stone,edge=.022)
foot=[(-1.29,-.47),(-1.05,-.88),(-.4,-.98),(.72,-.94),(1.17,-.63),(1.27,.20),(.96,.53),(-.85,.53),(-1.29,.30)]
room('lower-nursery',foot,.23,.895,1,.70,.10)
# Positive interior arcade is a real cross-gallery, not a solid retaining block.
st,sp=arcade_run('interior-cross-gallery',(-1.10,-.25),(1.12,-.25),.23,.895,.74)
roof_contracts[0]['stations']+=st;roof_contracts[0]['supports']+=sp
# Additive L2 shoulder has a complete occupied arched room, including long side
# and front facades, not only a roof. Its piers stand on the L1 court.
upper=[(.70,-.88),(1.06,-.76),(1.23,-.47),(1.23,.23),(.75,.34),(.68,-.30)]
room('upper-right-nursery',upper,.995,1.56,2,.59,.10)
# Localized asymmetric west court shoulder, seated on the existing roof.
# This is part of the coupled envelope correction; it preserves both stair
# endpoints and gives a real stepped terrace beside the narrowed lower roots.
west_shoulder=[(-1.22,-.43),(-1.04,-.80),(-.70,-.86),(-.66,-.59),(-.73,-.18),(-.78,.06),(-1.14,.06)]
slab('west-raised-occupied-court-shoulder',west_shoulder,.990,1.115,trim,'wings',1,.006)
slab('west-court-approach-step-1',[(-1.20,.15),(-.89,.15),(-.89,.24),(-1.20,.24)],.990,1.035,trim,'wings',1,.002)
slab('west-court-approach-step-2',[(-1.20,.06),(-.89,.06),(-.89,.15),(-1.20,.15)],.990,1.075,trim,'wings',1,.002)

# Independently authored smooth plan curves for stairs, with continuous support and parapets.
def catmull(points,t):
    scaled=t*(len(points)-1);i=min(len(points)-2,int(scaled));u=scaled-i
    p0=Vector(points[max(i-1,0)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(i+2,len(points)-1)])
    return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)

def stair(name,points,width):
    count=22;from_y=.18;to_y=.995;strip=[]
    for i in range(count+1):
        t=i/count;p=catmull(points,t);before=catmull(points,max(0,t-.001));after=catmull(points,min(1,t+.001));direction=(after-before).normalized();normal=Vector((-direction.y,direction.x))
        strip.append((p,normal))
    # A solid closed load-bearing ramp, not detached steps.
    verts=[]
    for i,(p,n) in enumerate(strip):
        top=from_y+(to_y-from_y)*i/count
        for side,y in [(-1,.14),(1,.14),(1,top),(-1,top)]:
            q=p+n*side*width*.5;verts.append((q.x,y,q.y))
    faces=[]
    for i in range(count):
        for f in range(4):faces.append((i*4+f,i*4+(f+1)%4,(i+1)*4+(f+1)%4,(i+1)*4+f))
    faces += [(3,2,1,0),(count*4,count*4+1,count*4+2,count*4+3)]
    mesh(name+'-continuous-stair-support',verts,faces,stone,'terraces')
    for i in range(count):
        a,na=strip[i];b,nb=strip[i+1];outline=[]
        for p,n,sign in [(a,na,-1),(b,nb,-1),(b,nb,1),(a,na,1)]:
            q=p+n*width*.5*sign;outline.append((q.x,q.y))
        y=from_y+(to_y-from_y)*(i+1)/count
        slab(name+'-tread-'+str(i),outline,y-(to_y-from_y)/count-.026,y,trim,edge=.002)
    for side in [-1,1]:
        verts=[]
        for i,(p,n) in enumerate(strip):
            y=from_y+(to_y-from_y)*i/count
            for offset,h in [(-.025,y-.025),(.025,y-.025),(.025,y+.11),(-.025,y+.11)]:
                q=p+n*(side*width*.5+offset);verts.append((q.x,h,q.y))
        mesh(name+'-curved-parapet-'+str(side),verts,faces,trim,'terraces')
stair('west-sweeping-stair',[(-.33,1.12),(-.71,1.07),(-1.02,.85),(-1.21,.57),(-1.11,.28)],.29)
stair('east-sweeping-stair',[(1.08,.79),(1.32,.48),(1.36,.15),(1.21,-.04),(.98,-.19)],.29)


# Broad descending landings are connected to the approach and both stair sides.
# Their positive arch support construction follows the same family as the rooms.
basin=[(-.56,.43),(.82,.43),(1.10,.57),(1.12,.76),(.86,.91),(.45,.91),(.33,.96),(-.44,.91),(-.66,.69)]
base_supports=[];base_stations=[]
for i,(a,b) in enumerate(zip(basin,basin[1:]+basin[:1])):
    st,sp=arcade_run('cascade-gallery-'+str(i),a,b,.18,.525,.55,.09,'terraces')
    base_stations+=st;base_supports+=sp
slab('middle-cascade-landing',basin,.515,.575,trim,edge=.007)
roof_contracts.append({'name':'middle-cascade-gallery','roof':'middle-cascade-landing','floorTop':.18,'roofUnderside':.515,'stations':base_stations,'supports':base_supports,'level':1})
slab('middle-pool-water',[(-.44,.54),(.77,.54),(.98,.63),(.99,.71),(.81,.80),(.38,.80),(.26,.85),(-.36,.81),(-.53,.69)],.576,.587,water,edge=0)
low=[(-.43,.85),(.36,.86),(.46,1.10),(.30,1.24),(-.10,1.22),(-.16,1.07),(-.48,1.0),(-.55,.90)]
slab('lower-shallow-pool-landing',low,.176,.32,trim,edge=.012)
slab('lower-pool-water',[(-.34,.91),(.29,.92),(.38,1.08),(.25,1.16),(-.03,1.15),(-.09,1.02),(-.39,.95)],.321,.336,water,edge=0)
def waterfall(name,width,path):
    verts=[(x,y,z) for y,z in path for x in [-width/2,width/2]];faces=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)]
    obj=mesh(name,verts,faces,water,'terraces');mod=obj.modifiers.new('water-sheet-volume','SOLIDIFY');mod.thickness=.009;modifier_apply(obj,mod)
waterfall('upper-cascade-water-sheet',.52,[(.997,.43),(.98,.53),(.61,.59),(.587,.68)])
waterfall('lower-cascade-water-sheet',.37,[(.588,.81),(.57,.93),(.36,1.0),(.336,1.05)])
def curve_tube(name,points,radius,mat,owner,level):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=2;curve.resolution_u=3
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*xyz(co),1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj['buildLevel']=level;obj['constructionStage']=owners[owner]['constructionStage'];obj['semanticOwner']='hatchery-'+owner
    obj.data.materials.append(mat);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
    return obj



# FINAL FAMILY 2 CORRECTION: the seven architectural bays now form a shelter.
# Three principal pointed vault fans reach one common crown above the egg;
# four lower side petals overlap them and retain separate lateral pointed tips.
# Positive nursery architecture and all its contact stations remain unchanged.
BASE=.995;CENTER_Z=-.20;CROWN=2.46

def gothic(u):return math.sqrt(max(0,(4-(1+abs(u))**2)/3))
def cubic(a,b,c,d,t):return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def vault_point(degrees,u,v):
    angle=math.radians(degrees)+u*math.radians(64)
    # Root narrower than middle; substantial upper return all the way to crown.
    radius=cubic(.48,1.12,.80,0,v)*(1-.07*u*u*math.sin(math.pi*v))
    y=BASE+(CROWN-BASE)*v-.14*u*u*math.sin(math.pi*v)
    return (math.sin(angle)*radius,y,CENTER_Z+math.cos(angle)*radius)

def entry_start(u):
    # Front root arch has a 76-degree physical opening, including opaque clay.
    angle=u*64
    return .66*gothic(angle/38) if abs(angle)<=38 else 0

def glazed(name,verts,faces,level):
    obj=mesh(name,verts,faces,glass,'conservatory',level)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    mod=obj.modifiers.new('paired-glazing-surfaces','SOLIDIFY');mod.thickness=.008;mod.offset=0;modifier_apply(obj,mod)
    for poly in obj.data.polygons:poly.use_smooth=True
    return obj

petal_contract=[];glazing_objects=[]
for number,degrees in enumerate([0,120,-120]):
    rows=30;us=sorted(set([-1+2*j/40 for j in range(41)]+([-38/64,38/64] if degrees==0 else [])))
    verts=[];faces=[]
    for u in us:
        start=entry_start(u) if degrees==0 else 0
        for j in range(rows+1):verts.append(vault_point(degrees,u,start+(1-start)*j/rows))
    for i in range(len(us)-1):
        for j in range(rows):
            k=i*(rows+1)+j;faces.append((k,k+rows+1,k+rows+2,k+1))
    obj=glazed('principal-inward-vault-'+str(number+1),verts,faces,1);glazing_objects.append(obj)
    # Each structural boundary is a complete sweeping root-to-crown arch.
    for side in [-1,1]:
        curve_tube(f'principal-vault-{number+1}-root-to-crown-{side}',[vault_point(degrees,side,j/44) for j in range(45)],.019,brass,'conservatory',1)
    if degrees==0:
        doorway=[vault_point(0,(-38+76*j/64)/64,entry_start((-38+76*j/64)/64)) for j in range(65)]
        curve_tube('principal-front-open-entrance-arch',doorway,.022,brass,'conservatory',1)
    # No continuous complete sill: the roots and entrance remain visually open.
    petal_contract.append({'name':obj.name,'angleDegrees':degrees,'tipHeight':CROWN,'tipXZ':[0,CENTER_Z],'buildLevel':1,'representation':'pointed-inward-vault-reaching-shared-central-crown','frontDoor':degrees==0})

# Lower side petals retain the family's pointed arch boundary construction,
# but the bottom rooted zones narrow and the middle spreads laterally.
def side_point(degrees,height,spring,u,y):
    a=math.radians(degrees);t=max(0,min(1,(y-BASE)/(height-BASE)))
    if t<.40:
        q=t/.40;r=.45+.27*math.sin(q*math.pi/2);half=.22+.14*math.sin(q*math.pi/2)
    else:
        q=(t-.40)/.60;r=.72-(.72-.43)*q**1.15;half=.36-.10*q
    x=half*u;r-=.035*u*u
    return (math.sin(a)*r+math.cos(a)*x,y,CENTER_Z+math.cos(a)*r-math.sin(a)*x)

for number,degrees in enumerate([58,-58,126,-126],4):
    height=2.23 if abs(degrees)==58 else 2.30;spring=1.34
    rows=22;cols=32;verts=[];faces=[]
    def top(u):return spring+(height-spring)*gothic(u)
    for i in range(cols+1):
        u=-1+2*i/cols
        for j in range(rows+1):verts.append(side_point(degrees,height,spring,u,BASE+(top(u)-BASE)*j/rows))
    for i in range(cols):
        for j in range(rows):
            k=i*(rows+1)+j;faces.append((k,k+rows+1,k+rows+2,k+1))
    obj=glazed('lower-layered-side-petal-'+str(number),verts,faces,2);glazing_objects.append(obj)
    for side in [-1,1]:
        pts=[side_point(degrees,height,spring,side,BASE+(spring-BASE)*i/10) for i in range(11)]
        pts += [side_point(degrees,height,spring,side*(1-i/30),top(side*(1-i/30))) for i in range(1,31)]
        curve_tube(f'lower-side-petal-{number}-rooted-frame-{side}',pts,.019,brass,'conservatory',2)
    petal_contract.append({'name':obj.name,'angleDegrees':degrees,'tipHeight':height,'tipXZ':[math.sin(math.radians(degrees))*.43,CENTER_Z+math.cos(math.radians(degrees))*.43],'buildLevel':2,'representation':'lower-pointed-side-petal-with-narrow-root-and-middle-swell','frontDoor':False})

# Geometric shelter test, not a likeness verdict: cast downward over the egg's
# centre and a disk around it. Actual principal glass must roof this interior.
bpy.context.view_layer.update()
shelter_checks=[]
for radius in [0,.10,.20,.28]:
    for j in range(1 if radius==0 else 12):
        angle=2*math.pi*j/12;x=math.sin(angle)*radius;z=CENTER_Z+math.cos(angle)*radius
        hits=[]
        for obj in glazing_objects[:3]:
            hit,location,normal,index=obj.ray_cast(Vector(xyz((x,3.0,z))),Vector((0,0,-1)))
            if hit and location.z>1.70:hits.append({'glass':obj.name,'height':location.z})
        shelter_checks.append({'xz':[x,z],'overheadGlass':hits,'passed':len(hits)>0})
if not all(c['passed'] for c in shelter_checks):raise RuntimeError('Principal vault leaves an uncovered egg/court sample')
(OUT/'family02-correction-b04-shelter-checks.json').write_text(json.dumps({'status':'geometry-only-not-visual-approval','principalCrown':[0,CROWN,CENTER_Z],'samples':shelter_checks},indent=2)+'\n')
# Smooth oval with horizontal surface tangent at each pole, housed inside the open conservatory.
verts=[];faces=[];rings=24;segments=40
for ring in range(rings+1):
    phi=math.pi*ring/rings;y=1.055+.62*(1-math.cos(phi))*.5;r=.215*math.sin(phi)*(1.05+.10*math.cos(phi))
    for j in range(segments):
        a=j/segments*math.pi*2;verts.append((math.sin(a)*r,y,math.cos(a)*r-.2))
for ring in range(rings):
    for j in range(segments):faces.append((ring*segments+j,ring*segments+(j+1)%segments,(ring+1)*segments+(j+1)%segments,(ring+1)*segments+j))
egg=mesh('one-sheltered-smooth-ovoid',verts,faces,eggmat,'egg');bm=bmesh.new();bm.from_mesh(egg.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(egg.data);bm.free()
for poly in egg.data.polygons:poly.use_smooth=True
cradle=[(math.sin(i/48*math.pi*2)*.25,math.cos(i/48*math.pi*2)*.25-.2) for i in range(48)]
slab('low-egg-cradle',cradle,.985,1.058,brass,'egg',edge=.006)


# Added west shoulder and its approach steps contact the retained occupied roof.
bpy.context.view_layer.update()
shoulder_contacts=[]
roof_obj=bpy.data.objects['lower-nursery-supported-occupied-roof']
for x,z in [(-.93,-.45),(-.87,-.70),(-.96,-.10),(-1.05,.20),(-1.05,.10)]:
    hit,location,normal,index=roof_obj.ray_cast(Vector(xyz((x,1.25,z))),Vector((0,0,-1)))
    passed=bool(hit) and abs(location.z-.995)<.0001
    shoulder_contacts.append({'xz':[x,z],'roofHit':bool(hit),'roofTop':location.z if hit else None,'shoulderBottom':.990,'passed':passed})
if not all(c['passed'] for c in shoulder_contacts):raise RuntimeError('New west court shoulder lacks roof contact')
(OUT/'family02-correction-b04-shoulder-checks.json').write_text(json.dumps({'contacts':shoulder_contacts},indent=2)+'\n')

# Mechanical support proof BEFORE joining: ray casts address positive piers
# directly, never the roof itself. A roof is supported at every perimeter pier
# and each cross-gallery pier, with real masonry touching its underside.
bpy.context.view_layer.update()
support_checks=[]
for contract in roof_contracts:
    checks=[]
    for station in contract['stations']:
        obj=bpy.data.objects[station['support']]
        origin=Vector(xyz((station['x'],contract['roofUnderside']+.05,station['z'])))
        inv=obj.matrix_world.inverted();hit,location,normal,index=obj.ray_cast(inv@origin,Vector((0,0,-1)))
        y=(obj.matrix_world@location).z if hit else None
        ys=[(obj.matrix_world@v.co).z for v in obj.data.vertices]
        valid=hit and abs(y-(contract['roofUnderside']+.018))<.003 and min(ys)<=contract['floorTop']+.002
        checks.append({'support':obj.name,'station':[station['x'],station['z']],'rayHit':bool(hit),'actualTop':y,'minY':min(ys),'maxY':max(ys),'roofUnderside':contract['roofUnderside'],'contactPass':valid})
    supports=[]
    for name in contract['supports']:
        obj=bpy.data.objects[name];obj.data.calc_loop_triangles()
        supports.append({'name':name,'vertices':len(obj.data.vertices),'triangles':len(obj.data.loop_triangles)})
    passed=all(c['contactPass'] for c in checks) and all(s['triangles']>0 for s in supports)
    support_checks.append({'roof':contract['roof'],'buildLevel':contract['level'],'passed':passed,'stations':checks,'solidSupports':supports})
    if not passed:raise RuntimeError('Roof support geometry failed: '+contract['name'])
(OUT/'family02-correction-b04-support-checks.json').write_text(json.dumps({'status':'mechanical-check-only','noBooleanModifiers':not any(m.type=='BOOLEAN' for o in bpy.data.objects for m in o.modifiers),'roofChecks':support_checks},indent=2)+'\n')
# Consolidate only geometry sharing a semantic owner, funded level and material.
# Logical owner hierarchy and L1/L2 selection remain intact; no cross-owner flattening.
for owner_name,owner in owners.items():
    buckets={}
    for obj in list(owner.children):
        if obj.type!='MESH':continue
        key=(obj.get('buildLevel',1),obj.data.materials[0].name)
        buckets.setdefault(key,[]).append(obj)
    for (level,mat_name),objects in buckets.items():
        sources=[o.name for o in objects]
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();joined=bpy.context.object
        joined.name=f'{owner_name}-level{level}-{mat_name}';joined['sourceParts']=sources;joined['buildLevel']=level;joined['constructionStage']=owner['constructionStage'];joined['semanticOwner']=owner.name
        joined.select_set(False)

# Deterministic geometry report, not a render/likeness verdict.
mins=[float('inf')]*3;maxs=[-float('inf')]*3;radius=0;triangles=0;mesh_reports=[]
for obj in root.children_recursive:
    if obj.type!='MESH':continue
    obj.data.calc_loop_triangles();tri=len(obj.data.loop_triangles);triangles+=tri
    invalid=0
    for vertex in obj.data.vertices:
        p=obj.matrix_world@vertex.co;v=(p.x,p.z,-p.y)
        if not all(math.isfinite(n) for n in v):invalid+=1
        for axis,n in enumerate(v):mins[axis]=min(mins[axis],n);maxs[axis]=max(maxs[axis],n)
        radius=max(radius,math.hypot(v[0],v[2]))
    mesh_reports.append({'name':obj.name,'triangles':tri,'buildLevel':obj['buildLevel'],'constructionStage':obj['constructionStage'],'invalidVertices':invalid,'sourceParts':list(obj['sourceParts'])})
if radius>1.6:raise RuntimeError(f'Footprint violation: {radius}')
if any(m['invalidVertices'] for m in mesh_reports):raise RuntimeError('Non-finite geometry')
report={'status':'draft-awaiting-browser-QC','axes':'glTF Y-up,front+Z,rootground0','bbox':{'min':mins,'max':maxs},'maxRadius':radius,'triangles':triangles,'meshCount':len(mesh_reports),'owners':list(o.name for o in owners.values()),'meshes':mesh_reports,'petals':petal_contract,'roofSupportChecks':[{k:c[k] for k in ['roof','buildLevel','passed']} for c in support_checks],'sourceScript':str(Path(__file__).relative_to(ROOT)),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'family02-correction-b04-geometry.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'family02-correction-b04.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'family02-correction-b04.glb'),export_format='GLB',use_selection=False,export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('HATCHERY_REPORT '+json.dumps({k:report[k] for k in ['bbox','maxRadius','triangles','meshCount']}))
