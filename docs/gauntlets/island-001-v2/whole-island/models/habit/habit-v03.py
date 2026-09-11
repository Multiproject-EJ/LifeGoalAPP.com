"""Complete authored Habit Oak V2. Blender Z-up authoring, GLB Y-up/front+Z.
Run Blender --background --python scripts/island001-v2-blender/oak.py.
"""
import bpy,bmesh,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/gauntlets/island-001-v2/whole-island/models/habit';OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(1001)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# One coherent 27% compression preserves every stair/room/light contact.
def xyz(p):return (p[0],-p[2],.16+(p[1]-.16)*.73 if p[1]>.16 else p[1])
def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
root=empty('ISLAND_001_V2_HABIT_OAK');root['landmarkId']='habit';root['id']='habit';root['logicalAxes']='Y-up;front+Z;ground0';root['assetStatus']='whole-island-v03-draft';root['sockets']={'lift':[.72,.15,1.07]}
owners={n:empty('oak-'+n,root) for n in ['trunk','canopy','galleries','stairs']}
def mat(name,color,rough=.7,metal=0,emission=0,vertex=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    if vertex:
        attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Col';m.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    return m
bark=mat('oak-sculpted-bark',(.30,.19,.095),vertex=True)
wood=mat('oak-warm-timber',(.48,.25,.075),.53,vertex=True)
stone=mat('oak-garden-limestone',(.79,.76,.65),.75,vertex=True)
leaf=mat('oak-leaf-and-garden-color',(.19,.32,.055),.86,vertex=True)
brass=mat('oak-aged-brass',(.65,.42,.12),.30,.65)
warm=mat('oak-warm-window-light',(1,.52,.12),.36,0,1.8)
blue=mat('oak-blue-habit-banners',(.025,.10,.30),.61)

def mesh(name,verts,faces,material,owner,level=1,stage=1,colors=None,smooth=False):
    data=bpy.data.meshes.new(name+'-mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj.data.materials.append(material)
    obj['buildLevel']=level;obj['constructionStage']=stage;obj['semanticOwner']='oak-'+owner
    if colors:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):col.data[i].color=(*c,1)
    else:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for c in col.data:c.color=material.diffuse_color
    if smooth:
        for p in data.polygons:p.use_smooth=True
    return obj

def slab(name,poly,low,high,material=stone,owner='stairs',level=1,stage=1,color=None):
    n=len(poly);v=[(x,y,z) for y in [low,high] for x,z in poly];f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,v,f,material,owner,level,stage,[color]*len(v) if color else None)
def box(name,c,size,material,owner,level,stage,color=None):
    x,y,z=c;w,h,d=size
    return slab(name,[(x-w/2,z-d/2),(x+w/2,z-d/2),(x+w/2,z+d/2),(x-w/2,z+d/2)],y-h/2,y+h/2,material,owner,level,stage,color)
def catmull(points,t):
    v=t*(len(points)-1);i=min(len(points)-2,int(v));u=v-i;p=[Vector(points[max(0,min(len(points)-1,j))]) for j in [i-1,i,i+1,i+2]]
    return .5*((2*p[1])+(-p[0]+p[2])*u+(2*p[0]-5*p[1]+4*p[2]-p[3])*u*u+(-p[0]+3*p[1]-3*p[2]+p[3])*u*u*u)
def tube(name,points,radii,material,owner,level,stage,sides=8,steps=16,grain=False):
    verts=[];colors=[]
    for i in range(steps+1):
        t=i/steps;p=catmull(points,t);d=(catmull(points,min(1,t+.001))-catmull(points,max(0,t-.001))).normalized();ref=Vector((0,1,0)) if abs(d.y)<.92 else Vector((1,0,0));a=d.cross(ref).normalized();b=d.cross(a).normalized()
        q=t*(len(radii)-1);k=min(len(radii)-2,int(q));r=radii[k]*(1-(q-k))+radii[k+1]*(q-k)
        for j in range(sides):
            ang=2*math.pi*j/sides;flute=1+.13*math.cos(j*2.9+t*9) if grain else 1;pos=p+(a*math.cos(ang)+b*math.sin(ang))*r*flute;verts.append(tuple(pos))
            shade=.80+.23*(.5+.5*math.sin(j*2.3+t*3)) if grain else 1;colors.append(tuple(c*shade for c in material.diffuse_color[:3]))
    faces=[]
    for i in range(steps):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces += [tuple(reversed(range(sides))),tuple(range(steps*sides,(steps+1)*sides))]
    return mesh(name,verts,faces,material,owner,level,stage,colors,True)
