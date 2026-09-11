"""Complete Observatory V2 from the approved lower-right landmark."""
import bpy,bmesh,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/gauntlets/island-001-v2/whole-island/models/event';OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(1002)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return (p[0],-p[2],p[1])
def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
root=empty('ISLAND_001_V2_OBSERVATORY');root['id']='event';root['landmarkId']='event';root['logicalAxes']='Y-up;front+Z;ground0';root['assetStatus']='whole-island-v02-draft';root['sockets']={'lift':[.72,.15,1.07]}
owners={n:empty('observatory-'+n,root) for n in ['wings','dome','armillary']}
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
stone=mat('observatory-warm-limestone',(.84,.79,.67),vertex=True)
wood=mat('observatory-books-and-walnut',(.39,.20,.07),vertex=True)
brass=mat('observatory-warm-gold',(.73,.47,.14),.27,.7)
warm=mat('observatory-reading-lights',(1,.53,.15),.3,0,1.8)
glass=mat('observatory-clear-window-glass',(.035,.20,.22),.18,.02,alpha=.25)
leaf=mat('observatory-garden-colors',(.23,.36,.07),.86,vertex=True)
blue=mat('observatory-celestial-blue',(.018,.09,.30),.25,.25)
interior=mat('observatory-dome-warm-interior',(.34,.21,.08),.58)
def mesh(name,verts,faces,material,owner,level=1,stage=1,colors=None,smooth=False):
    data=bpy.data.meshes.new(name+'-mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj.data.materials.append(material)
    obj['buildLevel']=level;obj['constructionStage']=stage;obj['semanticOwner']='observatory-'+owner
    if colors:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):col.data[i].color=(*c,1)
    else:
        col=data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
        for c in col.data:c.color=material.diffuse_color
    if smooth:
        for p in data.polygons:p.use_smooth=True
    return obj

def slab(name,poly,low,high,material=stone,owner='wings',level=1,stage=1,color=None):
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
    n=20;strip=[]
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
    mesh(name+'-continuous-masonry',verts,f,stone,'wings',level,1)
    for i in range(n):
        a,na=strip[i];b,nb=strip[i+1];poly=[]
        for p,no,sign in [(a,na,-1),(b,nb,-1),(b,nb,1),(a,na,1)]:q=p+no*sign*width/2;poly.append((q.x,q.y))
        y=from_y+(to_y-from_y)*(i+1)/n;slab(name+'-tread-'+str(i),poly,y-.055,y,stone,'wings',level,3)
    for side in [-1,1]:
        pts=[]
        for i,(p,no) in enumerate(strip):
            q=p+no*side*width/2;pts.append((q.x,from_y+(to_y-from_y)*i/n+.12,q.y))
        tube(name+'-stone-balustrade-'+str(side),pts,[.032]*len(pts),stone,'wings',level,5,5,n)

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
    return mesh(name,verts,faces,leaf,'wings',level,stage,colors)

def rock(name,c,size,level):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=bpy.context.object;vs=[tuple(v.co) for v in o.data.vertices];fs=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True)
    verts=[tuple(c[i]+v[i]*size[i]*rng.uniform(.85,1.1) for i in range(3)) for v in vs];colors=[(.47+rng.random()*.12,.46+rng.random()*.10,.38+rng.random()*.10) for v in verts];mesh(name,verts,fs,stone,'wings',level,1,colors)

