(async function(){
  var base=document.currentScript.src;
  var files=['./app-part-00.gz','./app-part-01.gz','./app-part-02.gz','./app-part-03.gz'];
  var chunks=[];
  var total=0;
  for(var i=0;i<files.length;i++){
    var response=await fetch(new URL(files[i],base));
    if(!response.ok)throw new Error('Failed to load '+files[i]+': '+response.status);
    var bytes=new Uint8Array(await response.arrayBuffer());
    chunks.push(bytes);
    total+=bytes.length;
  }
  var compressed=new Uint8Array(total);
  var offset=0;
  for(var j=0;j<chunks.length;j++){
    compressed.set(chunks[j],offset);
    offset+=chunks[j].length;
  }
  if(typeof DecompressionStream!=='function')throw new Error('This browser does not support gzip decompression.');
  var stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  var source=await new Response(stream).text();
  function patch(search,replacement,label){
    if(source.indexOf(search)<0)throw new Error('PortableLM update patch failed: '+label);
    source=source.replace(search,replacement);
  }
  patch("const APP_VERSION = '1.6.4-github-pages';","const APP_VERSION = '1.6.5-github-pages';","version");
  patch("function offlineWllamaConfig(){\n  return {logger:LoggerWithoutDebug,allowOffline:true,cacheManager:new CacheManager([new MemoryStorageBackend()])};\n}","function offlineWllamaConfig(){\n  const config={logger:LoggerWithoutDebug,allowOffline:true};\n  // Opaque local documents need the memory backend. Hosted pages use Wllama's\n  // normal OPFS-backed cache so a second full model copy is not retained.\n  if(isOpaqueLocalDocument())config.cacheManager=new CacheManager([new MemoryStorageBackend()]);\n  return config;\n}","hosted cache");
  patch("  try{await unloadQuiet();await ensureEngine();setProgress(true,5,`Reading ${info.name} · ${formatBytes(info.totalBytes)}…`);\n    await loadModelWithRuntimeFallback(selected,(p)=>setProgress(true,p,`Loading ${Math.round(p)}%`));\n    state.modelLoaded=true;state.modelName=info.name;state.backend='local';setProgress(false);updateStatus();toast(`Local model ready · ${state.runtimeName}`);syncBackendUI();\n  }catch(e){setProgress(false);state.modelLoaded=false;updateStatus();showError(e,'Could not load the GGUF model');}\n","  let stageTimer=0,loadStarted=0,progressSeen=false;\n  try{\n    await unloadQuiet();\n    setProgress(true,3,`Checking ${info.name} · ${formatBytes(info.totalBytes)}…`);\n    for(const file of selected){\n      if(file.size){\n        await file.slice(0,Math.min(65536,file.size)).arrayBuffer();\n        if(file.size>65536)await file.slice(Math.max(0,file.size-65536)).arrayBuffer();\n      }\n    }\n    await ensureEngine();\n    loadStarted=performance.now();\n    const androidCompat=/Android/i.test(navigator.userAgent)&&needsCompatEngine();\n    const phase=androidCompat?'Starting Android compatibility engine':'Starting inference engine';\n    setProgress(true,7,`${phase}…`);\n    stageTimer=setInterval(()=>{\n      if(progressSeen)return;\n      const seconds=Math.max(1,Math.round((performance.now()-loadStarted)/1000));\n      const activity=Math.min(88,7+Math.floor(seconds/2));\n      setProgress(true,activity,`${phase} · ${seconds}s…`);\n    },1000);\n    await loadModelWithRuntimeFallback(selected,(p)=>{\n      progressSeen=true;\n      setProgress(true,Math.max(8,Math.min(96,p)),`Initialising model ${Math.round(p)}%`);\n    });\n    clearInterval(stageTimer);stageTimer=0;\n    setProgress(true,100,'Model ready');\n    await new Promise(resolve=>setTimeout(resolve,120));\n    state.modelLoaded=true;state.modelName=info.name;state.backend='local';setProgress(false);updateStatus();toast(`Local model ready · ${state.runtimeName}`);syncBackendUI();\n  }catch(e){if(stageTimer)clearInterval(stageTimer);setProgress(false);state.modelLoaded=false;updateStatus();showError(e,'Could not load the GGUF model');}\n","local load progress");
  patch("function modelLoadOptions(progress,{forceCpu=false}={}){\n  const canThreads=crossOriginIsolated; const threads=canThreads?Math.max(1,Math.min(+settings.threads||1,navigator.hardwareConcurrency||1)):1;\n  // Some Android browsers expose WebGPU to content:// pages. Honour that capability instead of blocking by protocol.\n","function modelLoadOptions(progress,{forceCpu=false}={}){\n  // Android uses Wllama's compatibility runtime. Keep model initialisation on one\n  // thread there; desktop hosted builds retain multi-threaded CPU inference.\n  const androidCompat=/Android/i.test(navigator.userAgent)&&needsCompatEngine();\n  const canThreads=crossOriginIsolated&&!androidCompat;\n  const threads=canThreads?Math.max(1,Math.min(+settings.threads||1,navigator.hardwareConcurrency||1)):1;\n  // Some Android browsers expose WebGPU to content:// pages. Honour that capability instead of blocking by protocol.\n","Android thread safety");
  patch("$('#threadHint').textContent=crossOriginIsolated?'Multiple threads are available.':'This page is not cross-origin isolated, so CPU inference is limited to one thread.';","$('#threadHint').textContent=(/Android/i.test(navigator.userAgent)&&needsCompatEngine())?'Android compatibility mode uses one CPU thread for reliable local-model loading.':(crossOriginIsolated?'Multiple threads are available.':'This page is not cross-origin isolated, so CPU inference is limited to one thread.');","thread hint");
  var script=document.createElement('script');
  script.type='module';
  script.textContent=source;
  document.body.appendChild(script);
})().catch(function(error){
  console.error(error);
  document.body.textContent='PortableLM application failed to load: '+error.message;
});
