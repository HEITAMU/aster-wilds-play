from pathlib import Path
import json,uuid,random
ROOT=Path(__file__).resolve().parents[1]
BOOT='43e8a93e-5ea9-4c7d-92de-d56306924820'
SCENE='46e8319d-31e5-4dd4-8776-5d9f1c9862c8'
def compressed(s):
 s=s.replace('-','')
 chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 return s[:5]+''.join(chars[int(s[i:i+3],16)//64]+chars[int(s[i:i+3],16)%64] for i in range(5,32,3))
def ref(i):return {'__id__':i}
def node(name,parent,children,components,layer=1073741824,pos=(0,0,0),ident=None):
 return {'__type__':'cc.Node','_name':name,'_objFlags':0,'__editorExtras__':{},'_parent':ref(parent) if parent is not None else None,'_children':[ref(x) for x in children],'_active':True,'_components':[ref(x) for x in components],'_prefab':None,'_lpos':{'__type__':'cc.Vec3','x':pos[0],'y':pos[1],'z':pos[2]},'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1},'_lscale':{'__type__':'cc.Vec3','x':1,'y':1,'z':1},'_mobility':0,'_layer':layer,'_euler':{'__type__':'cc.Vec3','x':0,'y':0,'z':0},'_id':ident or uuid.uuid4().hex[:22]}
arr=[]
arr.append({'__type__':'cc.SceneAsset','_name':'Entry','_objFlags':0,'__editorExtras__':{},'_native':'','scene':ref(1)})
scene=node('Entry',None,[2,7],[],ident=SCENE)
scene['__type__']='cc.Scene';scene['autoReleaseAssets']=False;scene['_globals']=ref(9)
arr.append(scene)
arr.append(node('Canvas',1,[3],[5,6],layer=33554432,pos=(360,640,0)))
arr.append(node('UICamera',2,[],[4],layer=1073741824,pos=(0,0,1000)))
arr.append({'__type__':'cc.Camera','_name':'','_objFlags':0,'__editorExtras__':{},'node':ref(3),'_enabled':True,'__prefab':None,'_projection':0,'_priority':1,'_fov':45,'_fovAxis':0,'_orthoHeight':1280,'_near':0,'_far':2000,'_color':{'__type__':'cc.Color','r':0,'g':0,'b':0,'a':0},'_depth':1,'_stencil':0,'_clearFlags':6,'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1},'_aperture':19,'_shutter':7,'_iso':0,'_screenScale':1,'_visibility':33554432,'_targetTexture':None,'_postProcess':None,'_usePostProcess':False,'_cameraType':-1,'_trackingType':0,'_id':'f8nyqV7NLF8oeeOSMxYPIS'})
arr.append({'__type__':'cc.UITransform','_name':'','_objFlags':0,'__editorExtras__':{},'node':ref(2),'_enabled':True,'__prefab':None,'_contentSize':{'__type__':'cc.Size','width':720,'height':1280},'_anchorPoint':{'__type__':'cc.Vec2','x':.5,'y':.5},'_id':'a20anJfjAgXlZBaPaN0Eza'})
arr.append({'__type__':'cc.Canvas','_name':'','_objFlags':0,'__editorExtras__':{},'node':ref(2),'_enabled':True,'__prefab':None,'_cameraComponent':ref(4),'_alignCanvasWithScreen':True,'_id':'50LPgw5fgAAWwCknofSKis'})
arr.append(node('Boot',1,[],[8]))
arr.append({'__type__':compressed(BOOT),'_name':'','_objFlags':0,'__editorExtras__':{},'node':ref(7),'_enabled':True,'__prefab':None,'_id':'c3pxlXshYKBgNeI7XeYwca'})
arr.append({'__type__':'cc.SceneGlobals','ambient':ref(10),'shadows':ref(11),'_skybox':ref(12),'fog':ref(13),'octree':ref(14),'skin':ref(15),'lightProbeInfo':ref(16),'postSettings':ref(17),'bakedWithStationaryMainLight':False,'bakedWithHighpLightmap':False})
arr.append({'__type__':'cc.AmbientInfo','_skyColorHDR':{'__type__':'cc.Vec4','x':.19,'y':.16,'z':.25,'w':.52},'_skyColor':{'__type__':'cc.Vec4','x':.19,'y':.16,'z':.25,'w':.52},'_skyIllumHDR':20000,'_skyIllum':20000,'_groundAlbedoHDR':{'__type__':'cc.Vec4','x':.1,'y':.1,'z':.13,'w':0},'_groundAlbedo':{'__type__':'cc.Vec4','x':.1,'y':.1,'z':.13,'w':0},'_skyColorLDR':{'__type__':'cc.Vec4','x':.35,'y':.28,'z':.43,'w':1},'_skyIllumLDR':20000,'_groundAlbedoLDR':{'__type__':'cc.Vec4','x':.2,'y':.2,'z':.2,'w':1}})
arr.append({'__type__':'cc.ShadowsInfo','_enabled':False,'_type':0,'_normal':{'__type__':'cc.Vec3','x':0,'y':1,'z':0},'_distance':0,'_planeBias':1,'_shadowColor':{'__type__':'cc.Color','r':76,'g':76,'b':76,'a':255},'_maxReceived':4,'_size':{'__type__':'cc.Vec2','x':512,'y':512}})
arr.append({'__type__':'cc.SkyboxInfo','_envLightingType':0,'_envmapHDR':None,'_envmap':None,'_envmapLDR':None,'_diffuseMapHDR':None,'_diffuseMapLDR':None,'_enabled':False,'_useHDR':True,'_editableMaterial':None,'_reflectionHDR':None,'_reflectionLDR':None,'_rotationAngle':0})
arr.append({'__type__':'cc.FogInfo','_type':0,'_fogColor':{'__type__':'cc.Color','r':200,'g':200,'b':200,'a':255},'_enabled':False,'_fogDensity':.3,'_fogStart':.5,'_fogEnd':300,'_fogAtten':5,'_fogTop':1.5,'_fogRange':1.2,'_accurate':False})
arr.append({'__type__':'cc.OctreeInfo','_enabled':False,'_minPos':{'__type__':'cc.Vec3','x':-1024,'y':-1024,'z':-1024},'_maxPos':{'__type__':'cc.Vec3','x':1024,'y':1024,'z':1024},'_depth':8})
arr.append({'__type__':'cc.SkinInfo','_enabled':False,'_blurRadius':.01,'_sssIntensity':3})
arr.append({'__type__':'cc.LightProbeInfo','_giScale':1,'_giSamples':1024,'_bounces':2,'_reduceRinging':0,'_showProbe':True,'_showWireframe':True,'_showConvex':False,'_data':None,'_lightProbeSphereVolume':1})
arr.append({'__type__':'cc.PostSettingsInfo','_toneMappingType':0})
assert len(arr)==18
path=ROOT/'assets/scene/Entry.scene';path.write_text(json.dumps(arr,ensure_ascii=False,indent=2)+'\n')
meta={'ver':'1.1.50','importer':'scene','imported':True,'uuid':SCENE,'files':['.json'],'subMetas':{},'userData':{}}
(path.parent/(path.name+'.meta')).write_text(json.dumps(meta,indent=2)+'\n')
for file in (ROOT/'assets/scripts').glob('*.ts'):
 uid= BOOT if file.stem=='Boot' else str(uuid.uuid5(uuid.UUID('e1e350e3-1b3a-4f48-aa01-5d3ce235d11a'),file.stem))
 meta={'ver':'4.0.24','importer':'typescript','imported':True,'uuid':uid,'files':[],'subMetas':{},'userData':{}}
 (file.parent/(file.name+'.meta')).write_text(json.dumps(meta,indent=2)+'\n')
print('Scene class ID:',compressed(BOOT), 'JSON OK / objects:',len(arr))