roof_contacts=[]
def localbox(name,center,axis,size,material,owner,level,stage,color=None):
    dx,dz=axis;nx,nz=-dz,dx;w,h,d=size;cx,cy,cz=center
    verts=[(cx+dx*x+nx*z,cy+y,cz+dz*x+nz*z) for y in [-h/2,h/2] for x,z in [(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]]
    return mesh(name,verts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,owner,level,stage,[color]*8 if color else None)
def wallbay(name,a,b,bottom,top,level,books=True,inward_center=(0,-.25)):
    dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz);ax=(dx/length,dz/length);normal=(-ax[1],ax[0]);mid=((a[0]+b[0])/2,(a[1]+b[1])/2)
    # Choose the inward normal by proximity to the library's centre.
    if normal[0]*(inward_center[0]-mid[0])+normal[1]*(inward_center[1]-mid[1])<0:normal=(-normal[0],-normal[1])
    thickness=.075;pier=min(.078,length*.20);opening=length-pier;rise=min(opening*.48,(top-bottom)*.36);spring=top-.06-rise
    supports=[]
    for j,p in enumerate([a,b]):
        obj=localbox(name+'-pier-'+str(j),(p[0],(bottom+top)/2,p[1]),ax,(pier,top-bottom+.012,thickness),stone,'wings',level,2);supports.append(obj.name)
    # Each closed spandrel is extruded above the arch; there is no wall Boolean.
    profile=[(-opening/2+opening*i/12,spring+rise*math.sqrt(max(0,1-(-1+2*i/12)**2))) for i in range(13)]+[(opening/2,top+.006),(-opening/2,top+.006)]
    v=[]
    for depth in [-thickness/2,thickness/2]:
        v += [(mid[0]+ax[0]*x+normal[0]*depth,y,mid[1]+ax[1]*x+normal[1]*depth) for x,y in profile]
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh(name+'-arch-spandrel',v,faces,stone,'wings',level,2)
    # A fine gold vertical frame and open transparent pane reveal actual books.
    if length>.28:
        beam(name+'-window-mullion',(mid[0],bottom+.02,mid[1]),(mid[0],top-.065,mid[1]),.009,brass,'wings',level,5,4)
        pane=[(mid[0]+ax[0]*x+normal[0]*.006,y,mid[1]+ax[1]*x+normal[1]*.006) for x,y in [(-opening/2,bottom+.018),(opening/2,bottom+.018)]+profile[:-2][::-1]]
        mesh(name+'-clear-glazing',pane,[tuple(range(len(pane)))],glass,'wings',level,5)
    if books and length>.29:
        # Preserve the v01 random stream for unchanged gardens/constellations.
        for retired_book in range(12):rng.uniform(.57,.91);rng.choice(range(6))
        h=(top-bottom)*.72;w=opening*.83;c=(mid[0]+normal[0]*.20,bottom+.04+h/2,mid[1]+normal[1]*.20)
        # Coherent dark teal interior, with one astronomical display rather
        # than unrelated multicoloured library-book blocks behind each arch.
        localbox(name+'-teal-room-back',c,ax,(w,h,.025),wood,'wings',level,3,(.018,.065,.071))
        desk_y=bottom+h*.31
        localbox(name+'-walnut-instrument-console',(c[0]-normal[0]*.055,desk_y,c[2]-normal[1]*.055),ax,(w*.88,.035,.12),wood,'wings',level,3,(.19,.085,.032))
        localbox(name+'-console-support',(c[0]-normal[0]*.055,bottom+h*.15,c[2]-normal[1]*.055),ax,(w*.22,h*.30,.07),wood,'wings',level,3,(.16,.073,.029))
        display=(c[0]-normal[0]*.073,desk_y+h*.24,c[2]-normal[1]*.073)
        r=min(w*.30,h*.18)
        circle=[(display[0]+ax[0]*math.cos(math.tau*j/16)*r,display[1]+math.sin(math.tau*j/16)*r,display[2]+ax[1]*math.cos(math.tau*j/16)*r) for j in range(17)]
        tube(name+'-interior-celestial-disc',circle,[.007]*17,brass,'wings',level,5,4,16)
        beam(name+'-instrument-axis',(display[0],desk_y,display[2]),(display[0],display[1]+r*1.1,display[2]),.009,brass,'wings',level,5,4)
        localbox(name+'-warm-room-light',(mid[0]+normal[0]*.11,top-.073,mid[1]+normal[1]*.11),ax,(opening*.65,.023,.022),warm,'wings',level,5)
        localbox(name+'-warm-console-light',(c[0]-normal[0]*.12,desk_y+.028,c[2]-normal[1]*.12),ax,(w*.52,.012,.015),warm,'wings',level,5)
    return supports

