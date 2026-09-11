"""Complete Wisdom Archive V2 authored from the approved lower-left landmark."""
import bpy,bmesh,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/gauntlets/island-001-v2/whole-island/models/wisdom';OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(1002)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return (p[0],-p[2],p[1])
def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
root=empty('ISLAND_001_V2_WISDOM_ARCHIVE');root['id']='wisdom';root['landmarkId']='wisdom';root['logicalAxes']='Y-up;front+Z;ground0';root['assetStatus']='whole-island-v01-draft';root['sockets']={'lift':[.72,.15,1.07]}
owners={n:empty('archive-'+n,root) for n in ['wings','terraces','globe']}
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
stone=mat('archive-warm-limestone',(.84,.79,.67),vertex=True)
wood=mat('archive-books-and-walnut',(.39,.20,.07),vertex=True)
brass=mat('archive-warm-gold',(.73,.47,.14),.27,.7)
warm=mat('archive-reading-lights',(1,.53,.15),.3,0,1.8)
glass=mat('archive-clear-window-glass',(.62,.80,.79),.12,.02,alpha=.18)
leaf=mat('archive-garden-colors',(.23,.36,.07),.86,vertex=True)
water=mat('archive-rooftop-water',(.10,.46,.56),.18,.16,alpha=.86)
blue=mat('archive-celestial-blue',(.018,.09,.30),.25,.25)
def mesh(name,verts,faces,material,owner,level=1,stage=1,colors=None,smooth=False):
    data=bpy.data.meshes.new(name+'-mesh');data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=owners[owner];obj.data.materials.append(material)
    obj['buildLevel']=level;obj['constructionStage']=stage;obj['semanticOwner']='archive-'+owner
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

# Explicit positive arched architecture; transparent glazing occupies real voids.
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
        h=(top-bottom)*.72;w=opening*.83;c=(mid[0]+normal[0]*.20,bottom+.04+h/2,mid[1]+normal[1]*.20)
        localbox(name+'-bookcase-back',c,ax,(w,h,.025),wood,'wings',level,3)
        for row in range(3):
            y=bottom+.05+row*h/3
            localbox(name+'-shelf-'+str(row),(c[0]-normal[0]*.023,y,c[2]-normal[1]*.023),ax,(w,.013,.08),wood,'wings',level,3)
            for j in range(4):
                offset=(j-1.5)*w/4;bh=h/3*rng.uniform(.57,.91);col=rng.choice([(.18,.27,.31),(.47,.15,.10),(.40,.29,.09),(.22,.34,.20),(.64,.46,.20),(.30,.17,.29)])
                localbox(name+'-book-'+str(row)+'-'+str(j),(c[0]+ax[0]*offset-normal[0]*.045,y+.012+bh/2,c[2]+ax[1]*offset-normal[1]*.045),ax,(w/5,bh,.07),wood,'wings',level,3,col)
        localbox(name+'-warm-reading-strip',(mid[0]+normal[0]*.11,top-.073,mid[1]+normal[1]*.11),ax,(opening*.54,.018,.02),warm,'wings',level,5)
    return supports

def library(name,outline,bottom,top,level,books=True):
    slab(name+'-continuous-floor',outline,bottom-.045,bottom+.006,stone,'wings',level,1)
    supports=[];centre=(sum(p[0] for p in outline)/len(outline),sum(p[1] for p in outline)/len(outline))
    for i,(a,b) in enumerate(zip(outline,outline[1:]+outline[:1])):
        supports += wallbay(name+'-bay-'+str(i),a,b,bottom,top,level,books,centre)
    roof=slab(name+'-occupied-roof',outline,top-.008,top+.065,stone,'wings',level,2)
    roof_contacts.append({'roof':roof.name,'top':top,'floor':bottom,'supportNames':supports})

# Broad inhabited ground floor with a continuous rounded frontage.
grade=[(-1.37,-.36),(-1.10,-.94),(-.48,-1.10),(.52,-1.10),(1.23,-.69),(1.45,.0),(1.32,.58),(.90,1.09),(.32,1.30),(-.38,1.26),(-1.03,.89),(-1.39,.28)]
slab('arrival-reading-court',grade,0,.15,stone,'terraces',1,1)
low=[(-1.23,-.39),(-1.04,-.78),(-.55,-.98),(.03,-1.00),(.63,-.88),(1.07,-.54),(1.27,-.06),(1.21,.39),(.89,.71),(.37,.87),(-.19,.79),(-.68,.56),(-1.13,.21)]
library('lower-crescent-archive',low,.17,.665,1)
# The long upper reading wing sweeps around the globe court, with a stepped
# shoulder rather than four symmetric tower volumes.
upper=[(-.49,-.77),(.02,-.91),(.55,-.82),(.98,-.51),(1.19,-.08),(1.13,.35),(.79,.67),(.33,.80),(-.12,.72),(-.48,.49),(-.59,.13),(-.44,-.26)]
library('upper-sweeping-reading-wing',upper,.730,1.255,2)
# Taller west wing is an elongated reading room, flat roof garden and window wall.
west=[(-.79+math.sin(2*math.pi*i/11)*.44,-.34+math.cos(2*math.pi*i/11)*.57) for i in range(11)]
library('west-high-reading-gallery',west,.730,1.505,3)

