(async()=>{
  const files=['../site/page-01.txt','../site/page-02.txt','../site/page-03.txt','../site/page-04.txt','../site/page-05.txt'];
  const html=(await Promise.all(files.map(async file=>{
    const response=await fetch(new URL(file,document.currentScript.src));
    if(!response.ok)throw new Error(`${file}: ${response.status}`);
    return response.text();
  }))).join('');
  const parsed=new DOMParser().parseFromString(html,'text/html');
  parsed.querySelectorAll('script').forEach(script=>script.remove());
  document.head.replaceChildren(...[...parsed.head.childNodes].map(node=>document.adoptNode(node)));
  document.body.replaceChildren(...[...parsed.body.childNodes].map(node=>document.adoptNode(node)));
  const scripts=[
    'https://cdn.jsdelivr.net/npm/markdown-it@14.2.0/dist/markdown-it.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js',
    'https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/contrib/mhchem.min.js',
    './assets/app-loader.js',
    './assets/register-service-worker.js'
  ];
  for(const src of scripts){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }
})().catch(error=>{
  console.error(error);
  document.body.textContent='PortableLM failed to load: '+error.message;
});