def library(name,outline,bottom,top,level,books=True):
    slab(name+'-continuous-floor',outline,bottom-.045,bottom+.006,stone,'wings',level,1)
    supports=[];centre=(sum(p[0] for p in outline)/len(outline),sum(p[1] for p in outline)/len(outline))
    for i,(a,b) in enumerate(zip(outline,outline[1:]+outline[:1])):
        supports += wallbay(name+'-bay-'+str(i),a,b,bottom,top,level,books,centre)
    roof=slab(name+'-occupied-roof',outline,top-.008,top+.065,stone,'wings',level,2)
    roof_contacts.append({'roof':roof.name,'top':top,'floor':bottom,'supportNames':supports})

def sphere(name,c,r,material,owner,level,stage,segments=24,rings=14):
    verts=[];faces=[]
    for i in range(rings+1):
        phi=math.pi*i/rings
        for j in range(segments):
            a=2*math.pi*j/segments;verts.append((c[0]+math.sin(phi)*math.sin(a)*r,c[1]+math.cos(phi)*r,c[2]+math.sin(phi)*math.cos(a)*r))
    for i in range(rings):
        for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
    o=mesh(name,verts,faces,material,owner,level,stage,smooth=True);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o

# Wide occupied lower wings and generous asymmetrical side terraces.
grade=[(-1.39,-.30),(-1.12,-.94),(-.48,-1.12),(.54,-1.10),(1.25,-.63),(1.44,.08),(1.27,.68),(.79,1.13),(.16,1.31),(-.56,1.16),(-1.16,.73),(-1.42,.12)]
slab('observatory-arrival-garden-court',grade,0,.15,stone,'wings',1,1)
left=[(-1.22,-.35),(-1.01,-.76),(-.57,-.96),(-.12,-.97),(.28,-.77),(.46,-.37),(.41,.09),(.14,.53),(-.29,.73),(-.75,.61),(-1.12,.25)]
right=[(.21,-.71),(.77,-.65),(1.13,-.29),(1.25,.15),(1.14,.56),(.78,.80),(.33,.79),(.06,.56),(.19,.15)]
library('west-central-observatory-hall',left,.17,1.060,1)
library('east-arched-instrument-wing',right,.17,.990,2)
# A warm rear gallery occupies the interior beneath the split dome.
rear=[(-.58,-.89),(-.19,-.99),(.24,-.95),(.59,-.79),(.45,-.60),(-.41,-.65)]
library('rear-celestial-reading-gallery',rear,1.245,1.740,3)

# The clear lift socket remains at [.72,.15,1.07] on the arrival court.
for i in range(5):
    z=1.08+i*.052;slab('observatory-arrival-step-'+str(i),[(-.38,z),(.22,z),(.22,z+.052),(-.38,z+.052)],max(0,.115-i*.023),.15-i*.023,stone,'wings',1,1)
stair('west-curving-observatory-stair',[(-.52,.97),(-.81,.76),(-.89,.43),(-.67,.13),(-.46,-.01)],.15,1.125,.27,1)
stair('east-roof-observation-stair',[(1.00,.66),(1.22,.38),(1.15,.06),(.91,-.11),(.74,-.28)],.15,1.055,.22,2)
# A small funded rear access stair joins the high dome floor and reading gallery.
stair('rear-gallery-access-stair',[(-.30,-.20),(-.40,-.32),(-.38,-.47),(-.30,-.60)],1.125,1.245,.17,3)

# White dome curbs follow only the retained blue shell halves. The central
# observing aperture remains physically open from court to sky.
DOME_Y=1.245;DOME_Z=-.25;RX=1.07;RZ=.88;H=1.10

def dome_point(side,u,beta):
    cut=.34+.27*max(0,math.cos(beta))
    phi=u*math.acos(cut/RX)
    return (side*RX*math.cos(phi),DOME_Y+H*math.sin(phi)*math.sin(beta),DOME_Z+RZ*math.sin(phi)*math.cos(beta))

