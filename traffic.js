(() => {
'use strict';
const D=window.TINY_ROUTES, canvas=document.getElementById('traffic'),ctx=canvas.getContext('2d'), img=document.getElementById('map'),view=document.getElementById('view');
const W=8404,H=4905, TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let seed=98123;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
let scale=1,tx=0,ty=0,clock=0,last=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,drawRoutes=false;
const enabled={person:true,cycle:true,car:true,bus:true,train:true};
const colors=['#c95243','#426980','#dbd6c3','#73856c','#c8a34d','#454b52'];
function path(points){let lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));return {points,lengths,total:lengths.at(-1)};}
function sample(p,d,offset=0){d=clamp(d,0,p.total);let lo=1,hi=p.lengths.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(p.lengths[mid]<d)lo=mid+1;else hi=mid;}let i=lo;let a=p.points[i-1],b=p.points[i],l=p.lengths[i]-p.lengths[i-1],u=l?(d-p.lengths[i-1])/l:0,dx=(b[0]-a[0])/l,dy=(b[1]-a[1])/l;return {x:a[0]+(b[0]-a[0])*u-dy*offset,y:a[1]+(b[1]-a[1])*u+dx*offset,a:Math.atan2(dy,dx)};}
function nearest(p,point){let best={distance:Infinity,d:0};for(let i=1;i<p.points.length;i++){let a=p.points[i-1],b=p.points[i],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy),0,1),dist=Math.hypot(a[0]+dx*u-point[0],a[1]+dy*u-point[1]);if(dist<best.distance)best={distance:dist,d:p.lengths[i-1]+u*(p.lengths[i]-p.lengths[i-1])};}return best;}
const junctions=[{point:[3200,2110],offset:0},{point:[3680,1870],offset:10},{point:[4480,3150],offset:22}];
function green(phase,j){const t=(clock+j.offset)%46;return phase===0?t<23:t>=26&&t<43;}
const roads=D.roads.map(r=>({...r,path:path(r.points)}));
const actors=[];let nextId=0;
function add(kind,p,opts={}){const dir=opts.dir||1;const a={id:nextId++,kind,p,dir,d:opts.d??rand()*p.total,v:0,max:opts.max??(kind==='person'?4:kind==='cycle'?13:30),lane:opts.lane||0,color:opts.color||colors[Math.floor(rand()*colors.length)],wait:0,stops:[],served:new Set(),...opts};actors.push(a);return a;}
for(const r of roads)for(const dir of [1,-1])for(let n=0;n<Math.ceil(r.count/2);n++)add('car',r.path,{dir,d:(n+.35+rand()*.3)*r.path.total/Math.ceil(r.count/2),max:r.speed*(.8+rand()*.2),lane:r.lane,road:r.id,phase:r.phase});
for(const p of D.paths){const route=path(p.points);for(let n=0;n<7;n++)add('person',route,{dir:n%2?1:-1,lane:2,max:3.2+rand()*1.8});if(p.cycle)for(let n=0;n<4;n++)add('cycle',route,{dir:n%2?1:-1,lane:4,max:11+rand()*5});}
// Bus route segments use the verified corridor, then a separate approach to its terminal.
for(const b of D.buses){const r=roads.find(r=>r.id===b.road);let points=r.points.slice(b.from,b.to+1);
 if(b.number==='32')points=[[3870,2480],[3970,2660],[4000,2720],[4100,2705],[4170,2690],...r.points.slice(7)];
 if(b.number==='34')points=[[3870,2480],[3970,2660],[4000,2720],[3930,2745],[3870,2760],[3930,2850],...r.points.slice(7)];
 if(b.number==='16')points=[[3870,2480],[3970,2660],[4000,2720],[4100,2705],[4170,2690],[4050,2480],[3900,2270],[3790,2120],[3680,1870],...points.slice(1)];
 if(b.number==='39')points=[...r.points.filter(p=>p[1]<2730),[3870,2760],[3930,2745],[4000,2720],[3970,2660],[3870,2480]];
 const route=path(points);for(const dir of [1,-1])add('bus',route,{dir,d:rand()*route.total,max:24,lane:11,number:b.number,road:r.id,phase:r.phase,stops:b.stops.map(v=>v*route.total),terminal:true});}
