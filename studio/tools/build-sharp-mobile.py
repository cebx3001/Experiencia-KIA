"""Preserve geometry/alpha semantics; improve optically sensitive maps without loading 4K on phones."""
from glb_tools import *
from PIL import Image
import io,copy,hashlib
root=Path(__file__).resolve().parents[1]/'assets';j,b=read(root/'kia-tasman-web.glb');d=copy.deepcopy(j);images={im['bufferView']:im for im in d['images']};data=bytearray();report=[]
for vi,v in enumerate(d['bufferViews']):
 raw=b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 if vi in images:
  name=images[vi]['name'];size=2048 if name in ['MI_Tasman_Car_BaseColor','MI_Tasman_Interior_BaseColor','MI_Tasman_Premium_Paint_SK_KiaTasman_Master_Normal','MI_Tasman_Premium_Paint_SK_KiaTasman_Master_ClearCoatNormal','MI_Tasman_Master_Tire_Rubber_Normal'] else 1024
  im=Image.open(io.BytesIO(raw));im.thumbnail((size,size),Image.Resampling.LANCZOS);out=io.BytesIO();im.save(out,format='PNG',optimize=True);raw=out.getvalue();report.append({'name':name,'width':im.width,'height':im.height,'bytes':len(raw)})
 while len(data)%4:data.append(0)
 v['byteOffset']=len(data);v['byteLength']=len(raw);data.extend(raw)
file=root/'kia-tasman-mobile-sharp.glb';write(file,d,data)
# Prove all compressed geometry unchanged, not just an equal triangle count.
for mesh in j['meshes']:
 for p in mesh['primitives']:
  idx=p['extensions']['KHR_draco_mesh_compression']['bufferView'];a=j['bufferViews'][idx];z=d['bufferViews'][idx];assert b[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==data[z['byteOffset']:z['byteOffset']+z['byteLength']]
assert j['nodes']==d['nodes'] and j['materials']==d['materials']
(root/'audit/mobile-sharp.json').write_text(json.dumps({'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'geometryIdentical':True,'materialsIdentical':True,'images':report,'estimatedVehicleTextureBytes':sum(x['width']*x['height']*16//3 for x in report)},indent=2))
print(file.stat().st_size)
