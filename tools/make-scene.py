#!/usr/bin/env python3
"""Generate a small Cocos Creator 3.8 serialized scene with a mounted runtime controller."""
import json,uuid,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
def rand():return str(uuid.uuid4())
def compact(u):
  raw=u.replace('-','')
  abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  out=raw[:5]
  for i in range(5,len(raw),3):
    n=[int(c,16) for c in raw[i:i+3]]
    out+=abc[(n[0]<<2)|(n[1]>>2)]+abc[((n[1]&3)<<4)|n[2]]
  return out
script_uuid=rand();scene_uuid=rand()
def V(x=0,y=0,z=0):return {'__type__':'cc.Vec3','x':x,'y':y,'z':z}
def node(name,parent,children,components,layer,pos=None):
  return {'__type__':'cc.Node','_name':name,'_objFlags':0,'__editorExtras__':{},'_parent':{'__id__':parent},'_children':[{'__id__':n} for n in children], '_active':True,'_components':[{'__id__':n} for n in components], '_prefab':None,'_lpos':pos or V(), '_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1},'_lscale':V(1,1,1),'_mobility':0,'_layer':layer,'_euler':V(),'_id':compact(rand())}
def comp(type_,idx):return {'__type__':type_,'_name':'','_objFlags':0,'__editorExtras__':{},'node':{'__id__':idx},'_enabled':True,'__prefab':None,'_id':compact(rand())}
s=[
 {'__type__':'cc.SceneAsset','_name':'Main','_objFlags':0,'__editorExtras__':{},'_native':'','scene':{'__id__':1}},
 {'__type__':'cc.Scene','_name':'Main','_objFlags':0,'__editorExtras__':{},'_parent':None,'_children':[{'__id__':2}], '_active':True, '_components':[],'_prefab':None, '_lpos':V(), '_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1}, '_lscale':V(1,1,1), '_mobility':0,'_layer':1073741824,'_euler':V(), 'autoReleaseAssets':False,'_globals':{'__id__':8},'_id':scene_uuid},
 node('Canvas',1,[3],[5,6,7],33554432),
 node('UICamera',2,[],[4],33554432,V(0,0,1000)),
 dict(comp('cc.Camera',3),**{'_projection':0,'_priority':1073741824,'_fov':45,'_fovAxis':0,'_orthoHeight':667,'_near':1,'_far':2000, '_color':{'__type__':'cc.Color','r':0,'g':0,'b':0,'a':0},'_depth':1,'_stencil':0,'_clearFlags':7,'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1},'_aperture':19,'_shutter':7,'_iso':0,'_screenScale':1,'_visibility':33554432,'_targetTexture':None,'_postProcess':None,'_usePostProcess':False,'_cameraType':-1,'_trackingType':0}),
 dict(comp('cc.UITransform',2),**{'_contentSize':{'__type__':'cc.Size','width':750,'height':1334},'_anchorPoint':{'__type__':'cc.Vec2','x':0.5,'y':0.5}}),
 dict(comp('cc.Canvas',2),**{'_cameraComponent':{'__id__':4},'_alignCanvasWithScreen':True}),
 comp(compact(script_uuid),2),
 {'__type__':'cc.SceneGlobals','ambient':{'__id__':9},'shadows':{'__id__':10},'_skybox':{'__id__':11},'fog':{'__id__':12},'octree':{'__id__':13},'skin':{'__id__':14},'lightProbeInfo':{'__id__':15},'postSettings':{'__id__':16},'bakedWithStationaryMainLight':False,'bakedWithHighpLightmap':False},
 {'__type__':'cc.AmbientInfo','_skyColorHDR':{'__type__':'cc.Vec4','x':0.2,'y':0.5,'z':0.8,'w':0.52},'_skyColor':{'__type__':'cc.Vec4','x':0.2,'y':0.5,'z':0.8,'w':0.52},'_skyIllumHDR':20000,'_skyIllum':20000,'_groundAlbedoHDR':{'__type__':'cc.Vec4','x':0.28,'y':0.28,'z':0.28,'w':1},'_groundAlbedo':{'__type__':'cc.Vec4','x':0.28,'y':0.28,'z':0.28,'w':1},'_skyColorLDR':{'__type__':'cc.Vec4','x':0.2,'y':0.5,'z':0.8,'w':0.78},'_skyIllumLDR':0.78,'_groundAlbedoLDR':{'__type__':'cc.Vec4','x':0.28,'y':0.28,'z':0.28,'w':1}},
 {'__type__':'cc.ShadowsInfo','_enabled':False,'_type':0,'_normal':V(0,1,0),'_distance':0,'_planeBias':1,'_shadowColor':{'__type__':'cc.Color','r':0,'g':0,'b':0,'a':128},'_maxReceived':4,'_size':{'__type__':'cc.Vec2','x':512,'y':512}},
 {'__type__':'cc.SkyboxInfo','_envLightingType':0,'_envmapHDR':None,'_envmap':None,'_envmapLDR':None,'_diffuseMapHDR':None,'_diffuseMapLDR':None,'_enabled':False,'_useHDR':False,'_editableMaterial':None,'_reflectionHDR':None,'_reflectionLDR':None,'_rotationAngle':0},
 {'__type__':'cc.FogInfo','_type':0,'_fogColor':{'__type__':'cc.Color','r':200,'g':200,'b':200,'a':255},'_enabled':False,'_fogDensity':0.3,'_fogStart':0.5,'_fogEnd':300,'_fogAtten':5,'_fogTop':1.5,'_fogRange':1.2,'_accurate':False},
 {'__type__':'cc.OctreeInfo','_enabled':False,'_minPos':V(-1024,-1024,-1024),'_maxPos':V(1024,1024,1024),'_depth':8},
 {'__type__':'cc.SkinInfo','_enabled':True,'_blurRadius':0.01,'_sssIntensity':3},
 {'__type__':'cc.LightProbeInfo','_giScale':1,'_giSamples':1024,'_bounces':2,'_reduceRinging':0,'_showProbe':True,'_showWireframe':True,'_showConvex':False,'_data':None,'_lightProbeSphereVolume':1},
 {'__type__':'cc.PostSettingsInfo','_toneMappingType':0},
]
out=root/'assets/scenes/Main.scene'
out.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out.parent/'Main.scene.meta').write_text(json.dumps({'ver':'1.1.50','importer':'scene','imported':True,'uuid':scene_uuid,'files':['.json'],'subMetas':{},'userData':{}},indent=2)+'\n')
(root/'assets/scripts/Main.ts.meta').write_text(json.dumps({'ver':'4.0.23','importer':'typescript','imported':True,'uuid':script_uuid,'files':[],'subMetas':{},'userData':{}},indent=2)+'\n')
print('scene UUID',scene_uuid,'script class ID',compact(script_uuid),'serial nodes',len(s))