# Exterior approaches and real curved ascent to successive occupied terraces.
for i in range(5):
    z=1.08+i*.055;slab('front-library-step-'+str(i),[(-.44,z),(.19,z),(.19,z+.055),(-.44,z+.055)],max(0,.12-i*.025),.15-i*.025,stone,'terraces',1,1)
stair('lower-library-outer-stair',[(-.53,.97),(-.85,.74),(-1.13,.42),(-1.18,.06),(-1.05,-.23)],.15,.730,.27,1)
stair('main-library-curving-stair',[(.04,.90),(-.27,.77),(-.50,.55),(-.63,.27),(-.50,.10)],.730,1.320,.235,2)
stair('west-roof-reading-stair',[(-.35,.41),(-.44,.40),(-.63,.34),(-.79,.20)],1.320,1.570,.20,3)

# Low roof edges and fine terrace rails frame reading gardens, not battlements.
def guardrail(name,points,y,level):
    pts=[(x,y+.14,z) for x,z in points];tube(name+'-top',pts,[.012]*len(pts),brass,'terraces',level,5,4,len(pts)*2)
    for i,(x,z) in enumerate(points):beam(name+'-post-'+str(i),(x,y+.01,z),(x,y+.14,z),.009,brass,'terraces',level,5,4)
for name,poly,y,level in [('arrival',low,.730,1),('upper',upper,1.320,2),('west',west,1.570,3)]:
    # Selected perimeter roof garden borders leave both stair arrivals open.
    selected=poly[:8] if name!='west' else poly[3:]+poly[:2]
    guardrail(name+'-reading-terrace-rail',selected,y,level)

# Rooftop fountain supports the celestial globe; the occupied room is directly below.
cx,cz=.20,-.36
pool=[(cx+math.sin(2*math.pi*i/40)*.43,cz+math.cos(2*math.pi*i/40)*.39) for i in range(40)]
slab('celestial-pool-stone-coping',pool,1.315,1.385,stone,'terraces',2,1)
slab('celestial-pool-water',[(cx+math.sin(2*math.pi*i/40)*.38,cz+math.cos(2*math.pi*i/40)*.34) for i in range(40)],1.386,1.397,water,'terraces',2,4)
for r,y0,y1 in [(.19,1.387,1.44),(.11,1.44,1.54),(.16,1.54,1.57)]:
    poly=[(cx+math.sin(2*math.pi*i/24)*r,cz+math.cos(2*math.pi*i/24)*r) for i in range(24)];slab('globe-pedestal-'+str(int(y0*1000)),poly,y0,y1,brass,'globe',2,3)

def sphere(name,c,r,material,owner,level,stage,segments=24,rings=14):
    verts=[];faces=[]
    for i in range(rings+1):
        phi=math.pi*i/rings
        for j in range(segments):
            a=2*math.pi*j/segments;verts.append((c[0]+math.sin(phi)*math.sin(a)*r,c[1]+math.cos(phi)*r,c[2]+math.sin(phi)*math.cos(a)*r))
    for i in range(rings):
        for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
    o=mesh(name,verts,faces,material,owner,level,stage,smooth=True);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o
GC=(cx,1.94,cz);R=.365
sphere('deep-blue-celestial-globe',GC,R,blue,'globe',2,4)
def globe_ring(name,normal,radius,level,stage,thick=.009):
    n=Vector(normal).normalized();a=n.cross(Vector((0,1,0)))
    if a.length<.1:a=Vector((1,0,0))
    a.normalize();b=n.cross(a).normalized();pts=[]
    for j in range(41):
        ang=2*math.pi*j/40;p=Vector(GC)+(a*math.cos(ang)+b*math.sin(ang))*radius;pts.append(tuple(p))
    tube(name,pts,[thick]*len(pts),brass,'globe',level,stage,5,40)
