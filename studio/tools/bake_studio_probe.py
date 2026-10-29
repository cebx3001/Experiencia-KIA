import bpy,math,json
from pathlib import Path
from mathutils import Vector
import argparse,sys
parser=argparse.ArgumentParser()
parser.add_argument('--config',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.output=args.output.resolve();args.output.parent.mkdir(parents=True,exist_ok=True)
config=json.loads(args.config.read_text());panels=config['panels']
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True;scene.cycles.max_bounces=5;scene.render.threads_mode='FIXED';scene.render.threads=10
scene.world=bpy.data.worlds.new('Dark neutral studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.004,.004,.004,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=1

def convert(v):return Vector((v[0],-v[2],v[1]))
def mathnode(nt,op,a,b=None):
 n=nt.nodes.new('ShaderNodeMath');n.operation=op
 for i,v in enumerate([a,b]):
  if v is None:continue
  if isinstance(v,(float,int)):n.inputs[i].default_value=v
  else:nt.links.new(v,n.inputs[i])
 return n.outputs[0]
for p in panels:
 pos=convert(p['position_m']);aim=convert(p['aim_m']);n=(pos-aim).normalized();right=n.cross(Vector((0,0,1)))
 if right.length<.01:right=Vector((1,0,0))
 right.normalize();up=right.cross(n);w,h=p['width_m'],p['height_m'];verts=[pos+right*x*w/2+up*y*h/2 for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]];mesh=bpy.data.meshes.new(p['name']);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();ob=bpy.data.objects.new(p['name'],mesh);scene.collection.objects.link(ob);uv=mesh.uv_layers.new(name='Profile UV')
 for loop,co in zip(mesh.loops,[(0,0),(1,0),(1,1),(0,1)]):uv.data[loop.index].uv=co
 mat=bpy.data.materials.new(p['name']+' graded emitter');mat.use_nodes=True;nt=mat.node_tree;nt.nodes.clear();tc=nt.nodes.new('ShaderNodeTexCoord');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(tc.outputs['UV'],sep.inputs[0]);xy=[]
 for socket in [sep.outputs['X'],sep.outputs['Y']]:xy.append(mathnode(nt,'SUBTRACT',1,mathnode(nt,'ABSOLUTE',mathnode(nt,'SUBTRACT',mathnode(nt,'MULTIPLY',socket,2),1))))
 x=mathnode(nt,'MINIMUM',1,mathnode(nt,'MAXIMUM',0,mathnode(nt,'DIVIDE',xy[0],.25)));xx=mathnode(nt,'MULTIPLY',mathnode(nt,'MULTIPLY',x,x),mathnode(nt,'SUBTRACT',3,mathnode(nt,'MULTIPLY',2,x)));yy=mathnode(nt,'POWER',mathnode(nt,'MAXIMUM',0,xy[1]),.8);profile=mathnode(nt,'MULTIPLY',xx,yy)
 geo=nt.nodes.new('ShaderNodeNewGeometry');front=mathnode(nt,'SUBTRACT',1,geo.outputs['Backfacing']);strength=mathnode(nt,'MULTIPLY',mathnode(nt,'MULTIPLY',profile,p['linear_radiance']),front);em=nt.nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=(*p['tint'],1);nt.links.new(strength,em.inputs['Strength']);out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(em.outputs[0],out.inputs['Surface']);mesh.materials.append(mat)
# Infinite neutral floor with the visible PlayCanvas floor base color and roughness.
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Neutral studio floor';mat=bpy.data.materials.new('Neutral floor PBR');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*config.get('floor_base_color_linear',[.075,.075,.075]),1);bs.inputs['Roughness'].default_value=config.get('floor_roughness',.42);floor.data.materials.append(mat)
# Neutral surrounding wall; large radius keeps it out of the hero framing.
bpy.ops.mesh.primitive_cylinder_add(vertices=128,end_fill_type='NOTHING',radius=24,depth=16,location=(0,0,8));wall=bpy.context.object;wall.name='Studio surround';mat=bpy.data.materials.new('Neutral surround PBR');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.025,.029,.035,1);bs.inputs['Roughness'].default_value=.75;wall.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,0,1),rotation=(math.pi/2,0,math.pi));camera=bpy.context.object;camera.data.type='PANO';camera.data.panorama_type='EQUIRECTANGULAR';scene.camera=camera
scene.render.resolution_x=4096;scene.render.resolution_y=2048;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='HDR';scene.render.image_settings.color_mode='RGB';scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.render.filepath=str(args.output);bpy.ops.render.render(write_still=True)
args.output.with_suffix('.bake.json').write_text(json.dumps({'renderer':'Cycles','samples':64,'resolution':[4096,2048],'panels':panels,'floor':{'base_color_linear':config.get('floor_base_color_linear',[.075]*3),'roughness':config.get('floor_roughness',.42)},'vehicle_in_probe':False,'probe_origin_playcanvas_m':[0,1,0],'purpose':'Capture graded luminaires and actual floor / surround reflections, preserving scene-linear HDR radiance'},indent=2));print('STUDIO_HDR_COMPLETE',flush=True)
