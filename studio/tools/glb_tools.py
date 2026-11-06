from pathlib import Path
import json,struct,numpy as np
DT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
N={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def read(path):
    path=Path(path)
    if path.suffix=='.glb':
        raw=path.read_bytes(); ln=struct.unpack_from('<I',raw,12)[0]
        j=json.loads(raw[20:20+ln]);binary=raw[28+ln:]
    else:
        j=json.loads(path.read_text());binary=(path.parent/j['buffers'][0]['uri']).read_bytes()
    return j,binary
def array(j,b,idx):
    a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];dt=np.dtype(DT[a['componentType']]);n=N[a['type']]
    out=np.ndarray((a['count'],n),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize))
    return out
def worlds(j):
    result={}
    def visit(idx,parent):
        n=j['nodes'][idx]
        if 'matrix' in n:m=np.array(n['matrix']).reshape(4,4).T
        else:
            x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4)
            m[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
            m[:3,:3]*=n.get('scale',[1,1,1]);m[:3,3]=n.get('translation',[0,0,0])
        result[idx]=parent@m
        for c in n.get('children',[]):visit(c,result[idx])
    for scene in j['scenes']:
        for idx in scene['nodes']:visit(idx,np.eye(4))
    return result
def triangles(j,b):
    mats=worlds(j)
    for ni,n in enumerate(j['nodes']):
        if 'mesh' not in n:continue
        m=mats[ni]
        for pi,p in enumerate(j['meshes'][n['mesh']]['primitives']):
            vertices=array(j,b,p['attributes']['POSITION'])
            positions=vertices@m[:3,:3].T+m[:3,3]
            ind=array(j,b,p['indices']).ravel().reshape(-1,3)
            uv=array(j,b,p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else None
            yield ni,pi,p,positions,ind,uv
def append_view(j,b,data,target=None):
    while len(b)%4:b.append(0)
    v={'buffer':0,'byteOffset':len(b),'byteLength':len(data)}
    if target:v['target']=target
    j['bufferViews'].append(v);b.extend(data)
    return len(j['bufferViews'])-1
def write(path,j,b):
    j['buffers']=[{'byteLength':len(b)}]
    js=json.dumps(j,separators=(',',':'),ensure_ascii=True).encode()
    js+=b' '*((-len(js))%4);binary=bytes(b)+b'\0'*((-len(b))%4)
    Path(path).write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