// Each direction has a pavement-registered lane, including bus approaches.
const laneCache=new Map();
for(const a of actors.filter(a=>a.kind==='car'||a.kind==='bus')){
 const key=JSON.stringify(a.p.points)+'|'+a.dir+'|'+a.lane,pts=window.TINY_LANES[key];
 if(!pts)throw new Error('Missing registered lane');
 if(!laneCache.has(key))laneCache.set(key,path(pts));
 const p=laneCache.get(key),ratio=p.total/a.p.total;
 a.d*=ratio;a.stops=a.stops.map(d=>d*ratio);a.p=p;a.lane=0;
}
const rail=path(D.rail.points);
for(const dir of [1,-1])add('train',rail,{dir,d:dir===1?400:rail.total-300,max:48,lane:D.rail.lane,stops:[nearest(rail,[3600,2240]).d],trainType:'commuter',cars:3});
const orange=path(D.rail.points.slice(0,6));for(const dir of [1,-1])add('train',orange,{dir,d:dir===1?40:orange.total-150,max:36,lane:31,stops:[orange.total-65],trainType:'orange',cars:3});
const atlas=new Map();
function sprite(kind,angle,color,frame=0){const ai=((Math.round(angle/TAU*48)%48)+48)%48,key=[kind,ai,color,frame].join(':');if(atlas.has(key))return atlas.get(key);
 const c=document.createElement('canvas');c.width=128;c.height=112;const q=c.getContext('2d');q.translate(64,66);q.imageSmoothingEnabled=false;const a=ai/48*TAU,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
 const P=(u,v,z=0)=>[Math.round(dx*u+nx*v),Math.round(dy*u+ny*v*.65-z)];
 function poly(pts,fill,stroke){q.beginPath();pts.forEach((p,i)=>i?q.lineTo(...p):q.moveTo(...p));q.closePath();q.fillStyle=fill;q.fill();if(stroke){q.strokeStyle=stroke;q.lineWidth=1;q.stroke();}}
 const line=(pts,col,w=1)=>{q.strokeStyle=col;q.lineWidth=w;q.beginPath();pts.forEach((p,i)=>i?q.lineTo(...p):q.moveTo(...p));q.stroke();};
 q.fillStyle='#18282d35';q.beginPath();q.ellipse(3,2,kind==='person'?4:kind==='cycle'?10:kind==='bus'?24:kind==='train'?37:16,4,0,0,TAU);q.fill();
 if(kind==='person'||kind==='cycle'){
  if(kind==='cycle'){for(const u of [-7,7]){const [x,y]=P(u,0);q.strokeStyle='#293c45';q.lineWidth=2;q.beginPath();q.ellipse(x,y-2,4,4,0,0,TAU);q.stroke();}line([P(-7,0,2),P(0,0,7),P(7,0,2),P(-3,0,2),P(0,0,7)],'#ce7052',1.5);}
  const swing=frame===0?2:-2;line([[-2,-6],[-2+swing,0]],'#263542',2);line([[1,-6],[2-swing,0]],'#263542',2);
  q.fillStyle=color;q.fillRect(-3,-13,6,8);q.fillStyle='#deb58e';q.fillRect(-2,-18,4,5);q.fillStyle=kind==='cycle'?'#e9bd38':'#463b34';q.fillRect(-2,-19,4,2);line([[-3,-11],[-5,-7+swing]],color,2);line([[3,-11],[5,-7-swing]],color,2);
 }else{
  const l=kind==='bus'?27:kind==='train'?40:16,w=kind==='bus'?7:kind==='train'?8:6,h=kind==='car'?8:13;
  const corners=[[-l,-w],[l,-w],[l,w],[-l,w]],base=corners.map(p=>P(...p,2)),top=corners.map(p=>P(...p,h));
  // Draw far faces first so every heading keeps an upright body and roof.
  const sides=[0,1,2,3].sort((i,j)=>(base[i][1]+base[(i+1)%4][1])-(base[j][1]+base[(j+1)%4][1]));
  for(const i of sides){const j=(i+1)%4;poly([base[i],base[j],top[j],top[i]],kind==='bus'?'#d7ad32':kind==='train'?color:color,'#34454b');}
  poly(top,kind==='car'?color:'#eee9d9','#4f5b5d');
  if(kind==='car'){poly([P(-7,-w,h+1),P(7,-w,h+1),P(7,w,h+1),P(-7,w,h+1)],'#abc1c7','#354751');poly([P(-5,-w,h+2),P(4,-w,h+2),P(4,w,h+2),P(-5,w,h+2)],color);}
  else{for(const side of [-1,1])for(let u=-l+5;u<l-3;u+=7)poly([P(u,side*w,6),P(u+5,side*w,6),P(u+5,side*w,11),P(u,side*w,11)],'#263d49');poly([P(-8,-4,h+1),P(7,-4,h+1),P(7,4,h+1),P(-8,4,h+1)],'#b6bbb5');if(kind==='bus'){q.fillStyle='#fff';q.fillRect(-3,-7,6,6);q.fillStyle='#17232a';q.font='bold 5px sans-serif';q.fillText('T',-1.6,-2);}}
  for(const u of [-l*.65,l*.65])for(const v of [-w,w]){const [x,y]=P(u,v,1);q.fillStyle='#263137';q.fillRect(x-2,y-2,4,4);}
  for(const v of [-w+1,w-1]){const [x,y]=P(l,v,5);q.fillStyle='#fff1be';q.fillRect(x-1,y-1,2,2);const [rx,ry]=P(-l,v,5);q.fillStyle='#bd473e';q.fillRect(rx-1,ry-1,2,2);}
 }
 atlas.set(key,c);return c;
}
function position(a,d=a.d){const p=sample(a.p,d,a.lane*a.dir);p.a+=a.dir<0?Math.PI:0;return p;}
const motor=a=>a.kind==='car'||a.kind==='bus';
function body(a,d=a.d){const p=position(a,d);return {...p,y:p.y-4,l:a.kind==='bus'?22:a.road==='walkhill'?10:13,w:a.kind==='bus'?6.5:a.road==='walkhill'?3.4:5.5};}
// Separating-axis collision test includes every direction and every route.
function overlaps(a,b){if(Math.hypot(a.x-b.x,a.y-b.y)>a.l+b.l+20)return false;
 const ua=[Math.cos(a.a),Math.sin(a.a)],va=[-ua[1],ua[0]],ub=[Math.cos(b.a),Math.sin(b.a)],vb=[-ub[1],ub[0]],dx=b.x-a.x,dy=b.y-a.y;
 for(const axis of [ua,va,ub,vb]){const dot=v=>Math.abs(axis[0]*v[0]+axis[1]*v[1]);if(Math.abs(dx*axis[0]+dy*axis[1])>=a.l*dot(ua)+a.w*dot(va)+b.l*dot(ub)+b.w*dot(vb)+2)return false;}
 return true;
}
function clearAt(a,d){const box=body(a,d);return !actors.some(b=>b!==a&&motor(b)&&!b.pending&&overlaps(box,body(b)));}
// Validate initial placements and queue every re-entry until there is space.
for(const a of actors.filter(motor))a.pending=true;
for(const a of actors.filter(motor)){const initial=a.d;for(let n=0;n<Math.ceil(a.p.total/45);n++){a.d=(initial+n*45)%a.p.total;if(junctions.every(j=>{const p=position(a);return Math.hypot(p.x-j.point[0],p.y-j.point[1])>160;})&&clearAt(a,a.d)){a.pending=false;break;}}}
const reservations=new Map();
const crossings=[...junctions,{point:[3970,2740],offset:0}];
function update(dt){
 // Fixed substeps keep the swept collision check valid at every playback speed.
 if(dt>.05){let left=dt;while(left>1e-8){const step=Math.min(left,.05);update(step);left-=step;}return;}
 clock+=dt;
 for(const [j,owner]of reservations){const p=position(owner);if(owner.pending||Math.hypot(p.x-j.point[0],p.y-j.point[1])>130)reservations.delete(j);}
 const snapshot=actors.filter(a=>!a.pending).map(a=>({a,d:a.d,pos:position(a)}));
 for(const a of actors){
  if(a.wait>0){a.wait=Math.max(0,a.wait-dt);a.v=0;continue;}
  if(a.pending){const entry=a.dir===1?0:a.p.total;if(clearAt(a,entry)&&actors.every(b=>b===a||!motor(b)||b.pending||Math.hypot(position(a,entry).x-position(b).x,position(a,entry).y-position(b).y)>90)){a.d=entry;a.pending=false;}else continue;}
  let target=a.max,barrier=Infinity;
  if(motor(a)){
   for(const j of crossings){const n=(a.junctionCache??=new Map()).get(j)||nearest(a.p,j.point);a.junctionCache.set(j,n);const ahead=(n.d-a.d)*a.dir;if(n.distance>90||ahead< -110||ahead>230)continue;
    const owner=reservations.get(j),inZone=ahead<100;
    if(owner&&owner!==a){const crossing=Math.abs(Math.cos(position(owner).a-position(a).a))<.75;if(crossing&&ahead>85)barrier=Math.min(barrier,ahead-85);}
    else if(!owner&&inZone){if(junctions.includes(j)&&ahead>65&&!green(a.phase,j))barrier=Math.min(barrier,ahead-85);else reservations.set(j,a);}
    else if(!owner&&junctions.includes(j)&&ahead>0&&!green(a.phase,j))barrier=Math.min(barrier,ahead-85);
   }
   const pos=position(a);for(const o of snapshot){if(o.a===a||!motor(o.a))continue;
    const dx=o.pos.x-pos.x,dy=o.pos.y-pos.y;
    if(Math.cos(o.pos.a-pos.a)<.8)continue;
    const forward=dx*Math.cos(pos.a)+dy*Math.sin(pos.a),side=Math.abs(-dx*Math.sin(pos.a)+dy*Math.cos(pos.a));
    if(forward>0&&forward<180&&side<12)barrier=Math.min(barrier,forward-(a.kind==='bus'?22:13)-(o.a.kind==='bus'?22:13)-12);
   }
  }
  for(let i=0;i<a.stops.length;i++){const gap=(a.stops[i]-a.d)*a.dir;if(!a.served.has(i)&&gap>=0&&gap<140){barrier=Math.min(barrier,gap);if(gap<2){a.served.add(i);a.wait=a.kind==='train'?14:7;a.v=0;}}}
  if(Number.isFinite(barrier))target=Math.min(target,Math.sqrt(Math.max(0,barrier)*12));
  a.v+=clamp(target-a.v,-20*dt,9*dt);let move=a.v*dt;if(Number.isFinite(barrier))move=Math.min(move,Math.max(0,barrier));
  const next=a.d+a.dir*move;
  if(motor(a)&&!clearAt(a,clamp(next,0,a.p.total))){a.v=0;continue;}
  a.d=next;
  if(a.d<0||a.d>a.p.total){a.d=a.dir===1?0:a.p.total;a.served.clear();a.wait=a.kind==='train'?18:a.kind==='bus'?10:rand()*3;if(motor(a))a.pending=true;}
 }
}
function transform(){img.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;window.updateMapTiles(scale,tx,ty);}
function focus(x,y,s){scale=s;tx=innerWidth/2-x*s;ty=innerHeight/2-y*s;transform();}
let mapZoom=1,panX=0,panY=0;
function fit(){
 // A conservative diamond inside the painted area contains every viewport corner.
 const cx=4400,cy=2490,rx=3400,ry=1750,limit=.94;
 const base=(innerWidth/(2*rx)+innerHeight/(2*ry))/(limit-Math.abs(cy-2850)/ry);
 const s=base*mapZoom,room=Math.max(0,limit-innerWidth/(2*s*rx)-innerHeight/(2*s*ry));
 panX=clamp(panX,-220,220);panY=clamp(panY,-180,180);
 let x=cx+panX,y=cy+panY;
 const cost=Math.abs(x-4400)/rx+Math.abs(y-2850)/ry;
 if(cost>room){const k=room/cost;x=4400+(x-4400)*k;y=2850+(y-2850)*k;}
 focus(x,y,s);
 document.getElementById('map-out').disabled=mapZoom<=1;
 document.getElementById('map-in').disabled=mapZoom>=1.35;
}
document.getElementById('map-in').onclick=()=>{mapZoom=clamp(mapZoom+.1,1,1.35);fit();};
document.getElementById('map-out').onclick=()=>{mapZoom=clamp(mapZoom-.1,1,1.35);fit();};
document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{const dir=b.dataset.pan;panX+=({left:-80,right:80}[dir]||0);panY+=({up:-65,down:65}[dir]||0);fit();});