def beam(name,a,b,r=.013,material=wood,owner='galleries',level=1,stage=3,sides=5):return tube(name,[a,b],[r,r],material,owner,level,stage,sides,1)

def arcdeck(name,y,inner,outer,start,end,level,stage=3):
    n=max(6,int(abs(end-start)/10));angles=[math.radians(start+(end-start)*i/n) for i in range(n+1)]
    poly=[(math.sin(a)*outer,math.cos(a)*outer-.2) for a in angles]+[(math.sin(a)*inner,math.cos(a)*inner-.2) for a in reversed(angles)]
    slab(name,poly,y-.045,y,wood,'galleries',level,stage)
    return angles

def railing(name,y,r,start,end,level):
    n=max(5,int(abs(end-start)/14));angles=[math.radians(start+(end-start)*i/n) for i in range(n+1)]
    pts=[(math.sin(a)*r,y+.17,math.cos(a)*r-.2) for a in angles]
    tube(name+'-handrail',pts,[.016]*len(pts),wood,'galleries',level,5,5,len(pts)*2)
    for i,a in enumerate(angles):
        x,z=math.sin(a)*r,math.cos(a)*r-.2;beam(name+'-post-'+str(i),(x,y,z),(x,y+.17,z),.013,wood,'galleries',level,5)
    tube(name+'-lower-rail',[(x,y-.105,z) for x,y,z in pts],[.009]*len(pts),wood,'galleries',level,5,4,len(pts))

def stair(name,points,from_y,to_y,width,level):
    n=24;strip=[]
    for i in range(n+1):
        t=i/n;p=catmull(points,t);d=(catmull(points,min(1,t+.001))-catmull(points,max(0,t-.001))).normalized();normal=Vector((-d.y,d.x));strip.append((p,normal))
    verts=[]
    for i,(p,normal) in enumerate(strip):
        y=from_y+(to_y-from_y)*i/n
        for s,h in [(-1,.14),(1,.14),(1,y),(-1,y)]:
            q=p+normal*s*width/2;verts.append((q.x,h,q.y))
    f=[(3,2,1,0),(n*4,n*4+1,n*4+2,n*4+3)]
    for i in range(n):
        for j in range(4):f.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    mesh(name+'-continuous-masonry',verts,f,stone,'stairs',level,1)
    for i in range(n):
        a,na=strip[i];b,nb=strip[i+1];poly=[]
        for p,no,sign in [(a,na,-1),(b,nb,-1),(b,nb,1),(a,na,1)]:q=p+no*sign*width/2;poly.append((q.x,q.y))
        y=from_y+(to_y-from_y)*(i+1)/n;slab(name+'-tread-'+str(i),poly,y-.038,y,stone,'stairs',level,3)
    for side in [-1,1]:
        pts=[]
        for i,(p,no) in enumerate(strip):
            q=p+no*side*width/2;pts.append((q.x,from_y+(to_y-from_y)*i/n+.12,q.y))
        tube(name+'-stone-balustrade-'+str(side),pts,[.032]*len(pts),stone,'stairs',level,5,5,n)

# Root court and funded additions stay fixed across all build levels.
base=[(-1.30,-.45),(-1.03,-.98),(-.3,-1.10),(.66,-1.01),(1.31,-.42),(1.40,.27),(1.18,.78),(.54,1.21),(-.15,1.29),(-.86,1.05),(-1.31,.60)]
slab('root-arrival-court',base,0,.16,stone,'stairs',1,1)
for i in range(4):
    slab('front-arrival-step-'+str(i),[(-.32,1.18+i*.055),(.32,1.18+i*.055),(.32,1.235+i*.055),(-.32,1.235+i*.055)],max(0,.12-i*.035),.16-i*.035,stone,'stairs',1,1)
