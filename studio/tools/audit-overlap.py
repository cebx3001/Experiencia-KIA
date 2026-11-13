import json,struct,DracoPy,numpy as np,collections
b=open('studio/assets/kia-tasman-mobile.glb','rb').read();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:];rows=[];labels=[]
worlds={}
def walk(i,parent):
 n=j['nodes'][i]
 if 'matrix'in n:local=np.array(n['matrix']).reshape(4,4).T
 else:
  x,y,z,w=n.get('rotation',[0,0,0,1]);local=np.eye(4);local[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]));local[:3,3]=n.get('translation',[0,0,0])
 world=parent@local
 if 'mesh'in n:worlds[n['mesh']]=world
 for child in n.get('children',[]):walk(child,world)
for i in j['scenes'][j.get('scene',0)]['nodes']:walk(i,np.eye(4))
for mi,m in enumerate(j['meshes']):
 for p in m['primitives']:
  v=j['bufferViews'][p['extensions']['KHR_draco_mesh_compression']['bufferView']];d=DracoPy.decode(data[v['byteOffset']:v['byteOffset']+v['byteLength']]);world=worlds[mi];points=d.points@world[:3,:3].T+world[:3,3];pts=points[d.faces];centers=np.round(pts.mean(1)*1e5).astype(np.int64);area=np.linalg.norm(np.cross(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0]),axis=1);r=np.column_stack((centers,np.round(area*1e8).astype(np.int64)));rows.append(r);labels.extend([(mi,p['material'])]*len(r))
r=np.concatenate(rows);dt=np.dtype([('a','i8'),('b','i8'),('c','i8'),('d','i8')]);flat=np.ascontiguousarray(r).view(dt).reshape(-1);order=np.argsort(flat);pairs=np.where(flat[order][1:]==flat[order][:-1])[0];c=collections.Counter()
for i in pairs:
 a,b=labels[order[i]],labels[order[i+1]]
 if a!=b:c[(a,b)]+=1
print('faces',len(r),'equal center/area pairs',len(pairs),'cross primitive',sum(c.values()));print(c.most_common(15))
