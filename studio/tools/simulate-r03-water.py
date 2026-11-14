"""Conservative Saint-Venant/HLL free-surface simulation. SI units; offline atlas.
A finite computational domain with four tire obstacles and an offscreen inlet.
Time is compressed for presentation; this is not 3D Navier-Stokes/SPH.
"""
import numpy as np,json
from PIL import Image
from pathlib import Path
N=128;dx=16/N;dt=.006;g=9.81
x,z=np.meshgrid((np.arange(N)+.5)*dx-8,(np.arange(N)+.5)*dx-8)
solid=np.zeros((N,N),bool)
for xx in [-.81142,.81142]:
 for zz in [-1.635,1.635]:solid|=(x-xx)**2+(z-zz)**2<.27**2
u=np.zeros((3,N,N));u[0]=.0001;u[:,solid]=0
source=np.exp(-((x-4.6)**2+z*z)/.32);source[solid]=0;source/=source.sum()*dx*dx
area=(~solid).sum()*dx*dx;target=.8*area
saved=[];means=[];volume0=u[0].sum()*dx*dx;next_save=0.;maxh=0.;minh=1.;mass_error=0.;added=0

def hll(a,b,axis):
 h1=np.maximum(a[0],1e-6);h2=np.maximum(b[0],1e-6);v1=a[axis]/h1;v2=b[axis]/h2;c1=np.sqrt(g*h1);c2=np.sqrt(g*h2);sl=np.minimum(v1-c1,v2-c2);sr=np.maximum(v1+c1,v2+c2)
 f1=np.array([a[axis],a[1]*v1,a[2]*v1]);f2=np.array([b[axis],b[1]*v2,b[2]*v2]);f1[axis]+=.5*g*h1*h1;f2[axis]+=.5*g*h2*h2
 mid=(sr[None]*f1-sl[None]*f2+(sl*sr)[None]*(b-a))/np.maximum(1e-6,sr-sl)[None]
 return np.where((sl>=0)[None],f1,np.where((sr<=0)[None],f2,mid))
for step in range(int(38/dt)+1):
 t=step*dt
 if t>=next_save-1e-6:
  saved.append(u[0].copy());means.append(float(u[0].sum()*dx*dx/area));next_save+=38/63
  if len(saved)==64:break
 # Reflect momentum at outer ghost cells; solid cells reflect only normal flux.
 a=np.pad(u,((0,0),(1,1),(1,1)),mode='edge');a[1,:,0]*=-1;a[1,:,-1]*=-1;a[2,0,:]*=-1;a[2,-1,:]*=-1
 l=a[:,1:-1,:-1].copy();r=a[:,1:-1,1:].copy();sm=np.pad(solid,1,mode='edge');ls=sm[1:-1,:-1];rs=sm[1:-1,1:];l[:,ls]=r[:,ls];l[1,ls]*=-1;r[:,rs]=l[:,rs];r[1,rs]*=-1;fx=hll(l,r,1)
 l=a[:,:-1,1:-1].copy();r=a[:,1:,1:-1].copy();ls=sm[:-1,1:-1];rs=sm[1:,1:-1];l[:,ls]=r[:,ls];l[2,ls]*=-1;r[:,rs]=l[:,rs];r[2,rs]*=-1;fz=hll(l,r,2)
 u-=dt/dx*(fx[:,:,1:]-fx[:,:,:-1]+fz[:,1:,:]-fz[:,:-1,:]);u[:,solid]=0
 amount=min(max(0,target-u[0].sum()*dx*dx),8*min(1,t/.6)*dt);u[0]+=source*amount;added+=amount
 u[0]=np.maximum(u[0],0);u[1:]*=np.exp(-.15*dt);u[1:,u[0]<.0004]=0
 maxh=max(maxh,float(u[0].max()));minh=min(minh,float(u[0].min()));
 if not np.isfinite(u).all():raise ValueError('Unstable free surface')
if len(saved)==63:saved.append(u[0].copy());means.append(float(u[0].sum()*dx*dx/area))
print('frames',len(saved),'final mean',means[-1],'max head',maxh)
assert len(saved)==64
atlas=np.zeros((N*8,N*8,4),np.uint8)
for i,h in enumerate(saved):
 encoded=np.rint(np.clip(h/4,0,1)*65535).astype(np.uint16);tile=np.empty((N,N,4),np.uint8);tile[:,:,0]=encoded>>8;tile[:,:,1]=encoded&255;tile[:,:,2]=np.clip(np.hypot(np.gradient(h,dx,axis=0),np.gradient(h,dx,axis=1))*80,0,255).astype(np.uint8);tile[:,:,3]=255;atlas[(i//8)*N:(i//8+1)*N,(i%8)*N:(i%8+1)*N]=tile
out=Path('studio/assets/r03');Image.fromarray(atlas).save(out/'water-height-atlas.png')
(out/'water-simulation.json').write_text(json.dumps({'solver':'2D Saint-Venant finite volume HLL','cells':N,'dxM':dx,'stepSeconds':dt,'physicalSeconds':38,'presentationSeconds':8,'heightScaleM':4,'frames':64,'meanDepthsM':means,'gravity':g,'sourceM3PerSecond':8,'sourcePosition':[4.6,0],'obstacle':'Four tire footprints','maxHeadM':maxh,'massErrorM3':float(u[0].sum()*dx*dx-volume0-added),'scope':'Shallow free-surface approximation, not a full 3D liquid solver. Finite domain boundaries are not rendered.'},indent=2))