for k,normal in enumerate([(1,0,0),(0,0,1),(1,.3,1)]):globe_ring('gold-meridian-'+str(k),normal,R+.006,2,5,.005)
for i,phi in enumerate([-.66,-.33,0,.33,.66]):
    yy=GC[1]+phi*R;r=math.sqrt(1-phi*phi)*(R+.005);pts=[(cx+math.sin(2*math.pi*j/40)*r,yy,cz+math.cos(2*math.pi*j/40)*r) for j in range(41)];tube('gold-latitude-'+str(i),pts,[.004]*len(pts),brass,'globe',2,5,4,40)
globe_ring('outer-tilted-armillary',(.2,1,.6),.427,3,5,.010)
globe_ring('swept-outer-orbit',(1,.25,-.3),.450,3,5,.009)
# Fine constellations with real star beads on the blue surface.
for k in range(14):
    phi=rng.uniform(.27,2.65);a=rng.uniform(0,2*math.pi);c=(cx+math.sin(phi)*math.sin(a)*(R+.009),GC[1]+math.cos(phi)*(R+.009),cz+math.sin(phi)*math.cos(a)*(R+.009));sphere('celestial-star-'+str(k),c,.008,brass,'globe',3,5,6,4)
beam('globe-north-spindle',(cx,2.30,cz),(cx,2.41,cz),.008,brass,'globe',3,5,5)
for angle in [0,math.pi/2,math.pi/4,-math.pi/4]:
    x,y=math.sin(angle)*.055,math.cos(angle)*.055;beam('north-star-ray-'+str(int(angle*100)),(cx-x,2.40-y,cz),(cx+x,2.40+y,cz),.005,brass,'globe',3,5,4)

# Furnished reading terraces: open books, low chairs and small planted trees.
def table(name,x,y,z,level,size=.14):
    poly=[(x+math.sin(2*math.pi*i/10)*size,z+math.cos(2*math.pi*i/10)*size) for i in range(10)];slab(name+'-tabletop',poly,y+.13,y+.15,wood,'terraces',level,3)
    beam(name+'-table-leg',(x,y,z),(x,y+.13,z),.022,wood,'terraces',level,3,5)
    for sign in [-1,1]:
        xx=x+sign*(size+.055);box(name+'-chair-seat-'+str(sign),(xx,y+.073,z),(.09,.025,.09),wood,'terraces',level,3);box(name+'-chair-back-'+str(sign),(xx+sign*.035,y+.12,z),(.018,.10,.09),wood,'terraces',level,3)
        for dz in [-.03,.03]:beam(name+'-chair-leg-'+str(sign)+'-'+str(int(dz*100)),(xx,y,z+dz),(xx,y+.07,z+dz),.012,wood,'terraces',level,3,4)
    # Two cream pages and a dark spine are visible from the island camera.
    box(name+'-open-book',(x,y+.161,z),(.075,.012,.054),stone,'terraces',level,3,(.94,.89,.73))
for i,(x,y,z,level) in enumerate([(.86,.730,.34,1),(-.82,.730,-.59,1),(.78,1.320,.19,2),(-.11,1.320,-.72,2),(-.85,1.570,-.49,3),(-.84,1.570,.0,3)]):table('reading-table-'+str(i),x,y,z,level,.115)
for i,(x,y,z,level) in enumerate([(-1.04,.730,-.47,1),(.94,.730,-.46,1),(.85,1.320,-.36,2),(.09,1.320,.50,2),(-1.04,1.570,-.27,3),(-.82,1.570,-.74,3)]):
    r=.075;poly=[(x+math.sin(2*math.pi*j/10)*r,z+math.cos(2*math.pi*j/10)*r) for j in range(10)];slab('roof-tree-pot-'+str(i),poly,y,y+.11,stone,'terraces',level,4)
    tube('roof-reading-tree-trunk-'+str(i),[(x,y+.08,z),(x-.035,y+.30,z),(x+.01,y+.44,z)],[.025,.019,.008],wood,'terraces',level,4,6,7)
    for j in range(3):cloud('roof-reading-tree-leaves-'+str(i)+'-'+str(j),(x+(.07 if j==0 else -.065 if j==1 else 0),y+.40+j*.025,z+(.055 if j==1 else -.035)),(.12,.095,.12),level,detail=12)

# Dense, economical flowers, roof-edge drapes and natural foundation rocks.
for i in range(25):
    a=2*math.pi*i/25;r=1.28;x,z=math.sin(a)*r,math.cos(a)*r-.03
    if z>.85 and -.55<x<1.05:continue
    level=i%3+1;rock('archive-foundation-rock-'+str(i),(x,.17,z),(.14,.115,.13),level);cloud('archive-ground-garden-'+str(i),(x,.30,z),(.14,.105,.13),level,detail=10)
    if i%2:cloud('archive-violet-flowers-'+str(i),(x+.025,.36,z),(.07,.09,.07),level,flowers=True,detail=8)