# The protected lift pad remains clear at [.72,.15,1.07].
for level,poly in [(2,[(.78,-.82),(1.07,-.59),(1.16,-.30),(.92,-.24),(.69,-.53)]),(3,[(-1.20,-.18),(-1.05,-.76),(-.75,-.88),(-.68,-.54),(-.92,-.05)])]:
    slab('level-'+str(level)+'-root-garden-terrace',poly,.155,.265,stone,'stairs',level,1)

# Twisting continuously joined oak mass, fluted roots and branching hierarchy.
trunk_points=[(0,.17,-.22),(-.19,.77,-.17),(-.12,1.42,-.26),(-.28,2.02,-.17),(-.11,2.59,-.22),(.03,3.03,-.16)]
tube('ancient-flowing-main-trunk',trunk_points,[.40,.36,.30,.235,.16,.055],bark,'trunk',1,2,14,32,True)
for i,(deg,endr) in enumerate([(-135,1.03),(-92,1.1),(-48,.87),(42,.92),(86,.99),(143,.91),(180,.90)]):
    a=math.radians(deg);start=(math.sin(a)*.17,1.03+(.15 if i%2 else 0),-.2+math.cos(a)*.16);middle=(math.sin(a)*.43,.48,-.2+math.cos(a)*.43);end=(math.sin(a)*endr,.16,-.2+math.cos(a)*endr)
    tube('spreading-buttress-root-'+str(i),[start,middle,end],[.19,.15,.035],bark,'trunk',1 if i<5 else 2,1,8,14,True)
branches=[
('west-grand',1,[(-.10,1.56,-.20),(-.51,1.94,-.10),(-.96,2.15,-.07),(-1.22,2.36,.0)],[.23,.18,.105,.025]),
('east-grand',1,[(-.12,1.71,-.2),(.39,2.08,-.17),(.83,2.35,-.15),(1.17,2.50,-.02)],[.22,.15,.09,.025]),
('west-high',2,[(-.18,2.08,-.21),(-.52,2.55,-.34),(-.85,2.82,-.38),(-1.00,2.98,-.28)],[.16,.115,.068,.018]),
('east-low',2,[(.04,1.35,-.18),(.40,1.75,.15),(.82,1.91,.35),(1.19,2.14,.38)],[.18,.13,.065,.016]),
('crown-east',3,[(-.11,2.49,-.20),(.23,2.94,-.27),(.56,3.19,-.24),(.75,3.34,-.22)],[.14,.105,.06,.012]),
('crown-west',3,[(-.12,2.46,-.19),(-.32,2.88,.02),(-.48,3.18,.13),(-.59,3.34,.17)],[.145,.10,.05,.015]),
('back-fork',1,[(-.16,1.86,-.24),(.10,2.36,-.61),(.29,2.75,-.89),(.35,2.98,-.94)],[.18,.12,.055,.012]),
('front-crown',2,[(-.16,2.24,-.1),(-.12,2.66,.30),(-.05,2.95,.63),(.04,3.10,.70)],[.13,.095,.045,.012])]
for name,level,pts,rs in branches:
    tube(name+'-flowing-bough',pts,rs,bark,'trunk',level,2,8,18,True)
    for j,sign in enumerate([-1,1]):
        p=Vector(pts[-2]);end=Vector(pts[-1]);q=p.lerp(end,.7);q.x+=sign*.17;q.z+=sign*.18;q.y+=.15
        tube(name+'-fork-'+str(j),[tuple(p),tuple((p+q)*.5+Vector((0,.12,0))),tuple(q)],[rs[-2]*.8,.033,.008],bark,'trunk',level,2,6,8,True)
# L3 begins with additional real buttresses without replacing funded roots.
for deg in [-165,115]:
    a=math.radians(deg);tube('upper-funded-root-'+str(deg),[(math.sin(a)*.2,.93,-.2+math.cos(a)*.2),(math.sin(a)*.52,.34,-.2+math.cos(a)*.52),(math.sin(a)*.85,.17,-.2+math.cos(a)*.85)],[.105,.085,.02],bark,'trunk',3,1,7,10,True)

