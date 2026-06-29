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
  var script=document.createElement('script');
  script.type='module';
  script.textContent=source;
  document.body.appendChild(script);
})().catch(function(error){
  console.error(error);
  document.body.textContent='PortableLM application failed to load: '+error.message;
});