for i,(x,y,z,level) in enumerate([(-1.12,1.56,-.07,3),(-.59,1.55,.04,3),(.99,1.31,.29,2),(.38,1.31,.79,2),(-.51,.73,.61,1)]):
    for j in range(5):cloud('archive-hanging-garden-'+str(i)+'-'+str(j),(x+.025*math.sin(j),y-j*.085,z+.018*j),(.07,.075,.065),level,detail=5)
# Lit tables and arch thresholds remain emissive accents, not real point lights.
for i,(x,y,z,level) in enumerate([(.80,.86,.32,1),(-.89,.87,-.48,1),(.81,1.45,.13,2),(-.05,1.45,-.70,2),(-.86,1.70,-.48,3),(-.84,1.70,.02,3)]):
    beam('reading-lamp-stem-'+str(i),(x,y,z),(x,y+.06,z),.007,brass,'terraces',level,5,4)
    sphere('reading-lamp-glow-'+str(i),(x,y+.063,z),.018,brass,'terraces',level,5,8,4)

# Prove each occupied roof has real positive piers before consolidating parts.
bpy.context.view_layer.update();support_results=[]
for item in roof_contacts:
    checks=[]
    for name in item['supportNames']:
        o=bpy.data.objects[name];o.data.calc_loop_triangles();ys=[v.co.z for v in o.data.vertices];checks.append({'name':name,'minY':min(ys),'maxY':max(ys),'triangles':len(o.data.loop_triangles),'passed':min(ys)<=item['floor'] and max(ys)>=item['top']})
    assert all(c['passed'] for c in checks);support_results.append({'roof':item['roof'],'supports':checks,'passed':True})
(OUT/'wisdom-v01-support-checks.json').write_text(json.dumps(support_results,indent=2)+'\n')
for owner_name,owner in owners.items():
    buckets={}
    for o in list(owner.children):
        if o.type!='MESH':continue
        buckets.setdefault((o['buildLevel'],o['constructionStage'],o.data.materials[0].name),[]).append(o)
    for (level,stage,material),objects in buckets.items():
        parts=[o.name for o in objects];bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=f'archive-{owner_name}-L{level}-S{stage}-{material}';o['sourceParts']=parts;o['buildLevel']=level;o['constructionStage']=stage;o['semanticOwner']=owner.name;o.select_set(False)
mins=[math.inf]*3;maxs=[-math.inf]*3;radius=0;records=[]
for o in root.children_recursive:
    if o.type!='MESH':continue
    o.data.calc_loop_triangles()
    for vertex in o.data.vertices:
        p=o.matrix_world@vertex.co;v=(p.x,p.z,-p.y);assert all(math.isfinite(x) for x in v)
        for a,x in enumerate(v):mins[a]=min(mins[a],x);maxs[a]=max(maxs[a],x)
        radius=max(radius,math.hypot(v[0],v[2]))
    records.append({'name':o.name,'level':o['buildLevel'],'stage':o['constructionStage'],'owner':o['semanticOwner'],'material':o.data.materials[0].name,'triangles':len(o.data.loop_triangles),'sourceParts':list(o['sourceParts'])})
for level in [1,2,3]:assert {r['stage'] for r in records if r['level']==level}==set(range(1,6))
assert radius<=1.6,f'Radius {radius}'
report={'status':'whole-island-complete-model-awaiting-integrated-review','landmarkId':'wisdom','axes':'Y-up/front+Z/ground0','sockets':{'lift':[.72,.15,1.07]},'bbox':{'min':mins,'max':maxs},'radius':radius,'triangles':sum(r['triangles'] for r in records),'authoringMeshCount':len(records),'completedOwnerMaterialBatches':len({(r['owner'],r['material']) for r in records}),'materials':sorted({r['material'] for r in records}),'levels':{str(l):{'addedTriangles':sum(r['triangles'] for r in records if r['level']==l),'cumulativeTriangles':sum(r['triangles'] for r in records if r['level']<=l),'stages':sorted({r['stage'] for r in records if r['level']==l})} for l in [1,2,3]},'meshes':records,'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'wisdom-v01-metadata.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wisdom-v01.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'wisdom-v01.glb'),export_format='GLB',export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
print('ARCHIVE_REPORT '+json.dumps({k:report[k] for k in ['bbox','radius','triangles','authoringMeshCount','completedOwnerMaterialBatches','levels']}))
