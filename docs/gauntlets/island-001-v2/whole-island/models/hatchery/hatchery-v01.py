"""Complete Hatchery V2 from the approved lotus nursery landmark."""
import bpy,bmesh,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/gauntlets/island-001-v2/whole-island/models/hatchery';OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(1002)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return (p[0],-p[2],p[1])
def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
root=empty('ISLAND_001_V2_LOTUS_HATCHERY');root['id']='hatchery';root['landmarkId']='hatchery';root['logicalAxes']='Y-up;front+Z;ground0';root['assetStatus']='whole-island-v01-draft';root['sockets']={'lift':[.72,.15,1.07]}
owners={n:empty('hatchery-'+n,root) for n in ['terraces','wings','conservatory','egg']}
def mat(name,color,rough=.6,metal=0,emission=0,vertex=False,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,alpha);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,alpha);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;bs.inputs['Alpha'].default_value=alpha
    if vertex:
        attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Col';m.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    if alpha<1:
        m.use_backface_culling=False
        try:m.surface_render_method='BLENDED'
        except (TypeError,AttributeError):pass
    return m
stone=mat('hatchery-warm-limestone',(.84,.79,.67),vertex=True)
wood=mat('hatchery-books-and-walnut',(.39,.20,.07),vertex=True)
brass=mat('hatchery-warm-gold',(.73,.47,.14),.27,.7)
warm=mat('hatchery-reading-lights',(1,.53,.15),.3,0,1.8)
glass=mat('hatchery-blue-conservatory-glass',(.32,.68,.81),.12,.08,alpha=.30)
leaf=mat('hatchery-garden-colors',(.23,.36,.07),.86,vertex=True)
water=mat('hatchery-rooftop-water',(.10,.46,.56),.18,.16,alpha=.86)
eggmat=mat('hatchery-iridescent-opal-egg',(.84,.87,.79),.20,.18,vertex=True)
vertex_materials={stone,wood,leaf,eggmat}
def mesh(name,verts,faces,material,owner,level=1,stage=1,colors=None,smooth=False):
    data=bpy.data.meshes.new(name+'-mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj.data.materials.append(material)
    obj['buildLevel']=level;obj['constructionStage']=stage;obj['semanticOwner']='hatchery-'+owner
    if material not in vertex_materials:colors=[(1,1,1)]*len(verts)
    if colors:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):col.data[i].color=(*c,1)
    else:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for c in col.data:c.color=material.diffuse_color
    if smooth:
        for p in data.polygons:p.use_smooth=True
    return obj

def slab(name,poly,low,high,material=stone,owner='terraces',level=1,stage=1,color=None):
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
            ang=2*math.pi*j/sides;flute=1+.09*math.cos(j*2.9+t*9) if grain else 1;pos=p+(a*math.cos(ang)+b*math.sin(ang))*r*flute;verts.append(tuple(pos))
            shade=.80+.23*(.5+.5*math.sin(j*2.3+t*3)) if grain else 1;colors.append(tuple(c*shade for c in material.diffuse_color[:3]))
    faces=[]
    for i in range(steps):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces += [tuple(reversed(range(sides))),tuple(range(steps*sides,(steps+1)*sides))]
    return mesh(name,verts,faces,material,owner,level,stage,colors,True)
def beam(name,a,b,r=.013,material=wood,owner='wings',level=1,stage=3,sides=5):return tube(name,[a,b],[r,r],material,owner,level,stage,sides,1)

