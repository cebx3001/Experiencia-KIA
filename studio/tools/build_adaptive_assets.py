from glb_tools import *
from PIL import Image
import io,copy
root=Path(__file__).resolve().parents[1]/'assets';j,b=read(root/'kia-tasman-web.glb');report=[]
for name,size in [('mobile',1024),('balanced',2048)]:
 d=copy.deepcopy(j);images={i['bufferView']:i for i in d['images']};data=bytearray();texturebytes=0
 for vi,v in enumerate(d['bufferViews']):
  raw=b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if vi in images:
   im=Image.open(io.BytesIO(raw));im.thumbnail((size,size),Image.Resampling.LANCZOS);buf=io.BytesIO();im.save(buf,format='PNG',optimize=True);raw=buf.getvalue();texturebytes+=im.width*im.height*4*4/3
  while len(data)%4:data.append(0)
  v['byteOffset']=len(data);v['byteLength']=len(raw);data.extend(raw)
 file=f'kia-tasman-{name}.glb';write(root/file,d,data);report.append({'name':name,'file':file,'bytes':(root/file).stat().st_size,'maxTextureSize':size,'estimatedRGBAWithMipsBytes':round(texturebytes),'geometrySimplified':False,'geometryDracoBytesPreserved':True,'materials':len(d['materials']),'animations':len(d.get('animations',[]))});print(report[-1],flush=True)
(root/'adaptive-assets.json').write_text(json.dumps(report,indent=2))

