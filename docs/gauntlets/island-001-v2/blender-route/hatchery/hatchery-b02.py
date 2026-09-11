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
root['assetStatus']='draft-blockout-b02'; root['representation']='authored-blender-lofts-and-boolean-arcades'
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

def ring_shell(name,outer,bottom,top,owner,level=1,thickness=.11):
    cx=sum(v[0] for v in outer)/len(outer);cz=sum(v[1] for v in outer)/len(outer)
    inner=[]
    for x,z in outer:
        vec=Vector((x-cx,z-cz));vec.normalize();inner.append((x-vec.x*thickness,z-vec.y*thickness))
    n=len(outer);verts=[]
    for y in [bottom,top]:
        verts += [(x,y,z) for x,z in outer]+[(x,y,z) for x,z in inner]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,j+2*n,i+2*n),(i+n,i+3*n,j+3*n,j+n),(i+2*n,j+2*n,j+3*n,i+3*n),(i,i+n,j+n,j)])
    return mesh(name,verts,faces,stone,owner,level)

def arch_cutter(name,cx,cz,axis,width,bottom,height,depth):
    ax,az=axis;normal=(-az,ax);r=width/2;spring=bottom+height-r
    profile=[(-r,bottom-.06),(r,bottom-.06),(r,spring)]
    profile += [(math.cos(math.pi*i/20)*r,spring+math.sin(math.pi*i/20)*r) for i in range(1,21)]
    verts=[]
    for d in [-depth/2,depth/2]:
        verts.extend([(cx+ax*u+normal[0]*d,y,cz+az*u+normal[1]*d) for u,y in profile])
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,stone,'wings')