def stair(name,points,from_y,to_y,width,level):
    n=24;strip=[]
    for i in range(n+1):
        t=i/n;p=catmull(points,t);d=(catmull(points,min(1,t+.001))-catmull(points,max(0,t-.001))).normalized();normal=Vector((-d.y,d.x));strip.append((p,normal))
    verts=[]
    for i,(p,normal) in enumerate(strip):
        y=from_y+(to_y-from_y)*i/n
        for s,h in [(-1,max(.14,from_y-.05)),(1,max(.14,from_y-.05)),(1,y),(-1,y)]:
            q=p+normal*s*width/2;verts.append((q.x,h,q.y))
    f=[(3,2,1,0),(n*4,n*4+1,n*4+2,n*4+3)]
    for i in range(n):
        for j in range(4):f.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    mesh(name+'-continuous-masonry',verts,f,stone,'terraces',level,1)
    for i in range(n):
        a,na=strip[i];b,nb=strip[i+1];poly=[]
        for p,no,sign in [(a,na,-1),(b,nb,-1),(b,nb,1),(a,na,1)]:q=p+no*sign*width/2;poly.append((q.x,q.y))
        y=from_y+(to_y-from_y)*(i+1)/n;slab(name+'-tread-'+str(i),poly,y-.055,y,stone,'terraces',level,3)
    for side in [-1,1]:
        pts=[]
        for i,(p,no) in enumerate(strip):
            q=p+no*side*width/2;pts.append((q.x,from_y+(to_y-from_y)*i/n+.12,q.y))
        tube(name+'-stone-balustrade-'+str(side),pts,[.032]*len(pts),stone,'terraces',level,5,5,n)

def cloud(name,centre,scale,level,stage=4,flowers=False,detail=18):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
    proto=bpy.context.object;vs=[tuple(v.co) for v in proto.data.vertices];fs=[tuple(p.vertices) for p in proto.data.polygons];bpy.data.objects.remove(proto,do_unlink=True)
    verts=[];colors=[];base=(.25,.40,.075) if not flowers else (.46,.21,.64)
    for v in vs:
        jitter=rng.uniform(.83,1.13);verts.append(tuple(centre[i]+v[i]*scale[i]*jitter for i in range(3)));shade=rng.uniform(.75,1.20);colors.append(tuple(min(1,c*shade) for c in base))
    faces=list(fs)
    for j in range(detail):
        a=rng.uniform(0,2*math.pi);h=rng.uniform(-.55,1);rad=math.sqrt(max(0,1-h*h));normal=Vector((math.sin(a)*rad,h,math.cos(a)*rad));p=Vector(centre)+Vector(tuple(normal[i]*scale[i] for i in range(3)))*rng.uniform(.85,1.10)
        side=normal.cross(Vector((0,1,0)))
        if side.length<.1:side=Vector((1,0,0))
        side.normalize();up=normal.cross(side).normalized();size=(.045 if not flowers else .022)*rng.uniform(.7,1.2);k=len(verts)
        verts += [tuple(p-side*size),tuple(p+up*size*.42+normal*size*.25),tuple(p+side*size),tuple(p-up*size*.42)]
        faces += [(k,k+1,k+2),(k,k+2,k+3)]
        shade=rng.uniform(.8,1.5);c=tuple(min(1,x*shade) for x in base);colors += [c]*4
    return mesh(name,verts,faces,leaf,'terraces',level,stage,colors)

def rock(name,c,size,level):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=bpy.context.object;vs=[tuple(v.co) for v in o.data.vertices];fs=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True)
    verts=[tuple(c[i]+v[i]*size[i]*rng.uniform(.85,1.1) for i in range(3)) for v in vs];colors=[(.47+rng.random()*.12,.46+rng.random()*.10,.38+rng.random()*.10) for v in verts];mesh(name,verts,fs,stone,'terraces',level,1,colors)

def sphere(name,c,r,material,owner,level,stage,segments=24,rings=14):
    verts=[];faces=[]
    for i in range(rings+1):
        phi=math.pi*i/rings
        for j in range(segments):
            a=2*math.pi*j/segments;verts.append((c[0]+math.sin(phi)*math.sin(a)*r,c[1]+math.cos(phi)*r,c[2]+math.sin(phi)*math.cos(a)*r))
    for i in range(rings):
        for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
    o=mesh(name,verts,faces,material,owner,level,stage,smooth=True);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o