def dome_half(side,level):
    name='west' if side<0 else 'east';nu=12;nv=24;verts=[];faces=[]
    for i in range(nu+1):
        for j in range(nv+1):verts.append(dome_point(side,i/nu,math.pi*j/nv))
    for i in range(nu):
        for j in range(nv):
            k=i*(nv+1)+j;faces.append((k,k+1,k+nv+2,k+nv+1))
    obj=mesh(name+'-split-blue-dome-shell',verts,faces,blue,'dome',level,2,colors=[(1,1,1)]*len(verts),smooth=True)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    obj.data.materials.append(interior);mod=obj.modifiers.new('solid-blue-roof-warm-interior','SOLIDIFY');mod.thickness=.027;mod.offset=-1;mod.material_offset=1;mod.material_offset_rim=1;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    # Full inner-cut arch and curved horizontal sill carry visible thick trim.
    edge=[dome_point(side,1,math.pi*j/40) for j in range(41)]
    tube(name+'-open-aperture-structural-arch',edge,[.020]*len(edge),brass,'dome',level,5,4,32)
    base=[dome_point(side,1-i/24,0) for i in range(25)]+[dome_point(side,i/24,math.pi) for i in range(1,25)]
    # Positive curved stone footing below each shell, not a complete drum.
    poly=[(x,z) for x,y,z in base]+[(x-side*.065,z*.97+DOME_Z*.03) for x,y,z in reversed(base)]
    slab(name+'-dome-limestone-footing',poly,1.11 if side<0 else 1.04,DOME_Y+.02,stone,'dome',level,1)
    tube(name+'-gold-dome-sill',base,[.014]*len(base),brass,'dome',level,5,4,32)
    # Sparse curved structural grid, leaving broad rich blue enamel panels.
    for i,u in enumerate([.28,.54,.77]):
        pts=[dome_point(side,u,math.pi*j/28) for j in range(29)];tube(name+'-curved-grid-band-'+str(i),pts,[.005]*len(pts),brass,'dome',level,5,3,20)
    for i,beta in enumerate([math.pi*.18,math.pi*.36,math.pi*.55,math.pi*.76]):
        pts=[dome_point(side,j/18,beta) for j in range(19)];tube(name+'-radial-grid-rib-'+str(i),pts,[.005]*len(pts),brass,'dome',level,5,3,14)
    # Small fixed constellations are actual gold beads on the blue shell.
    for i in range(8):
        u=rng.uniform(.32,.92);beta=rng.uniform(.12,math.pi-.12);p=dome_point(side,u,beta);sphere(name+'-constellation-star-'+str(i),p,.007,brass,'dome',level,5,6,3)
    return obj
# One half is funded at L2; L3 adds the opposing shell without scaling the first.
dome_half(-1,2);dome_half(1,3)

# Open central instrument: a small sun, nested gold gimbals and blue zodiac ring.
AC=Vector((0,1.86,-.01))
for i,(radius,low,high) in enumerate([(.25,1.120,1.180),(.17,1.180,1.230),(.085,1.230,1.470),(.15,1.470,1.510)]):
    poly=[(math.sin(2*math.pi*j/24)*radius,AC.z+math.cos(2*math.pi*j/24)*radius) for j in range(24)];slab('armillary-pedestal-'+str(i),poly,low,high,brass,'armillary',1,3)
slab('blue-instrument-dais-inlay',[(math.sin(2*math.pi*j/24)*.235,AC.z+math.cos(2*math.pi*j/24)*.235) for j in range(24)],1.181,1.185,blue,'armillary',1,4)
beam('armillary-upright-axis',(0,1.49,-.01),(0,2.28,-.01),.013,brass,'armillary',1,3,6)
sphere('armillary-central-golden-sun',tuple(AC),.128,brass,'armillary',1,3,16,10)

def armillary_ring(name,normal,radius,level,material=brass,thickness=.011):
    n=Vector(normal).normalized();a=n.cross(Vector((0,1,0)))
    if a.length<.1:a=Vector((1,0,0))
    a.normalize();b=n.cross(a).normalized();pts=[]
    for j in range(41):
        ang=2*math.pi*j/40;pts.append(tuple(AC+(a*math.cos(ang)+b*math.sin(ang))*radius))
    tube(name,pts,[thickness]*len(pts),material,'armillary',level,3 if level==1 else 5,4,32)