# Inhabited timber floors wrap the living trunk and attach to real columns.
galleries=[(1,1.23,.44,.91,-112,145),(2,1.86,.36,.86,-8,143),(3,2.38,.28,.65,22,144)]
for level,y,inner,outer,start,end in galleries:
    arcdeck('inhabited-gallery-floor-'+str(level),y,inner,outer,start,end,level)
    railing('gallery-'+str(level),y,outer,start,end,level)
    previous=.18 if level==1 else galleries[level-2][1]
    for j,deg in enumerate([20,73,128]):
        a=math.radians(deg);r=outer-.065;x,z=math.sin(a)*r,math.cos(a)*r-.2
        beam('gallery-'+str(level)+'-full-height-post-'+str(j),(x,previous,z),(x,y,z),.032,wood,'galleries',level,3,6)
        p0=(x,y-.35,z);p1=(x*.72,y-.14,-.2+(z+.2)*.72);p2=(x*.6,y,-.2+(z+.2)*.6)
        tube('gallery-'+str(level)+'-curved-knee-brace-'+str(j),[p0,p1,p2],[.022,.024,.021],wood,'galleries',level,3,5,8)
    # A small occupied timber chamber, with glazed opening and overhanging eave.
    cx=.43 if level<3 else .34;cz=-.30;w=.36 if level<3 else .28;d=.34;h=.40 if level<3 else .31
    box('gallery-room-'+str(level)+'-back',(cx,y+h/2,cz-d/2),(w,h,.045),wood,'galleries',level,3)
    for sign in [-1,1]:box('gallery-room-'+str(level)+'-side-'+str(sign),(cx+sign*w/2,y+h/2,cz),(.04,h,d),wood,'galleries',level,3)
    slab('gallery-room-'+str(level)+'-eave',[(cx-w*.6,cz-d*.6),(cx+w*.6,cz-d*.6),(cx+w*.6,cz+d*.6),(cx-w*.6,cz+d*.6)],y+h,y+h+.04,wood,'galleries',level,3)
    box('gallery-room-'+str(level)+'-warm-window',(cx,y+h*.51,cz+d/2-.013),(w*.76,h*.78,.012),warm,'galleries',level,5)
    for sign in [-1,1]:beam('gallery-room-'+str(level)+'-window-jamb-'+str(sign),(cx+sign*w*.40,y+.025,cz+d/2),(cx+sign*w*.40,y+h*.92,cz+d/2),.013,brass,'galleries',level,5)
    beam('gallery-room-'+str(level)+'-window-cross',(cx-w*.4,y+h*.5,cz+d/2),(cx+w*.4,y+h*.5,cz+d/2),.009,brass,'galleries',level,5)

stair('west-sweeping-stair',[(-.79,.98),(-1.14,.68),(-1.19,.26),(-1.03,-.08),(-.79,-.36)],.16,1.23,.29,1)
stair('east-sweeping-stair',[(.99,.76),(1.21,.48),(1.11,.14),(.84,-.04),(.62,-.25)],.16,1.23,.30,2)
# An L3 rear stone garden path extends the raised root terrace.
stair('rear-garden-stair',[(-.99,-.20),(-1.01,-.39),(-.85,-.58),(-.61,-.69)],.265,.70,.20,3)

# Ground-level inhabited arch, recessed between flowing roots.
def arch_panel(name,cx,z,bottom,width,height,level):
    r=width/2;spring=bottom+height-r;poly=[(cx-r,bottom,z),(cx+r,bottom,z),(cx+r,spring,z)]
    poly += [(cx+math.cos(math.pi*i/16)*r,spring+math.sin(math.pi*i/16)*r,z) for i in range(1,17)]
    mesh(name+'-warm-interior',poly,[tuple(range(len(poly)))],warm,'galleries',level,5)
    pts=[(cx-r,bottom,z+.006),(cx-r,spring,z+.006)]+[(cx+math.cos(math.pi-math.pi*i/20)*r,spring+math.sin(math.pi-math.pi*i/20)*r,z+.006) for i in range(1,21)]+[(cx+r,bottom,z+.006)]
    tube(name+'-arched-timber-frame',pts,[.027]*len(pts),wood,'galleries',level,3,6,len(pts))
    beam(name+'-door-mullion',(cx,bottom,z+.012),(cx,bottom+height-.05,z+.012),.014,wood,'galleries',level,5)