// Finger dragging uses the same limited pan bounds as the arrow controls.
let drag=null;
view.addEventListener('pointerdown',e=>{
 if(!e.isPrimary)return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY};view.setPointerCapture(e.pointerId);
});
view.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 panX-=(e.clientX-drag.x)/scale;panY-=(e.clientY-drag.y)/scale;
 drag.x=e.clientX;drag.y=e.clientY;fit();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(event,()=>{drag=null;});

function zoom(cx,cy,f){let n=clamp(scale*f,.09,4);tx=cx-(cx-tx)*n/scale;ty=cy-(cy-ty)*n/scale;scale=n;transform();}
function resize(){canvas.width=Math.round(innerWidth*devicePixelRatio);canvas.height=Math.round(innerHeight*devicePixelRatio);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';}
function paint(){const dpr=devicePixelRatio;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);ctx.translate(tx,ty);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 if(drawRoutes){ctx.lineWidth=2/scale;for(const r of laneCache.values()){ctx.strokeStyle='#26d9ed90';ctx.beginPath();r.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}}
 const render=[];for(const a of actors){if(!enabled[a.kind]||a.pending)continue;const count=a.kind==='train'?a.cars:1;for(let i=0;i<count;i++){let d=a.d-a.dir*i*83;if(d<0||d>a.p.total)continue;const p=position(a,d);if(p.x*scale+tx< -90||p.y*scale+ty< -90||p.x*scale+tx>innerWidth+90||p.y*scale+ty>innerHeight+90)continue;render.push({a,p,d});}}
 render.sort((a,b)=>a.p.y-b.p.y);
 for(const {a,p,d}of render){ctx.save();if(a.kind==='train'){/* Clip each cover separately so overlapping covers stay opaque. */for(const poly of D.occlusions){ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(...poly[0]);poly.slice(1).forEach(v=>ctx.lineTo(...v));ctx.closePath();ctx.clip('evenodd');}}
 ctx.globalAlpha=clamp(Math.min(d,a.p.total-d)/50,0,1);const f=(a.kind==='person'||a.kind==='cycle')&&a.v>0?Math.floor(clock*5+a.id)%2:0;
 const s=sprite(a.kind,p.a,a.kind==='train'?(a.trainType==='orange'?'#db802e':'#79549d'):a.color,f);if(a.kind==='car'||a.kind==='bus'){const z=a.road==='walkhill'?.55:.75;ctx.drawImage(s,Math.round(p.x)-64*z,Math.round(p.y)-66*z,128*z,112*z);}else ctx.drawImage(s,Math.round(p.x)-64,Math.round(p.y)-66);
 if(a.kind==='bus'&&scale>.65){ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.fillStyle='#192b35';ctx.fillRect(p.x-9,p.y-28,18,11);ctx.fillStyle='#f8d94a';ctx.fillText(a.number,p.x,p.y-20);}
 ctx.restore();}
}
function frame(t){const dt=Math.min((t-last)/1000,.05);last=t;if(!paused&&!document.hidden)update(dt*speed);paint();requestAnimationFrame(frame);}
window.addEventListener('resize',()=>{resize();fit();});
resize();fit();requestAnimationFrame(frame);
// Deterministic diagnostics for local validation and later route refinement.
window.tinyTraffic={actors,roads,sample,nearest,update,position,body,overlaps,get clock(){return clock;},get paused(){return paused;},get enabled(){return {...enabled};},get atlasSize(){return atlas.size;},focus,paint};
})();