# Positive nursery architecture. All facades retain actual open arched rooms.
roof_contacts=[]
def localbox(name,centre,axis,size,material,owner,level,stage,color=None):
    ax,az=axis;nx,nz=-az,ax;w,h,d=size;cx,cy,cz=centre
    v=[(cx+ax*x+nx*z,cy+y,cz+az*x+nz*z) for y in [-h/2,h/2] for x,z in [(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]]
    return mesh(name,v,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,owner,level,stage,[color]*8 if color else None)
def tiny_egg(name,c,level):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=bpy.context.object;v=[(c[0]+p.co.x*.026,c[1]+p.co.y*.045,c[2]+p.co.z*.026) for p in o.data.vertices];f=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True);mesh(name,v,f,stone,'wings',level,3,[(.95,.91,.77)]*len(v),True)
def nursery(name,outline,bottom,top,level):
    slab(name+'-interior-floor',outline,bottom-.04,bottom+.008,stone,'wings',level,1)
    centre=(sum(p[0] for p in outline)/len(outline),sum(p[1] for p in outline)/len(outline));supports=[]
    for edge,(a,b) in enumerate(zip(outline,outline[1:]+outline[:1])):
        dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);axis=(dx/length,dz/length);normal=(-axis[1],axis[0]);mid=((a[0]+b[0])/2,(a[1]+b[1])/2)
        if normal[0]*(centre[0]-mid[0])+normal[1]*(centre[1]-mid[1])<0:normal=(-normal[0],-normal[1])
        count=max(1,round(length/.60));pitch=length/count
        for i in range(count+1):
            x,z=a[0]+dx*i/count,a[1]+dz*i/count;o=localbox(name+f'-bay-{edge}-pier-{i}',(x,(bottom+top)/2,z),axis,(.085,top-bottom+.012,.10),stone,'wings',level,2);supports.append(o.name)
        for i in range(count):
            mx,mz=a[0]+dx*(i+.5)/count,a[1]+dz*(i+.5)/count;w=pitch-.085;rise=min(w*.5,(top-bottom)*.35);spring=top-.06-rise
            profile=[(-w/2+w*j/12,spring+rise*math.sqrt(max(0,1-(-1+2*j/12)**2))) for j in range(13)]+[(w/2,top+.006),(-w/2,top+.006)];n=len(profile)
            v=[(mx+axis[0]*x+normal[0]*depth,y,mz+axis[1]*x+normal[1]*depth) for depth in [-.05,.05] for x,y in profile];f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
            mesh(name+f'-bay-{edge}-arch-{i}',v,f,stone,'wings',level,2)
            # Warm shelves, work counters and nursery eggs sit inside the voids.
            if w>.21:
                cx,cz=mx+normal[0]*.17,mz+normal[1]*.17
                localbox(name+f'-bay-{edge}-{i}-nursery-back',(cx,bottom+.22,cz),axis,(w*.8,.38,.035),wood,'wings',level,3)
                localbox(name+f'-bay-{edge}-{i}-work-counter',(cx-normal[0]*.02,bottom+.20,cz-normal[1]*.02),axis,(w*.84,.035,.12),wood,'wings',level,3)
                for j in [-1,0,1]:tiny_egg(name+f'-bay-{edge}-{i}-incubated-egg-{j}',(cx+axis[0]*j*w*.22-normal[0]*.07,bottom+.26,cz+axis[1]*j*w*.22-normal[1]*.07),level)
                localbox(name+f'-bay-{edge}-{i}-warm-ceiling',(mx+normal[0]*.09,top-.075,mz+normal[1]*.09),axis,(w*.55,.015,.035),warm,'wings',level,5)
                for sign in [-1,1]:
                    xx,zz=mx+axis[0]*w*.42*sign,mz+axis[1]*w*.42*sign;beam(name+f'-bay-{edge}-{i}-timber-jamb-{sign}',(xx,bottom+.02,zz),(xx,spring+.01,zz),.012,wood,'wings',level,5,4)
    roof=slab(name+'-occupied-roof-court',outline,top-.009,top+.080,stone,'wings',level,2)
    roof_contacts.append({'roof':roof.name,'floor':bottom,'top':top,'supports':supports})