arch_panel('root-front-door',.08,.295,.17,.38,.71,1)
slab('front-door-raised-threshold',[(-.19,.28),(.35,.28),(.35,.55),(-.19,.55)],.16,.21,stone,'stairs',1,3)
for k in range(3):
    slab('front-door-approach-tread-'+str(k),[(-.23,.55+k*.10),(.39,.55+k*.10),(.39,.65+k*.10),(-.23,.65+k*.10)],.16,.205-k*.015,stone,'stairs',1,3)
# Long fluted ridges wind with the main trunk, articulating an aged connected bole.
for k in range(7):
    a=k*math.tau/7;pts=[]
    for j in range(10):
        t=j/9;p=catmull(trunk_points,t*.68);r=.40-.20*t;ang=a+t*.65
        pts.append((p.x+math.sin(ang)*r,p.y,p.z+math.cos(ang)*r))
    tube('aged-bark-helical-ridge-'+str(k),pts,[.035,.028,.012],bark,'trunk',1,2,5,10,True)
arch_panel('east-root-window',.58,.13,.25,.23,.39,2)
arch_panel('west-root-window',-.51,.17,.28,.20,.35,3)

# Canopy v03 redistributes exactly 160 triangles per branch crown:
# 80-triangle irregular core + two connected 20-triangle lobes + ten
# closed four-triangle leaf tips rooted inside those volumes.
def layered_crown(name,centre,scale,level):
    local=random.Random(int(hashlib.sha256(name.encode()).hexdigest()[:12],16))
    centre=Vector((centre[0]*1.035,centre[1]-.07,-.12+(centre[2]+.12)*1.25))
    scale=Vector((scale[0]*1.18,scale[1]*1.30,scale[2]*1.32))
    vertices=[];faces=[];colors=[];lobes=[]
    phase=local.uniform(0,math.tau);tilt=local.uniform(-.25,.25)
    def append_point(p,color):
        radius=math.hypot(p[0],p[2])
        if radius>1.555:p[0]*=1.555/radius;p[2]*=1.555/radius
        vertices.append(tuple(p));colors.append(color)
    for lobe_index in range(3):
        if lobe_index==0:
            c=centre;scl=scale*.79;subdivisions=2
        else:
            angle=phase+(lobe_index-1)*2.65
            offset=Vector((math.sin(angle)*scale.x*.52,scale.y*(.20 if lobe_index==1 else -.16),math.cos(angle)*scale.z*.52))
            c=centre+offset;scl=Vector((scale.x*.56,scale.y*local.uniform(.56,.72),scale.z*.56));subdivisions=1
        lobes.append((c,scl))
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions,radius=1)
        proto=bpy.context.object;vs=[Vector(v.co) for v in proto.data.vertices];fs=[tuple(p.vertices) for p in proto.data.polygons];bpy.data.objects.remove(proto,do_unlink=True)
        start=len(vertices);palette=[(.036,.102,.020),(.048,.137,.027),(.069,.164,.022)];base=palette[lobe_index]
        for v in vs:
            angle=math.atan2(v.z,v.x);undulation=1+.085*math.sin(angle*3+phase)+.055*math.sin(v.y*7+phase)
            p=c+Vector((v.x*scl.x*undulation,v.y*scl.y+v.x*scl.x*tilt,v.z*scl.z*undulation))
            shade=.77+.34*(v.y+1)*.5+local.uniform(-.05,.05)
            append_point(p,tuple(x*shade for x in base))
        faces.extend(tuple(start+i for i in f) for f in fs)
    for leaf_index in range(10):
        c,scl=lobes[leaf_index%3];angle=phase+leaf_index*2.39996
        elevation=.12+.72*(leaf_index%4)/3;n=Vector((math.sin(angle)*math.sqrt(1-elevation**2),elevation,math.cos(angle)*math.sqrt(1-elevation**2)))
        surface=c+Vector((n.x*scl.x,n.y*scl.y,n.z*scl.z))*.93
        side=n.cross(Vector((0,1,0))).normalized();length=local.uniform(.070,.115);width=local.uniform(.026,.041)
        root_point=surface-n*.034;tip=surface+n*length
        left=surface+n*(length*.38)+side*width+Vector((0,.014,0));right=surface+n*(length*.38)-side*width-Vector((0,.006,0))
        start=len(vertices);tone=[(.072,.183,.026),(.10,.212,.030),(.054,.149,.029)][leaf_index%3]
        for j,p in enumerate([root_point,tip,left,right]):append_point(p,tuple(x*([.78,1.12,1,.85][j]) for x in tone))
        faces.extend([(start,start+2,start+1),(start,start+1,start+3),(start,start+3,start+2),(start+1,start+2,start+3)])
    return mesh(name,vertices,faces,leaf,'canopy',level,4,colors,True)

