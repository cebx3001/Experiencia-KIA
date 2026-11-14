import json,numpy as np
from pathlib import Path
j=json.load(open('studio/tools/sources/road-geometry.json'));p=np.asarray(j['positions']).reshape(-1,3);tri=np.asarray(j['indices']).reshape(-1,3)
nx,nz=321,641;dx=4/(nx-1);dz=8/(nz-1);height=np.zeros((nz,nx))
for t in tri:
 a,b,c=p[t];den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2])
 if abs(den)<1e-10:continue
 x0=max(0,int(np.floor((min(a[0],b[0],c[0])+2)/dx)));x1=min(nx-1,int(np.ceil((max(a[0],b[0],c[0])+2)/dx)));z0=max(0,int(np.floor((min(a[2],b[2],c[2])+3.5)/dz)));z1=min(nz-1,int(np.ceil((max(a[2],b[2],c[2])+3.5)/dz)))
 if x1<x0 or z1<z0:continue
 x,z=np.meshgrid(np.arange(x0,x1+1)*dx-2,np.arange(z0,z1+1)*dz-3.5);u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;w=1-u-v;mask=(u>=-1e-7)&(v>=-1e-7)&(w>=-1e-7);h=np.where(mask,u*a[1]+v*b[1]+w*c[1],0);height[z0:z1+1,x0:x1+1]=np.maximum(height[z0:z1+1,x0:x1+1],h)
scale=2;encoded=np.rint(np.clip(height/scale,0,1)*65535).astype('<u2');out=Path('studio/assets/r03');(out/'road-height.bin').write_bytes(encoded.tobytes());(out/'road-height.json').write_text(json.dumps({'nx':nx,'nz':nz,'minX':-2,'minZ':-3.5,'sizeX':4,'sizeZ':8,'heightScaleM':scale,'method':'Upper envelope rasterized from actual rendered scanned-rock triangles','triangles':len(tri),'maxHeightM':float(height.max())},indent=2));print('road grid',height.shape,'max',height.max())