def cut_arcades(obj,outline,bottom,height,bay_size=.53):
    for edge,(a,b) in enumerate(zip(outline,outline[1:]+outline[:1])):
        dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
        if length<.32:continue
        count=max(1,int(length/bay_size));pitch=length/count
        for bay in range(count):
            t=(bay+.5)/count;w=min(pitch-.10,height*.83)
            if w<.19:continue
            cutter=arch_cutter('temporary-arch-cut',a[0]+dx*t,a[1]+dz*t,(dx/length,dz/length),w,bottom,height-.085,.44)
            mod=obj.modifiers.new('vaulted-through-passage','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
            modifier_apply(obj,mod);bpy.data.objects.remove(cutter,do_unlink=True)
    bevel(obj,.009,2)

# Broad grade apron connects the entire nursery and both stair approaches.
grade=[(-1.43,-.35),(-1.23,-.91),(-.53,-1.11),(.66,-1.09),(1.25,-.81),(1.49,-.13),(1.37,.65),(.89,1.16),(.21,1.29),(-.61,1.2),(-1.24,.76),(-1.48,.18)]
slab('continuous-lower-arrival-court',grade,0,.18,stone,edge=.022)
# One hollow, connected nursery; rooms span the middle as well as the sides.
foot=[(-1.29,-.47),(-1.05,-.88),(-.4,-.98),(.72,-.94),(1.17,-.63),(1.27,.2),(.99,.51),(-.92,.51),(-1.29,.3)]
slab('lower-nursery-continuous-interior-floor',foot,.17,.235,trim,'terraces')
main=ring_shell('lower-nursery-vaulted-perimeter',foot,.23,.91,'wings')
cut_arcades(main,foot,.23,.68)
# Transverse vaulted gallery provides depth and supports the usable court above.
gallery=slab('cross-gallery-structural-wall',[(-1.12,-.3),(1.1,-.3),(1.1,-.19),(-1.12,-.19)],.23,.91,stone,'wings',edge=0)
for x in [-.74,0,.74]:
    cutter=arch_cutter('temporary-cross-vault',x,-.245,(1,0),.52,.23,.61,.4)
    mod=gallery.modifiers.new('open-interior-vault','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;modifier_apply(gallery,mod);bpy.data.objects.remove(cutter,do_unlink=True)
bevel(gallery,.009)
slab('broad-continuous-rooftop-egg-court',foot,.885,.995,trim,'terraces',edge=.014)
# Deliberate asymmetric second-level room; all its new geometry has buildLevel2.
upper=[(.44,-.95),(1.04,-.94),(1.31,-.60),(1.35,.07),(.81,.10),(.78,-.66),(.45,-.72)]
upper_landing=[(.43,-.98),(1.08,-.97),(1.37,-.60),(1.39,.22),(.74,.26),(.69,-.60),(.42,-.68)]
slab('upper-right-nursery-floor',upper_landing,.975,1.035,trim,'wings',2)
second=ring_shell('upper-right-nursery-open-room',upper,1.03,1.59,'wings',2,.085)
cut_arcades(second,upper,1.03,.56,.5)
slab('upper-right-nursery-roof-terrace',upper,1.565,1.66,trim,'wings',2,.012)

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

# Shallow basins are parts of wide landings, with a vaulted gallery under the middle pool.
basin=[(-.54,.44),(.84,.44),(1.07,.62),(.98,.77),(.46,.80),(.37,.92),(-.44,.91),(-.64,.72)]
slab('middle-cascade-landing',basin,.405,.565,trim,edge=.013)
# Joined vaulted perimeter, rather than a narrow free-standing slab on a front wall.
face=ring_shell('middle-landing-continuous-vaulted-support',basin,.175,.435,'terraces',1,.09)
for x in [-.16,.25]:
    cutter=arch_cutter('temporary-water-gallery',x,.86,(1,0),.32,.175,.245,.40)
    mod=face.modifiers.new('low-vaulted-landing','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;modifier_apply(face,mod);bpy.data.objects.remove(cutter,do_unlink=True)
bevel(face,.006,2)
slab('middle-pool-water',[(-.45,.54),(.75,.54),(.94,.63),(.86,.70),(.40,.72),(.30,.83),(-.37,.82),(-.53,.70)],.566,.582,water,edge=0)
low=[(-.43,.85),(.36,.86),(.45,1.13),(.28,1.24),(-.10,1.22),(-.16,1.07),(-.48,1.0),(-.55,.9)]
slab('lower-shallow-pool-landing',low,.176,.32,trim,edge=.012)
slab('lower-pool-water',[(-.34,.91),(.29,.92),(.37,1.1),(.24,1.16),(-.03,1.15),(-.09,1.02),(-.39,.95)],.321,.336,water,edge=0)

def waterfall(name,width,path):
    verts=[(x,y,z) for y,z in path for x in [-width/2,width/2]];faces=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)]
    obj=mesh(name,verts,faces,water,'terraces');mod=obj.modifiers.new('water-sheet-volume','SOLIDIFY');mod.thickness=.009;modifier_apply(obj,mod)
waterfall('upper-cascade-water-sheet',.49,[(.997,.42),(.98,.52),(.61,.59),(.582,.68)])
waterfall('lower-cascade-water-sheet',.36,[(.584,.78),(.57,.91),(.36,.99),(.336,1.04)])

# Seven separate authored Bezier loft envelopes: no retired runtime formula or mesh is consumed.
def bezier(a,b,c,d,t):return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def petal_point(angle,height,t,u):
    radius=bezier(.52,.85,.63,.15,t)
    y=.996+(height-.996)*t
    tangent=Vector((math.cos(angle),-math.sin(angle)));radial=Vector((math.sin(angle),math.cos(angle)))
    centre=radial*radius;half=1.68*t*(1-t)
    left=centre-tangent*half;right=centre+tangent*half
    # The two front leaves frame a genuine doorway around the egg until above its shoulder.
    opening=.29*(1-min(1,max(0,(y-1.72)/.46)))
    if abs(angle-math.pi/4)<.01:left.x=max(left.x,opening)
    if abs(angle+math.pi/4)<.01:right.x=min(right.x,-opening)
    point=left.lerp(right,(u+1)*.5)+radial*(.025*(1-u*u)*math.sin(math.pi*t))
    return (point.x,y,point.y-.2)

def curve_tube(name,points,radius,mat,owner,level):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=2;curve.resolution_u=3
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*xyz(co),1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj['buildLevel']=level;obj['constructionStage']=owners[owner]['constructionStage'];obj['semanticOwner']='hatchery-'+owner
    obj.data.materials.append(mat);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
    return obj

petal_contract=[]
angles=[-135,-90,-45,45,90,135,180]
for number,degrees in enumerate(angles):
    a=math.radians(degrees);height={45:2.29,90:2.14,135:2.35,180:2.47}[abs(degrees)]
    level=1 if abs(degrees) in [90,180] else 2
    rows=28;columns=14;verts=[petal_point(a,height,i/rows,j/columns*2-1) for i in range(rows+1) for j in range(columns+1)]
    faces=[]
    for i in range(rows):
        for j in range(columns):
            p=i*(columns+1)+j;faces.append((p,p+1,p+columns+2,p+columns+1))
    obj=mesh('lotus-loft-glass-petal-'+str(number+1),verts,faces,glass,'conservatory',level)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    mod=obj.modifiers.new('closed-loft-envelope','SOLIDIFY');mod.thickness=.009;mod.offset=0;modifier_apply(obj,mod)
    for poly in obj.data.polygons:poly.use_smooth=True
    for side in [-1,1]:curve_tube('petal-'+str(number+1)+'-structural-edge-'+str(side),[petal_point(a,height,i/42,side) for i in range(43)],.012,brass,'conservatory',level)
    petal_contract.append({'name':obj.name,'angleDegrees':degrees,'tipHeight':height,'buildLevel':level})
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
report={'status':'draft-awaiting-browser-QC','axes':'glTF Y-up,front+Z,rootground0','bbox':{'min':mins,'max':maxs},'maxRadius':radius,'triangles':triangles,'meshCount':len(mesh_reports),'owners':list(o.name for o in owners.values()),'meshes':mesh_reports,'petals':petal_contract,'sourceScript':str(Path(__file__).relative_to(ROOT)),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'blockout-b02-geometry.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blockout-b02.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'blockout-b02.glb'),export_format='GLB',use_selection=False,export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('HATCHERY_REPORT '+json.dumps({k:report[k] for k in ['bbox','maxRadius','triangles','meshCount']}))
