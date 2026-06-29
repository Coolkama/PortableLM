(async function(){
  var base=document.currentScript.src;
  var files=['./app-01.txt','./app-02.txt','./app-03.txt','./app-04.txt','./app-05.txt','./app-06.txt','./app-07.txt','./app-08.txt','./app-09.txt'];
  var parts=[];
  for(var i=0;i<files.length;i++){
    var response=await fetch(new URL(files[i],base));
    if(!response.ok)throw new Error('Failed to load '+files[i]+': '+response.status);
    parts.push(await response.text());
  }
  var script=document.createElement('script');
  script.type='module';
  script.textContent=parts.join('');
  document.body.appendChild(script);
})().catch(function(error){
  console.error(error);
  document.body.textContent='PortableLM application failed to load: '+error.message;
});