grade=[(-1.41,-.34),(-1.21,-.90),(-.51,-1.10),(.67,-1.08),(1.25,-.77),(1.44,-.12),(1.35,.62),(.87,1.16),(.15,1.29),(-.62,1.17),(-1.25,.74),(-1.45,.17)]
slab('continuous-nursery-arrival-court',grade,0,.16,stone,'terraces',1,1)
low=[(-1.25,-.45),(-1.03,-.86),(-.38,-.97),(.68,-.93),(1.15,-.61),(1.24,.19),(.94,.51),(-.85,.51),(-1.25,.28)]
nursery('broad-lower-nursery',low,.22,.915,1)
upper=[(.70,-.86),(1.04,-.74),(1.21,-.45),(1.22,.20),(.76,.32),(.68,-.29)]
nursery('upper-right-nursery',upper,.995,1.53,2)
# A localized L3 roof shoulder creates a planted side court, not a third drum.
shoulder=[(-1.18,-.44),(-1.00,-.76),(-.71,-.82),(-.66,-.57),(-.74,-.15),(-.80,.03),(-1.11,.03)]
slab('west-raised-reading-garden',shoulder,.989,1.095,stone,'terraces',3,1)
slab('west-garden-approach-step',[(-1.15,.035),(-.88,.035),(-.88,.16),(-1.15,.16)],.989,1.045,stone,'terraces',3,1)

# Continuous supported stairs join the lower arrival and upper egg court.
stair('west-sweeping-nursery-stair',[(-.34,1.12),(-.70,1.05),(-1.00,.82),(-1.20,.53),(-1.08,.23)],.16,.995,.27,1)
stair('east-sweeping-nursery-stair',[(1.02,.77),(1.25,.47),(1.29,.14),(1.14,-.05),(.98,-.19)],.16,.995,.265,2)
# Connected descending water landings retain broad shoulders and a clear lift pad.
mid=[(-.49,.43),(.79,.43),(1.02,.59),(.99,.78),(.66,.84),(.32,.91),(-.40,.86),(-.59,.68)]
slab('middle-water-landing-support',mid,.16,.535,stone,'terraces',1,1)
slab('middle-water-landing-rim',mid,.53,.575,stone,'terraces',1,3)
slab('middle-reflecting-water',[(-.40,.54),(.73,.54),(.90,.63),(.86,.72),(.65,.77),(.28,.81),(-.33,.77),(-.46,.67)],.577,.588,water,'terraces',1,4)
front=[(-.34,.86),(.36,.87),(.44,1.10),(.26,1.22),(-.10,1.19),(-.16,1.05),(-.42,.97)]
slab('lower-shallow-water-landing',front,.155,.31,stone,'terraces',2,1)
slab('lower-reflecting-water',[(-.26,.94),(.29,.95),(.34,1.08),(.21,1.14),(-.03,1.12),(-.10,1.01),(-.31,.96)],.311,.326,water,'terraces',2,4)
def waterfall(name,width,path,level):
    verts=[(x,y,z) for y,z in path for x in [-width/2,width/2]];faces=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)];o=mesh(name,verts,faces,water,'terraces',level,4);mod=o.modifiers.new('falling-water-sheet','SOLIDIFY');mod.thickness=.008;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
waterfall('upper-court-cascade',.41,[(.997,.43),(.97,.53),(.61,.60),(.588,.68)],1)
waterfall('lower-pool-cascade',.32,[(.590,.78),(.56,.90),(.35,1.00),(.326,1.08)],2)
# A narrow lateral rill and garden landing complete the third funded water stage.
slab('east-roof-rill-stone',[ (.72,-.40),(.94,-.40),(.97,-.13),(.75,-.11)],.991,1.035,stone,'terraces',3,1)
slab('east-roof-rill-water',[(.77,-.36),(.90,-.36),(.92,-.17),(.78,-.15)],1.036,1.043,water,'terraces',3,4)