# Closed, smooth leaf envelopes overlap into an umbrella; no detached leaf cards.
def cloud(name,centre,scale,level,stage=4,flowers=False,detail=18):
    major=name.startswith('branch-')
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if major else 1,radius=1)
    proto=bpy.context.object;vs=[tuple(v.co) for v in proto.data.vertices];fs=[tuple(p.vertices) for p in proto.data.polygons];bpy.data.objects.remove(proto,do_unlink=True)
    if major:
        # Preserve all v02 RNG draws: ground gardens, rocks, architecture and
        # cypress geometry must not change when crown representation changes.
        for retired_vertex in vs:rng.uniform(.96,1.035);rng.uniform(-.035,.035)
        if name.startswith('branch-leaf-mass-'):return layered_crown(name,centre,scale,level)
        return None
    if major:
        centre=(centre[0]*1.035,centre[1]-.07,-.12+(centre[2]+.12)*1.25)
        scale=(scale[0]*1.18,scale[1]*.93,scale[2]*1.32)
    verts=[];colors=[];base=(.105,.235,.040) if not flowers else (.35,.15,.46)
    for v in vs:
        jitter=rng.uniform(.96,1.035);p=[centre[i]+v[i]*scale[i]*jitter for i in range(3)]
        if major:
            radius=math.hypot(p[0],p[2])
            if radius>1.555:p[0]*=1.555/radius;p[2]*=1.555/radius
        verts.append(tuple(p));shade=.86+.22*(v[1]+1)*.5+rng.uniform(-.035,.035);colors.append(tuple(c*shade for c in base))
    return mesh(name,verts,fs,leaf,'canopy',level,stage,colors,True)

# Cluster centres follow actual forks, not a vertical stack of spheres.
clusters=[
(1,(-1.15,2.47,.02),(.28,.20,.25)),(1,(-.93,2.43,-.22),(.29,.22,.25)),(1,(-1.05,2.56,.28),(.27,.18,.24)),
(1,(-.66,2.46,.03),(.30,.22,.28)),(1,(1.12,2.61,.02),(.28,.21,.25)),(1,(.90,2.66,-.26),(.30,.21,.28)),
(1,(.62,2.68,-.15),(.30,.20,.25)),(1,(.35,3.02,-.84),(.30,.20,.24)),(1,(.05,2.98,-.75),(.29,.23,.25)),
(1,(-.37,2.92,-.55),(.33,.22,.30)),(1,(-.11,3.20,-.21),(.32,.25,.30)),(1,(.23,3.24,-.25),(.31,.25,.30)),
(2,(-.92,3.00,-.29),(.28,.20,.24)),(2,(-.67,3.08,-.50),(.29,.22,.25)),(2,(-.67,2.91,-.10),(.30,.24,.28)),
(2,(1.12,2.28,.37),(.26,.20,.24)),(2,(.95,2.35,.59),(.26,.20,.22)),(2,(.72,2.43,.56),(.26,.21,.24)),
(2,(-.02,3.15,.62),(.31,.21,.26)),(2,(-.29,3.10,.42),(.28,.22,.25)),(2,(.26,3.12,.51),(.26,.24,.25)),
(2,(-1.17,2.69,-.40),(.22,.18,.22)),(2,(1.10,2.84,-.44),(.25,.22,.25)),
(3,(.72,3.34,-.20),(.29,.23,.27)),(3,(.46,3.40,-.18),(.29,.23,.28)),(3,(-.55,3.38,.12),(.30,.22,.28)),
(3,(-.28,3.42,.01),(.30,.22,.27)),(3,(.07,3.42,-.12),(.31,.20,.30)),(3,(-.50,3.33,-.29),(.28,.22,.27)),
(3,(.54,3.16,.21),(.27,.22,.26)),(3,(-.94,2.83,.29),(.28,.18,.24)),(3,(.94,3.08,-.04),(.26,.18,.24))]
for i,(level,p,s) in enumerate(clusters):
    cloud('branch-leaf-mass-'+str(i),p,s,level,detail=28)
    for j in range(1):
        offset=(rng.uniform(-.11,.11),rng.uniform(-.06,.10),rng.uniform(-.11,.11));q=tuple(p[k]+offset[k] for k in range(3));ss=tuple(x*.68 for x in s);cloud('branch-leaflets-'+str(i)+'-'+str(j),q,ss,level,detail=12)

