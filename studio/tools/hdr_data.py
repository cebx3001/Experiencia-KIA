from pathlib import Path
import numpy as np

def read_hdr(path):
 f=Path(path).open('rb')
 while f.readline().strip():pass
 parts=f.readline().decode().split();h,w=int(parts[1]),int(parts[3]);data=np.empty((h,w,4),np.uint8)
 for y in range(h):
  head=f.read(4)
  if head[:2]!=bytes([2,2]):raise ValueError('Unsupported scanline')
  for c in range(4):
   x=0
   while x<w:
    count=f.read(1)[0]
    if count>128:n=count-128;data[y,x:x+n,c]=f.read(1)[0]
    else:n=count;data[y,x:x+n,c]=np.frombuffer(f.read(n),np.uint8)
    x+=n
 return data[:,:,:3].astype(np.float32)*np.exp2(data[:,:,3].astype(np.float32)-136)[...,None]