# Seven architectural glass petals. Each has a finite rooted base, broad middle,
# straight pointed upper return and distinct brass edges. A dominant rear vault
# reaches over the egg, while lower side petals retain open entry framing.
BASE=.995;CZ=-.18
petal_specs=[('central-rear',180,2.40,-.24,.47,1),('rear-west',-135,2.29,-.08,.36,1),('rear-east',135,2.29,-.08,.36,1),('front-west',-45,2.21,.26,.35,2),('front-east',45,2.21,.26,.35,2),('side-west',-90,2.13,.30,.35,3),('side-east',90,2.13,.30,.35,3)]
def petal_point(deg,height,tip,middle,t,u):
    if t<=.40:
        q=t/.40;ease=math.sin(q*math.pi/2);r=.44+.21*ease;half=.15+(middle-.15)*ease
    else:
        q=(t-.40)/.60;r=.65+(tip-.65)*q;half=middle*(1-q)
    a=math.radians(deg);tangent=Vector((math.cos(a),-math.sin(a)));radial=Vector((math.sin(a),math.cos(a)))
    centre=radial*(r+.022*(1-u*u)*math.sin(math.pi*t));p=centre+tangent*half*u;y=BASE+(height-BASE)*t
    # The foreground glass stops outside the real opening around the hero egg.
    gap=.255*(1-min(1,max(0,(y-1.73)/.34)))
    if deg==45:p.x=max(p.x,gap)
    if deg==-45:p.x=min(p.x,-gap)
    return (p.x,y,CZ+p.y)
petal_objects=[]
for name,deg,height,tip,middle,level in petal_specs:
    rows=18;cols=10;verts=[petal_point(deg,height,tip,middle,i/rows,-1+2*j/cols) for i in range(rows+1) for j in range(cols+1)];faces=[]
    for i in range(rows):
        for j in range(cols):k=i*(cols+1)+j;faces.append((k,k+1,k+cols+2,k+cols+1))
    o=mesh(name+'-pointed-glass-envelope',verts,faces,glass,'conservatory',level,2,colors=[(1,1,1)]*len(verts),smooth=True)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();mod=o.modifiers.new('paired-glass-envelope','SOLIDIFY');mod.thickness=.006;mod.offset=0;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);petal_objects.append(o)
    for side in [-1,1]:tube(name+'-rooted-gothic-frame-'+str(side),[petal_point(deg,height,tip,middle,i/26,side) for i in range(27)],[.014]*27,brass,'conservatory',level,2,5,26)
    for i,t in enumerate([.28,.52,.74]):
        pts=[petal_point(deg,height,tip,middle,t,-1+2*j/14) for j in range(15)];tube(name+'-glazing-cross-rib-'+str(i),pts,[.005]*len(pts),brass,'conservatory',level,5,4,14)
    # Finials make the seven distinct architectural points visible in beauty.
    sphere(name+'-gold-tip',petal_point(deg,height,tip,middle,1,0),.017,brass,'conservatory',level,5,8,5)

# Smooth luminous opal egg and low ceremonial cradle, kept fixed in every level.
verts=[];colors=[];faces=[];rings=18;segments=32
for i in range(rings+1):
    phi=math.pi*i/rings;y=1.055+.63*(1-math.cos(phi))*.5;r=.216*math.sin(phi)*(1.04+.09*math.cos(phi))
    for j in range(segments):
        a=2*math.pi*j/segments;verts.append((math.sin(a)*r,y,CZ+math.cos(a)*r));f=.5+.5*math.sin(a*5+phi*8);g=.5+.5*math.cos(a*3-phi*7);colors.append((.73+.21*f,.79+.16*g,.79+.18*(1-f)))
for i in range(rings):
    for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
o=mesh('one-sheltered-iridescent-egg',verts,faces,eggmat,'egg',1,4,colors,True);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
slab('gold-egg-cradle',[(math.sin(2*math.pi*j/32)*.25,CZ+math.cos(2*math.pi*j/32)*.25) for j in range(32)],.990,1.06,brass,'egg',1,3)
for level,phase in [(2,.2),(3,1.8)]:
    for k in range(3):
        phi=.60+k*.45;a=phase+k*1.3;r=.218*math.sin(phi)*(1.04+.09*math.cos(phi));p=(math.sin(a)*r,1.055+.63*(1-math.cos(phi))*.5,CZ+math.cos(a)*r);sphere('opal-gold-spark-'+str(level)+'-'+str(k),p,.009,brass,'egg',level,5,6,4)