# Garden beds, moss, rocks and slender cypress accents fill the root terrain.
def rock(name,c,size,level):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=bpy.context.object;vs=[tuple(v.co) for v in o.data.vertices];fs=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True)
    verts=[tuple(c[i]+v[i]*size[i]*rng.uniform(.85,1.1) for i in range(3)) for v in vs];colors=[(.47+rng.random()*.12,.46+rng.random()*.10,.38+rng.random()*.10) for v in verts];mesh(name,verts,fs,stone,'stairs',level,1,colors)
for i in range(24):
    a=2*math.pi*i/24;r=1.22+rng.uniform(-.06,.05);x,z=math.sin(a)*r,math.cos(a)*r-.03
    if z>.78 and -.42<x<1.13:continue
    level=1+i%3;rock('garden-foundation-rock-'+str(i),(x,.19,z),(.16,.12,.14),level)
    cloud('root-garden-bed-'+str(i),(x,.31,z),(.15,.11,.14),level,detail=12)
    if i%2:cloud('violet-garden-flowers-'+str(i),(x+.045,.40,z),(.08,.09,.08),level,flowers=True,detail=10)
for i,(x,z,h,level) in enumerate([(-1.14,-.57,.85,1),(1.14,-.56,.81,2),(-.68,-.93,.70,3),(1.28,.15,.63,2)]):
    tube('cypress-stem-'+str(i),[(x,.2,z),(x,.2+h,z)],[.045,.008],bark,'trunk',level,2,6,5)
    for k in range(4):cloud('cypress-foliage-'+str(i)+'-'+str(k),(x,.30+h*k/4,z),(.10*(1-k*.16),h*.28,.10*(1-k*.16)),level,detail=4)
# Cascading vines rooted to timber floors and tree forks.
for i,(x,y,z,level) in enumerate([(.70,1.86,.24,2),(.57,2.38,.11,3),(-.55,2.02,.15,1),(.84,1.23,.0,1)]):
    for j in range(5):cloud('hanging-garden-'+str(i)+'-'+str(j),(x+.04*math.sin(j),y-j*.095,z+.025*j),(.065,.07,.06),level,detail=5)

# Warm hanging lanterns and royal-blue habit banners are finished construction.
def lantern(name,p,level,drop=.18):
    x,y,z=p;beam(name+'-chain',(x,y,z),(x,y-drop,z),.007,brass,'galleries',level,5,4);cy=y-drop-.065
    tube(name+'-glowing-glass',[(x,cy-.06,z),(x,cy+.06,z)],[.029,.029],warm,'galleries',level,5,6,1)
    for cap_index,yy in enumerate([cy-.065,cy+.065]):tube(name+'-brass-cap-'+str(cap_index),[(x,yy-.007,z),(x,yy+.007,z)],[.043,.031],brass,'galleries',level,5,6,1)
    for frame_index,a in enumerate([0,math.pi*.5,math.pi,math.pi*1.5]):beam(name+'-frame-'+str(frame_index),(x+math.sin(a)*.032,cy-.06,z+math.cos(a)*.032),(x+math.sin(a)*.032,cy+.06,z+math.cos(a)*.032),.005,brass,'galleries',level,5,4)
