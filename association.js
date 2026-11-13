(() => {
 const panel=document.getElementById('info-window'), title=document.getElementById('window-title'), content=document.getElementById('window-content'), buttons=[...document.querySelectorAll('[data-window]')], close=panel.querySelector('.close-box');
 let opener=null;
 function dismiss(){panel.hidden=true;buttons.forEach(b=>b.setAttribute('aria-expanded','false'));opener?.focus();}
 buttons.forEach(button=>button.addEventListener('click',()=>{
  if(!panel.hidden&&opener===button){dismiss();return;}
  opener=button;panel.dataset.section=button.dataset.window;title.textContent=button.textContent;content.replaceChildren(document.getElementById(button.dataset.window).content.cloneNode(true));content.scrollTop=0;
  panel.hidden=false;panel.style.left='';panel.style.top='';panel.style.transform='';buttons.forEach(b=>b.setAttribute('aria-expanded',String(b===button)));close.focus();
 }));
 close.addEventListener('click',dismiss);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)dismiss();});
 const bar=panel.querySelector('.title-bar');let drag=null;
 bar.addEventListener('pointerdown',e=>{if(e.target.closest('button')||innerWidth<761)return;const r=panel.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};bar.setPointerCapture(e.pointerId);panel.style.transform='none';panel.style.left=r.left+'px';panel.style.top=r.top+'px';});
 bar.addEventListener('pointermove',e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,e.clientX-drag.x))+'px';panel.style.top=Math.max(42,Math.min(innerHeight-panel.offsetHeight-24,e.clientY-drag.y))+'px';});
 bar.addEventListener('pointerup',()=>drag=null);bar.addEventListener('pointercancel',()=>drag=null);
 const grip=document.getElementById('resize-window');let sizing=null;
 function anchor(){const b=panel.getBoundingClientRect();panel.style.transform='none';panel.style.left=b.left+'px';panel.style.top=b.top+'px';return b;}
 function size(w,h){const b=panel.getBoundingClientRect();panel.style.width=Math.max(Math.min(300,innerWidth-20),Math.min(w,innerWidth-b.left-10))+'px';panel.style.height=Math.max(180,Math.min(h,innerHeight-b.top-38))+'px';}
 grip.addEventListener('pointerdown',e=>{e.preventDefault();const b=anchor();sizing={x:e.clientX,y:e.clientY,w:b.width,h:b.height};grip.setPointerCapture(e.pointerId);});
 grip.addEventListener('pointermove',e=>{if(sizing)size(sizing.w+e.clientX-sizing.x,sizing.h+e.clientY-sizing.y);});
 grip.addEventListener('pointerup',()=>sizing=null);grip.addEventListener('pointercancel',()=>sizing=null);
 grip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const b=anchor();size(b.width+({ArrowLeft:-20,ArrowRight:20}[e.key]||0),b.height+({ArrowUp:-20,ArrowDown:20}[e.key]||0));});
 window.addEventListener('resize',()=>{panel.style.left='';panel.style.top='';panel.style.transform='';panel.style.width='';panel.style.height='';});
})();