# Roof reading and tending gardens, warm nursery worktables and fine rails.
def table(name,x,y,z,level):
    poly=[(x+math.sin(2*math.pi*j/10)*.11,z+math.cos(2*math.pi*j/10)*.11) for j in range(10)];slab(name+'-top',poly,y+.12,y+.14,wood,'terraces',level,3);beam(name+'-leg',(x,y,z),(x,y+.12,z),.019,wood,'terraces',level,3,5)
    for sign in [-1,1]:
        xx=x+sign*.15;box(name+'-chair-'+str(sign),(xx,y+.06,z),(.085,.023,.085),wood,'terraces',level,3);box(name+'-chairback-'+str(sign),(xx+sign*.025,y+.11,z),(.018,.10,.085),wood,'terraces',level,3)
for i,(x,y,z,level) in enumerate([(-.79,.995,-.48,1),(.96,1.61,-.44,2),(-.91,1.095,-.38,3),(.10,.995,.29,3)]):table('nursery-garden-table-'+str(i),x,y,z,level)
def rail(name,poly,y,level):
    pts=[(x,y+.13,z) for x,z in poly];tube(name+'-top',pts,[.012]*len(pts),brass,'terraces',level,5,4,len(pts)*2)
    for i,(x,z) in enumerate(poly):beam(name+'-post-'+str(i),(x,y,z),(x,y+.13,z),.009,brass,'terraces',level,5,4)
rail('west-nursery-garden-edge',low[:3],.995,1);rail('upper-nursery-garden-edge',upper[:4],1.61,2);rail('west-raised-garden-edge',shoulder[:4],1.095,3)
for i,(x,y,z,level) in enumerate([(-1.05,.995,-.32,1),(-.76,.995,-.77,1),(1.03,1.61,-.22,2),(.87,1.61,-.68,2),(-.97,1.095,-.64,3)]):
    poly=[(x+math.sin(2*math.pi*j/10)*.07,z+math.cos(2*math.pi*j/10)*.07) for j in range(10)];slab('roof-nursery-planter-'+str(i),poly,y,y+.09,stone,'terraces',level,4)
    tube('roof-nursery-tree-stem-'+str(i),[(x,y+.07,z),(x-.015,y+.27,z)],[.022,.007],wood,'terraces',level,4,6,5)
    for j in range(2):cloud('roof-nursery-tree-'+str(i)+'-'+str(j),(x+(-.06 if j else .055),y+.29+j*.035,z),(.11,.10,.12),level,detail=14)
for i in range(24):
    a=2*math.pi*i/24;r=1.27;x,z=math.sin(a)*r,math.cos(a)*r-.03
    if z>.80 and -.57<x<1.09:continue
    level=i%3+1;rock('nursery-foundation-rock-'+str(i),(x,.18,z),(.14,.12,.14),level);cloud('nursery-root-garden-'+str(i),(x,.30,z),(.15,.11,.14),level,detail=13)
    cloud('nursery-roof-flowers-'+str(i),(x+.03,.38,z),(.07,.08,.07),level,flowers=True,detail=8)
for i,(x,y,z,level) in enumerate([(-1.17,.995,.17,1),(-.70,.995,.43,1),(1.18,1.61,-.08,2),(.71,1.60,-.68,2),(-1.12,1.09,-.64,3),(.88,.575,.67,3)]):
    for j in range(5):cloud('nursery-cascading-ivy-'+str(i)+'-'+str(j),(x+.023*math.sin(j),y-j*.08,z+.014*j),(.065,.075,.065),level,detail=6)
for i,(x,z,base,height,level) in enumerate([(-.93,-.80,.995,.94,1),(1.10,-.64,1.61,.70,2),(-1.25,-.30,.16,.94,3),(1.16,.49,.16,.78,3)]):
    for j in range(5):cloud('nursery-cypress-'+str(i)+'-'+str(j),(x,base+.16+height*j/5,z),(.075*(1-j*.13),height*.25,.075*(1-j*.13)),level,detail=5)

# Mechanical checks do not establish visual likeness. Keep the original goal as
# authority for the upcoming whole-island browser review.
bpy.context.view_layer.update();support_results=[]
for item in roof_contacts:
    checks=[]
    for name in item['supports']:
        o=bpy.data.objects[name];o.data.calc_loop_triangles();ys=[v.co.z for v in o.data.vertices];checks.append({'name':name,'minY':min(ys),'maxY':max(ys),'triangles':len(o.data.loop_triangles),'passed':min(ys)<=item['floor'] and max(ys)>=item['top']})
    assert all(c['passed'] for c in checks);support_results.append({'roof':item['roof'],'supports':checks,'passed':True})