armillary_ring('armillary-equatorial-ring',(0,1,0),.335,1)
armillary_ring('armillary-vertical-meridian',(1,0,0),.365,1)
armillary_ring('armillary-inclined-gimbal',(1,.65,.32),.390,2)
armillary_ring('armillary-blue-zodiac-band',(.25,1,.8),.430,2,blue,.021)
armillary_ring('armillary-zodiac-gold-edge',(.25,1,.8),.453,2,brass,.009)
armillary_ring('armillary-outer-tracking-ring',(.72,-.28,1),.450,3)
for j in range(5):
    a=2*math.pi*j/5;end=(math.sin(a)*.29,AC.y+math.cos(a)*.20,AC.z+.10*math.cos(a));beam('sun-radial-axis-'+str(j),tuple(AC),end,.008,brass,'armillary',1,3,4)
for j in range(3):sphere('orbiting-gold-planet-'+str(j),(.31*math.sin(j*2.1),1.88+.21*math.cos(j*2.1),-.01+.23*math.cos(j*2.1)),.031,brass,'armillary',3,5,10,6)

# Roof terrace borders stop at stair arrivals and the central observing opening.
def rail(name,poly,y,level):
    pts=[(x,y+.14,z) for x,z in poly];tube(name+'-rail',pts,[.012]*len(pts),brass,'wings',level,5,4,len(pts)*2)
    for j,(x,z) in enumerate(poly):beam(name+'-post-'+str(j),(x,y,z),(x,y+.14,z),.009,brass,'wings',level,5,4)
rail('left-roof-garden',left[:5],1.125,1)
rail('right-observation-terrace',right[1:8],1.055,2)
rail('rear-roof-gallery',rear[:4],1.805,3)

# Celestial banners are attached to broad piers, not detached tower turrets.
def banner(name,x,y,z,width,height,level):
    box(name+'-stone-backing',(x,y-height/2,z-.035),(width+.09,height+.12,.09),stone,'wings',level,2)
    v=[(x-width/2,y,z),(x+width/2,y,z),(x+width/2,y-height+.06,z),(x,y-height,z+.008),(x-width/2,y-height+.06,z)];o=mesh(name+'-blue-cloth',v,[(0,1,2,3,4)],blue,'dome',level,5)
    mod=o.modifiers.new('two-sided-banner','SOLIDIFY');mod.thickness=.003;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    beam(name+'-gold-crossbar',(x-width*.62,y+.025,z),(x+width*.62,y+.025,z),.011,brass,'dome',level,5,5)
    circle=[(x+math.sin(2*math.pi*j/20)*width*.30,y-height*.46+math.cos(2*math.pi*j/20)*width*.30,z+.010) for j in range(21)];tube(name+'-gold-compass',circle,[.004]*len(circle),brass,'dome',level,5,4,20)
    for i,a in enumerate([0,math.pi/2,math.pi/4,-math.pi/4]):
        dx,dy=math.sin(a)*width*.39,math.cos(a)*width*.39;beam(name+'-compass-ray-'+str(i),(x-dx,y-height*.46-dy,z+.014),(x+dx,y-height*.46+dy,z+.014),.004,brass,'dome',level,5,4)
banner('west-celestial-banner',-.51,1.29,.39,.24,.83,1)
banner('front-celestial-banner',.24,1.08,.64,.25,.80,2)

# Telescope and inhabited furniture make the instrument terrace legible.
def table(name,x,y,z,level):
    poly=[(x+math.sin(2*math.pi*j/10)*.11,z+math.cos(2*math.pi*j/10)*.11) for j in range(10)];slab(name+'-top',poly,y+.13,y+.15,wood,'wings',level,3);beam(name+'-leg',(x,y,z),(x,y+.13,z),.020,wood,'wings',level,3,5)
    for sign in [-1,1]:
        xx=x+sign*.16;box(name+'-chair-'+str(sign),(xx,y+.075,z),(.09,.025,.09),wood,'wings',level,3);box(name+'-chairback-'+str(sign),(xx+sign*.035,y+.13,z),(.018,.12,.09),wood,'wings',level,3)
        beam(name+'-chairleg-'+str(sign),(xx,y,z),(xx,y+.07,z),.015,wood,'wings',level,3,4)
    box(name+'-star-chart',(x,y+.16,z),(.10,.011,.07),stone,'wings',level,3,(.94,.88,.70))
