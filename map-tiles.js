/* Original-resolution, lossless artwork. Fetch only tiles intersecting the viewport. */
(() => {
 const root=document.getElementById('map'), loading=document.getElementById('loading');
 const size=512, width=8404, height=4905, tiles=new Map();
 let visible=[],active=0;
 const queue=[];
 function pump(){
  while(active<4&&queue.length){
   const {tile,key}=queue.shift();active++;
   const finish=()=>{active--;status();pump();};
   tile.onload=finish;
   tile.onerror=()=>{
    if(!tile.dataset.retried){tile.dataset.retried='true';queue.push({tile,key});}
    else tile.dataset.failed='true';
    finish();
   };
   tile.src=`map-tiles/${key}.webp`;
  }
 }
 function status(){
  const failed=visible.some(key=>tiles.get(key).dataset.failed);
  loading.hidden=visible.every(key=>tiles.get(key).complete&&tiles.get(key).naturalWidth);
  loading.textContent=failed?'Some map tiles could not load. Tap here to retry.':'Opening the neighborhood…';
  loading.style.cursor=failed?'pointer':'default';
 }
 loading.onclick=()=>{for(const key of visible){const tile=tiles.get(key);if(tile.dataset.failed){delete tile.dataset.failed;delete tile.dataset.retried;queue.push({tile,key});}}pump();};
 window.updateMapTiles=(scale,tx,ty)=>{
  const left=Math.max(0,Math.floor(-tx/scale/size));
  const top=Math.max(0,Math.floor(-ty/scale/size));
  const right=Math.min(Math.ceil(width/size)-1,Math.floor((innerWidth-tx)/scale/size));
  const bottom=Math.min(Math.ceil(height/size)-1,Math.floor((innerHeight-ty)/scale/size));
  visible=[];
  const missing=[];
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   const key=`${x}-${y}`;visible.push(key);
   if(!tiles.has(key))missing.push({x,y,key});
  }
  missing.sort((a,b)=>Math.hypot(a.x-(left+right)/2,a.y-(top+bottom)/2)-Math.hypot(b.x-(left+right)/2,b.y-(top+bottom)/2));
  for(const {x,y,key} of missing){
   const tile=new Image();tile.alt='';tile.draggable=false;
   tile.width=Math.min(size+1,width-x*size);tile.height=Math.min(size+1,height-y*size);
   tile.style.left=`${x*size}px`;tile.style.top=`${y*size}px`;
   tiles.set(key,tile);root.append(tile);queue.push({tile,key});
  }
  pump();status();
 };
})();