for i,(p,level) in enumerate([((-1.09,2.33,.14),1),((.98,2.33,.13),1),((1.09,2.05,.41),2),((-.83,2.73,-.10),2),((.58,2.99,.12),3),((-.25,2.9,.43),3)]):lantern('hanging-lantern-'+str(i),p,level)
for level,x,y,z in [(1,-.87,2.19,.21),(2,.91,2.08,.17),(3,.41,2.66,.0)]:
    beam('banner-crossbar-'+str(level),(x-.07,y,z),(x+.07,y,z),.012,brass,'galleries',level,5)
    verts=[(x-.055,y-.025,z),(x+.055,y-.025,z),(x+.055,y-.32,z+.012),(x,y-.37,z+.015),(x-.055,y-.32,z+.012)]
    obj=mesh('blue-habit-banner-'+str(level),verts,[(0,1,2,3,4)],blue,'galleries',level,5);mod=obj.modifiers.new('two-sided-banner','SOLIDIFY');mod.thickness=.004;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    # A simple gold diamond marks the habit emblem without lettering.
    pts=[(x,y-.11,z+.012),(x+.033,y-.19,z+.016),(x,y-.27,z+.02),(x-.033,y-.19,z+.016),(x,y-.11,z+.012)]
    tube('habit-emblem-'+str(level),pts,[.005]*len(pts),brass,'galleries',level,5,4,4)

# Keep construction stage/level pieces separate. Completed runtime can batch
# by semantic owner and shared material after its delta reveal is complete.
bpy.context.view_layer.update();source_reports=[]
for owner_name,owner in owners.items():
    buckets={}
    for o in list(owner.children):
        if o.type!='MESH':continue
        key=(o['buildLevel'],o['constructionStage'],o.data.materials[0].name);buckets.setdefault(key,[]).append(o)
    for (level,stage,material),objects in buckets.items():
        parts=[o.name for o in objects];bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'oak-{owner_name}-L{level}-S{stage}-{material}';o['sourceParts']=parts;o['buildLevel']=level;o['constructionStage']=stage;o['semanticOwner']=owner.name;o.select_set(False)

mins=[math.inf]*3;maxs=[-math.inf]*3;radius=0;records=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    o.data.calc_loop_triangles();count=len(o.data.loop_triangles)
    for vert in o.data.vertices:
        p=o.matrix_world@vert.co;v=(p.x,p.z,-p.y);assert all(math.isfinite(c) for c in v)
        for a,c in enumerate(v):mins[a]=min(mins[a],c);maxs[a]=max(maxs[a],c)
        radius=max(radius,math.hypot(v[0],v[2]))
    records.append({'name':o.name,'level':o['buildLevel'],'stage':o['constructionStage'],'owner':o['semanticOwner'],'material':o.data.materials[0].name,'triangles':count,'sourceParts':list(o['sourceParts'])})
for level in [1,2,3]:assert {r['stage'] for r in records if r['level']==level}==set(range(1,6))
assert radius<=1.6,f'Radius {radius}'
assert maxs[1]<=3.70,f'Height {maxs[1]}'
report={'status':'whole-island-draft-complete-model-awaiting-integrated-review','landmarkId':'habit','axes':'Y-up/front+Z/ground0','sockets':{'lift':[.72,.15,1.07]},'bbox':{'min':mins,'max':maxs},'radius':radius,'triangles':sum(r['triangles'] for r in records),'authoringMeshCount':len(records),'completedOwnerMaterialBatches':len({(r['owner'],r['material']) for r in records}),'materials':sorted({r['material'] for r in records}),'levels':{str(l):{'addedTriangles':sum(r['triangles'] for r in records if r['level']==l),'cumulativeTriangles':sum(r['triangles'] for r in records if r['level']<=l),'stages':sorted({r['stage'] for r in records if r['level']==l})} for l in [1,2,3]},'meshes':records,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'habit-v03-metadata.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'habit-v03.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'habit-v03.glb'),export_format='GLB',export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('OAK_REPORT '+json.dumps({k:report[k] for k in ['bbox','radius','triangles','authoringMeshCount','completedOwnerMaterialBatches','levels']}))