for i,(x,y,z,level) in enumerate([(-.92,1.125,-.42,1),(.86,1.055,.42,2),(.76,1.055,-.27,2),(-.11,1.805,-.81,3)]):table('observatory-reading-table-'+str(i),x,y,z,level)
# Telescope tube faces the sky and rests on a real tripod.
x,y,z=.95,1.055,.03
for i,a in enumerate([0,2.1,4.2]):beam('telescope-tripod-'+str(i),(x+math.sin(a)*.095,y,z+math.cos(a)*.095),(x,y+.23,z),.013,wood,'wings',2,3,5)
beam('telescope-blue-optical-tube',(x-.13,y+.25,z+.08),(x+.12,y+.38,z-.08),.042,blue,'dome',2,3,8)
for i,p in enumerate([(x-.13,y+.25,z+.08),(x+.12,y+.38,z-.08)]):sphere('telescope-gold-collar-'+str(i),p,.045,brass,'dome',2,5,10,5)

# Planted architecture: roof trees, cypress, violet beds and cascading ivy.
for i,(x,y,z,level) in enumerate([(-1.03,1.125,-.22,1),(-.65,1.125,-.77,1),(1.06,1.055,.30,2),(.72,1.055,.60,2),(.40,1.805,-.79,3)]):
    poly=[(x+math.sin(2*math.pi*j/10)*.075,z+math.cos(2*math.pi*j/10)*.075) for j in range(10)];slab('observatory-tree-pot-'+str(i),poly,y,y+.095,stone,'wings',level,4)
    tube('observatory-tree-trunk-'+str(i),[(x,y+.07,z),(x-.025,y+.26,z),(x+.015,y+.36,z)],[.020,.013,.007],wood,'wings',level,4,6,6)
    for j in range(2):cloud('observatory-roof-tree-'+str(i)+'-'+str(j),(x+(-.065 if j else .06),y+.34+j*.035,z),(.12,.10,.12),level,detail=12)
for i in range(24):
    a=2*math.pi*i/24;r=1.29;x,z=math.sin(a)*r,math.cos(a)*r-.03
    if z>.82 and -.54<x<1.09:continue
    level=i%3+1;rock('observatory-foundation-rock-'+str(i),(x,.18,z),(.14,.12,.13),level);cloud('observatory-garden-bed-'+str(i),(x,.29,z),(.15,.10,.13),level,detail=12)
    if i%2:cloud('observatory-violet-bed-'+str(i),(x+.025,.37,z),(.07,.08,.07),level,flowers=True,detail=8)
for i,(x,z,level) in enumerate([(-1.16,-.58,1),(1.17,-.52,2),(-.29,-1.05,3),(1.16,.62,3)]):
    for j in range(4):cloud('observatory-cypress-'+str(i)+'-'+str(j),(x,.30+j*.15,z),(.080*(1-j*.12),.19,.080*(1-j*.12)),level,detail=4)
for i,(x,y,z,level) in enumerate([(-1.10,1.12,.13,1),(-.51,1.12,.59,1),(1.13,1.05,.48,2),(.55,1.055,.78,2),(-.55,1.80,-.84,3)]):
    for j in range(4):cloud('observatory-hanging-ivy-'+str(i)+'-'+str(j),(x+.02*math.sin(j),y-j*.085,z+.01*j),(.065,.075,.06),level,detail=6)

# Front aperture and canonical lift clearance checks use actual unbatched meshes.
bpy.context.view_layer.update()
aperture=[]
for y in [1.35,1.60,1.90,2.20,2.40]:
    hits=[]
    for name in ['west-split-blue-dome-shell','east-split-blue-dome-shell']:
        o=bpy.data.objects[name];hit,location,normal,index=o.ray_cast(Vector(xyz((0,y,2.0))),Vector((0,1,0)))
        if hit:hits.append(name)
    aperture.append({'y':y,'centreFrontBlockedByShell':hits,'passed':not hits})
