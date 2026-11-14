"""Extend surface heights through occluded tire footprints for smooth rendering.
The conservative numerical fluid fields/metadata are unchanged.
"""
import numpy as np
from PIL import Image
p='studio/assets/r03/water-height-atlas.png';a=np.asarray(Image.open(p)).copy();N=128;dx=16/N;x,z=np.meshgrid((np.arange(N)+.5)*dx-8,(np.arange(N)+.5)*dx-8);solid=np.zeros((N,N),bool)
for xx in [-.81142,.81142]:
 for zz in [-1.635,1.635]:solid|=(x-xx)**2+(z-zz)**2<.27**2
for f in range(64):
 tile=a[f//8*N:(f//8+1)*N,f%8*N:(f%8+1)*N];h=tile[:,:,0].astype(float)*256+tile[:,:,1];h[solid]=np.nan
 for _ in range(12):
  neighbor=np.stack([np.roll(h,1,0),np.roll(h,-1,0),np.roll(h,1,1),np.roll(h,-1,1)]);count=np.isfinite(neighbor).sum(0);mean=np.nansum(neighbor,0)/np.maximum(count,1);mask=np.isnan(h)&(count>0);h[mask]=mean[mask]
 assert np.isfinite(h).all();v=np.rint(h).astype(np.uint16);tile[:,:,0]=v>>8;tile[:,:,1]=v&255
Image.fromarray(a).save(p)