(OUT/'hatchery-v01-support-checks.json').write_text(json.dumps(support_results,indent=2)+'\n')
# A real rear glass vault crosses directly above the egg centre.
shelter=[]
for x,z in [(0,CZ),(-.06,CZ),(.06,CZ),(0,CZ-.06)]:
    hits=[]
    for o in petal_objects:
        hit,loc,norm,idx=o.ray_cast(Vector(xyz((x,3,z))),Vector((0,0,-1)))
        if hit and loc.z>1.70:hits.append({'petal':o.name,'height':loc.z})
    shelter.append({'xz':[x,z],'overheadGlass':hits,'passed':bool(hits)})
assert all(c['passed'] for c in shelter)
near=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    for v in o.data.vertices:
        p=o.matrix_world@v.co;x,y,z=p.x,p.z,-p.y
        if .20<y<1.15 and math.hypot(x-.72,z-1.07)<.20:near.append(o.name);break
assert not near,'Lift clearance intrusions: '+str(near)
(OUT/'hatchery-v01-shelter-clearance-checks.json').write_text(json.dumps({'shelter':shelter,'liftClearanceRadius':.20,'liftClearanceHeight':[.20,1.15],'intrudingMeshes':near},indent=2)+'\n')
for owner_name,owner in owners.items():
    buckets={}
    for o in list(owner.children):
        if o.type!='MESH':continue
        buckets.setdefault((o['buildLevel'],o['constructionStage'],o.data.materials[0].name),[]).append(o)
    for (level,stage,material),objects in buckets.items():
        parts=[o.name for o in objects];bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'hatchery-{owner_name}-L{level}-S{stage}-{material}';o['sourceParts']=parts;o['buildLevel']=level;o['constructionStage']=stage;o['semanticOwner']=owner.name;o.select_set(False)
mins=[math.inf]*3;maxs=[-math.inf]*3;radius=0;records=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    o.data.calc_loop_triangles()
    for v in o.data.vertices:
        p=o.matrix_world@v.co;v=(p.x,p.z,-p.y);assert all(math.isfinite(x) for x in v)
        for a,x in enumerate(v):mins[a]=min(mins[a],x);maxs[a]=max(maxs[a],x)
        radius=max(radius,math.hypot(v[0],v[2]))
    records.append({'name':o.name,'level':o['buildLevel'],'stage':o['constructionStage'],'owner':o['semanticOwner'],'material':o.data.materials[0].name,'triangles':len(o.data.loop_triangles),'sourceParts':list(o['sourceParts'])})
for level in [1,2,3]:assert {r['stage'] for r in records if r['level']==level}==set(range(1,6))
assert radius<=1.6,f'Footprint radius {radius}'
report={'status':'whole-island-complete-model-awaiting-integrated-review','landmarkId':'hatchery','axes':'Y-up/front+Z/ground0','sockets':{'lift':[.72,.15,1.07],'egg':[0,1.37,CZ]},'bbox':{'min':mins,'max':maxs},'radius':radius,'triangles':sum(r['triangles'] for r in records),'authoringMeshCount':len(records),'completedOwnerMaterialBatches':len({(r['owner'],r['material']) for r in records}),'materials':sorted({r['material'] for r in records}),'levels':{str(l):{'addedTriangles':sum(r['triangles'] for r in records if r['level']==l),'cumulativeTriangles':sum(r['triangles'] for r in records if r['level']<=l),'stages':sorted({r['stage'] for r in records if r['level']==l})} for l in [1,2,3]},'petalProfiles':petal_specs,'meshes':records,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
root['sockets']={'lift':[.72,.15,1.07],'egg':[0,1.37,CZ]}
(OUT/'hatchery-v01-metadata.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hatchery-v01.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'hatchery-v01.glb'),export_format='GLB',export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('HATCHERY_REPORT '+json.dumps({k:report[k] for k in ['bbox','radius','triangles','authoringMeshCount','completedOwnerMaterialBatches','levels']}))