assert all(c['passed'] for c in aperture)
near=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    for v in o.data.vertices:
        p=o.matrix_world@v.co;x,y,z=p.x,p.z,-p.y
        if .20<y<1.15 and math.hypot(x-.72,z-1.07)<.20:near.append(o.name);break
assert not near, 'Lift clearance intrusions: '+str(near)
(OUT/'event-v02-aperture-clearance-checks.json').write_text(json.dumps({'aperture':aperture,'liftClearanceRadius':.20,'liftClearanceHeight':[.20,1.15],'intrudingMeshes':near},indent=2)+'\n')

# Verify occupied roofs retain actual positive piers before consolidation.
bpy.context.view_layer.update();support_results=[]
for item in roof_contacts:
    checks=[]
    for name in item['supportNames']:
        o=bpy.data.objects[name];o.data.calc_loop_triangles();ys=[v.co.z for v in o.data.vertices];checks.append({'name':name,'minY':min(ys),'maxY':max(ys),'triangles':len(o.data.loop_triangles),'passed':min(ys)<=item['floor'] and max(ys)>=item['top']})
    assert all(c['passed'] for c in checks);support_results.append({'roof':item['roof'],'supports':checks,'passed':True})
(OUT/'event-v02-support-checks.json').write_text(json.dumps(support_results,indent=2)+'\n')
for owner_name,owner in owners.items():
    buckets={}
    for o in list(owner.children):
        if o.type!='MESH':continue
        # Multi-material dome meshes remain one logical stage object. Group only
        # identical material sets so paired inner/outer roof faces keep materials.
        key=(o['buildLevel'],o['constructionStage'],tuple(m.name for m in o.data.materials));buckets.setdefault(key,[]).append(o)
    for (level,stage,materials),objects in buckets.items():
        parts=[o.name for o in objects];bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'observatory-{owner_name}-L{level}-S{stage}-'+materials[0];o['sourceParts']=parts;o['buildLevel']=level;o['constructionStage']=stage;o['semanticOwner']=owner.name;o.select_set(False)
mins=[math.inf]*3;maxs=[-math.inf]*3;radius=0;records=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    o.data.calc_loop_triangles()
    for vertex in o.data.vertices:
        p=o.matrix_world@vertex.co;v=(p.x,p.z,-p.y);assert all(math.isfinite(x) for x in v)
        for a,x in enumerate(v):mins[a]=min(mins[a],x);maxs[a]=max(maxs[a],x)
        radius=max(radius,math.hypot(v[0],v[2]))
    records.append({'name':o.name,'level':o['buildLevel'],'stage':o['constructionStage'],'owner':o['semanticOwner'],'materials':[m.name for m in o.data.materials],'triangles':len(o.data.loop_triangles),'sourceParts':list(o['sourceParts'])})
for level in [1,2,3]:assert {r['stage'] for r in records if r['level']==level}==set(range(1,6))
assert radius<=1.6,f'Radius {radius}'
report={'status':'whole-island-complete-model-awaiting-integrated-review','landmarkId':'event','axes':'Y-up/front+Z/ground0','sockets':{'lift':[.72,.15,1.07]},'bbox':{'min':mins,'max':maxs},'radius':radius,'triangles':sum(r['triangles'] for r in records),'authoringMeshCount':len(records),'completedOwnerMaterialBatches':len({(r['owner'],m) for r in records for m in r['materials']}),'materials':sorted({m for r in records for m in r['materials']}),'levels':{str(l):{'addedTriangles':sum(r['triangles'] for r in records if r['level']==l),'cumulativeTriangles':sum(r['triangles'] for r in records if r['level']<=l),'stages':sorted({r['stage'] for r in records if r['level']==l})} for l in [1,2,3]},'meshes':records,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'event-v02-metadata.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'event-v02.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'event-v02.glb'),export_format='GLB',export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('OBSERVATORY_REPORT '+json.dumps({k:report[k] for k in ['bbox','radius','triangles','authoringMeshCount','completedOwnerMaterialBatches','levels']}))
