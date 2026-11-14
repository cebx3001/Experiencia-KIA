from glb_tools import *
from PIL import Image
import io
p=Path('studio/assets/r03/rock-road.glb');j,b=read(p);views={i['bufferView']:i for i in j.get('images',[])};data=bytearray()
for idx,v in enumerate(j['bufferViews']):
 raw=b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 if idx in views:
  im=Image.open(io.BytesIO(raw));im.thumbnail((1024,1024),Image.Resampling.LANCZOS);out=io.BytesIO();im.save(out,format='PNG',optimize=True);raw=out.getvalue();views[idx]['mimeType']='image/png'
 while len(data)%4:data.append(0)
 v['byteOffset']=len(data);v['byteLength']=len(raw);data.extend(raw)
write(p,j,data)
