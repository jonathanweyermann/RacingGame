'use strict';
// Dependency-free WebGL renderer. World coordinates are in metres.
const canvas = document.querySelector('#game');
const gl = canvas.getContext('webgl', {antialias:true});
if (!gl) { document.querySelector('.intro').innerHTML = '<h1>WebGL required</h1><p>Enable hardware acceleration or use a WebGL-capable browser.</p>'; throw new Error('WebGL unavailable'); }
const $ = id => document.getElementById(id);
const vs = `attribute vec3 p;attribute vec3 c;uniform mat4 vp;varying vec3 color;varying float depth;void main(){gl_Position=vp*vec4(p,1.);color=c;depth=gl_Position.w;}`;
const fs = `precision mediump float;varying vec3 color;varying float depth;void main(){float fog=smoothstep(90.,310.,depth);gl_FragColor=vec4(mix(color,vec3(.13,.27,.33),fog),1.);}`;
function shader(type, src) { const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s; }
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const pos=gl.getAttribLocation(program,'p'), col=gl.getAttribLocation(program,'c'), vp=gl.getUniformLocation(program,'vp');
gl.enable(gl.DEPTH_TEST);gl.clearColor(.13,.27,.33,1);
let vertices=[];
function tri(a,b,c,color){for(const v of [a,b,c])vertices.push(...v,...color);}
function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color);}
function box(x,y,z,w,h,d,color,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);const v=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(([a,b,c])=>[x+a*cs+c*sn,y+b,z-a*sn+c*cs]);[[0,1,5,4,.7],[1,2,6,5,.85],[2,3,7,6,.8],[3,0,4,7,.6],[4,5,6,7,1]].forEach(([a,b,c,d,s])=>quad(v[a],v[b],v[c],v[d],color.map(n=>n*s)));}
const RX=105,RZ=165,WIDTH=16,N=240;
function point(t,offset=0,y=.02){const x=RX*Math.sin(t),z=RZ*Math.cos(t);const nx=Math.sin(t)/RX,nz=Math.cos(t)/RZ,l=Math.hypot(nx,nz);return[x+nx/l*offset,y,z+nz/l*offset];}
quad([-1800,-.1,-1800],[-1800,-.1,1800],[1800,-.1,1800],[1800,-.1,-1800],[.075,.19,.17]);
for(let i=0;i<N;i++){let a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2;quad(point(a,-8),point(a,8),point(b,8),point(b,-8),[.16,.21,.23]);for(const side of [-1,1]){quad(point(a,side*8,.04),point(a,side*9,.04),point(b,side*9,.04),point(b,side*8,.04),i%6<3?[.77,.83,.78]:[.8,.24,.22]);quad(point(a,side*7.6,.05),point(a,side*7.75,.05),point(b,side*7.75,.05),point(b,side*7.6,.05),[.83,.86,.74]);}if(i%6<3)quad(point(a,-.09,.04),point(a,.09,.04),point(b,.09,.04),point(b,-.09,.04),[.55,.63,.6]);}
for(let i=0;i<8;i++)for(let j=0;j<2;j++)box(-8+i*2,.06,165-j*1.4,2,.025,1.4,(i+j)%2?[.1,.15,.16]:[.9,.95,.85]);
let seed=83;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<240;i++){const t=random()*Math.PI*2,off=14+random()*120,side=i%3?1:-1;if(side<0&&off>65)continue;const [x,,z]=point(t,side*off);const h=4+random()*9;box(x,0,z,.6,h*.6,.6,[.19,.23,.19]);const green=[.045+random()*.025,.16+random()*.07,.15];for(let j=0;j<3;j++){const y=h*.2+j*h*.2,r=h*(.33-j*.07);const top=[x,y+h*.55,z];tri([x-r,y,z-r],[x+r,y,z-r],top,green);tri([x+r,y,z-r],[x+r,y,z+r],top,green);tri([x+r,y,z+r],[x-r,y,z+r],top,green);tri([x-r,y,z+r],[x-r,y,z-r],top,green);}}
for(let i=0;i<36;i++){const a=i/36*Math.PI*2,r=380+random()*180,x=Math.sin(a)*r,z=Math.cos(a)*r,h=90+random()*150;tri([x-100,0,z],[x+100,0,z],[x,h,z+30],[.12,.23,.27]);tri([x+100,0,z],[x+140,0,z+90],[x,h,z+30],[.09,.19,.23]);}
for(let i=0;i<48;i++){const t=i/48*Math.PI*2;for(const side of [-1,1]){const[x,,z]=point(t,side*10);box(x,0,z,.15,1.2,.15,[.55,.66,.62]);box(x,1,z,.22,.28,.22,[.73,.99,.4]);}}
const staticData=new Float32Array(vertices),worldBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,worldBuffer);gl.bufferData(gl.ARRAY_BUFFER,staticData,gl.STATIC_DRAW);const dynamicBuffer=gl.createBuffer();
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function camera(eye,target,fov){const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);const f=1/Math.tan(fov/2),aspect=canvas.width/canvas.height,n=.1,far=1100;return multiply(new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]),view);}
function draw(buffer,count){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(col);gl.vertexAttribPointer(col,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,count);}
const keys=new Set();let active=false,paused=false,finished=false,x=0,z=165,heading=Math.PI/2,speed=0,nitro=1,time=0,lapTime=0,lap=1,progress=0,lastAngle=0,best=null,cam=[-12,6,165],last=0;
try{best=Number(localStorage.getItem('apex-best'))||null;}catch{}
const format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
function reset(){resetRivals();x=0;z=165;heading=Math.PI/2;speed=0;nitro=1;time=0;lapTime=0;lap=1;progress=0;lastAngle=0;finished=false;cam=[-12,6,165];}
function start(){reset();active=true;paused=false;$('menu')?.classList.add('hidden');$('message').textContent='';$('overlay').classList.add('hidden');$('pause').innerHTML='MENU <kbd>P</kbd>';}
function pause(){if(!active||finished)return;paused=!paused;keys.clear();$('pause').innerHTML='MENU <kbd>P</kbd>';$('message').textContent='';$('menu').classList.toggle('hidden',!paused);}
$('start').onclick=start;$('pause').onclick=pause;
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')start();if(e.code==='Enter'&&(!active||finished))start();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(active&&!paused&&!finished)pause();});
function car(cx,cz,a,color){box(cx,.35,cz,1.9,.55,4,color,a);box(cx,.9,cz-.2*Math.cos(a),1.5,.55,1.75,[.10,.22,.27],a);const cs=Math.cos(a),sn=Math.sin(a);function part(lx,ly,lz,w,h,d,c){box(cx+lx*cs+lz*sn,ly,cz-lx*sn+lz*cs,w,h,d,c,a);}for(const side of [-1,1])for(const end of [-1,1])part(side*.98,.22,end*1.25,.34,.6,.8,[.025,.04,.05]);part(0,.9,-1.7,2.05,.12,.35,[.08,.13,.15]);for(const side of [-1,1]){part(side*.62,.67,1.98,.42,.13,.04,[.85,1,.8]);part(side*.65,.65,-2,.4,.14,.04,[1,.15,.09]);}if(boost)for(const side of [-1,1])part(side*.55,.35,-2.4,.22,.24,.7+random()*.8,[.3,.7,1]);}
let boost=false;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.04);last=now;const scale=Math.min(devicePixelRatio||1,1.7),w=Math.floor(viewW()*scale),h=Math.floor(viewH()*scale);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
boost=false;let offroad=Math.abs((Math.sqrt((x/RX)**2+(z/RZ)**2)-1)*125)>8.5;
if(active&&!paused&&!finished){time+=dt;lapTime+=dt;const throttle=keys.has('ArrowUp')||mobile.gas,brake=keys.has('ArrowDown'),drift=keys.has('Space'),steer=Math.max(-1,Math.min(1,Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight'))+mobile.steer));boost=throttle&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||mobile.nitro)&&nitro>0&&speed>5;if(boost)nitro=Math.max(0,nitro-dt*.24);else nitro=Math.min(1,nitro+dt*.10);speed+=(throttle?(boost?25:16):0)*dt;if(brake)speed-= (speed>0?33:9)*dt;speed-=speed*(offroad?1.5:drift?.8:.17)*dt;speed=Math.max(-12,Math.min(boost?94:67,speed));heading+=steer*Math.min(Math.abs(speed)/15,1)*dt*(drift?2.15:1.15)*Math.sign(speed||1);x+=Math.sin(heading)*speed*dt;z+=Math.cos(heading)*speed*dt;if(Math.hypot(x,z)>650){x=0;z=165;heading=Math.PI/2;speed=0;lastAngle=0;progress=0;}updateRivals(dt);
const angle=Math.atan2(x/RX,z/RZ);let delta=angle-lastAngle;if(delta>Math.PI)delta-=Math.PI*2;if(delta< -Math.PI)delta+=Math.PI*2;lastAngle=angle;if(!offroad)progress+=delta;if(progress>=Math.PI*2){progress-=Math.PI*2;if(!best||lapTime<best){best=lapTime;try{localStorage.setItem('apex-best',String(best));}catch{}}lapTime=0;lap++;if(lap>3){finished=true;speed=0;finishPos=racePosition();$('message').textContent=`P${finishPos} · ${format(time)}`;$('overlay').classList.remove('hidden');document.querySelector('h1').innerHTML='CIRCUIT<br><em>COMPLETE.</em>';document.querySelector('.intro p').textContent=`You finished ${ordinal(finishPos)} of ${rivals.length+1}. Three laps in ${format(time)}. Best lap: ${format(best)}.`;$('start').innerHTML='RACE AGAIN <span>↗</span>';}}}
const desired=[x-Math.sin(heading)*11,5.6+Math.abs(speed)*.018,z-Math.cos(heading)*11];for(let i=0;i<3;i++)cam[i]+=(desired[i]-cam[i])*(1-Math.exp(-dt*7));gl.uniformMatrix4fv(vp,false,camera(cam,[x+Math.sin(heading)*10,1,z+Math.cos(heading)*10],boost?1.22:1.08));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);draw(worldBuffer,staticData.length/6);vertices=[];car(x,z,heading,[.72,.98,.27]);drawRivals();gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);draw(dynamicBuffer,vertices.length/6);
$('speed').textContent=String(Math.round(Math.abs(speed)*3.6)).padStart(3,'0');$('nitro').style.width=`${nitro*100}%`;$('time').textContent=format(time);$('best').textContent=best?format(best):'—';$('pos').innerHTML=`${racePosition()} <small>/ ${rivals.length+1}</small>`;$('lap').innerHTML=`0${Math.min(lap,3)} <small>/ 03</small>`;$('state').textContent=boost?'NITRO ENGAGED':offroad?'OFF TRACK':keys.has('Space')&&Math.abs(speed)>3?'HANDBRAKE':active?'MIDNIGHT CIRCUIT':'READY TO RACE';}
requestAnimationFrame(frame);

// Mobile: hold-to-gas button + gyroscope tilt steering
var mobile={gas:false,steer:0,nitro:false};
(()=>{const touch=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;if(!touch)return;
document.body.classList.add('mobile');
const gas=document.createElement('button');gas.id='gas';gas.textContent='GAS';document.body.appendChild(gas);
const tilt=document.createElement('button');tilt.id='tilt';tilt.textContent='TAP TO ENABLE TILT STEERING';document.body.appendChild(tilt);
const on=e=>{e.preventDefault();mobile.gas=true;gas.classList.add('down');},off=e=>{e.preventDefault();mobile.gas=false;gas.classList.remove('down');};
gas.addEventListener('pointerdown',on);
const nit=document.createElement('button');nit.id='nitrobtn';nit.textContent='NITRO';document.body.appendChild(nit);
const non=e=>{e.preventDefault();mobile.nitro=true;nit.classList.add('down');},noff=e=>{e.preventDefault();mobile.nitro=false;nit.classList.remove('down');};
nit.addEventListener('pointerdown',non);['pointerup','pointercancel','pointerleave'].forEach(t=>nit.addEventListener(t,noff));
['pointerup','pointercancel','pointerleave'].forEach(t=>gas.addEventListener(t,off));
const onTilt=e=>{const ang=lockAngle==null?curAngle():lockAngle;
let v=ang===90?e.beta:ang===-90||ang===270?-e.beta:e.gamma;if(v==null)return;
const dead=3,max=30;v=Math.abs(v)<dead?0:(v-Math.sign(v)*dead)/(max-dead);mobile.steer=-Math.max(-1,Math.min(1,v));};
const enable=async()=>{try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){if(await DeviceOrientationEvent.requestPermission()!=='granted'){tilt.textContent='TILT DENIED - CHECK SETTINGS';return;}}
window.addEventListener('deviceorientation',onTilt);tilt.remove();}catch(err){tilt.textContent='TILT UNAVAILABLE';}};
tilt.addEventListener('click',enable);document.getElementById('start')?.addEventListener('click',()=>{if(document.body.contains(tilt))enable();});
})();

// Keep the game upright: freeze it in the orientation it started in
var lockAngle=null,rotated=false;
function curAngle(){let a=(screen.orientation&&screen.orientation.angle);if(a==null)a=window.orientation||0;return((a%360)+360)%360;}
function viewW(){return rotated?innerHeight:innerWidth;}
function viewH(){return rotated?innerWidth:innerHeight;}
function applyRotLock(){const r=document.documentElement;if(lockAngle==null){r.classList.remove('rotlock');r.style.cssText='';rotated=false;return;}
const d=((curAngle()-lockAngle)%360+360)%360;rotated=d===90||d===270;
if(d===0){r.classList.remove('rotlock');r.style.cssText='';return;}
r.classList.add('rotlock');const w=viewW(),h=viewH();
r.style.width=w+'px';r.style.height=h+'px';r.style.transform='translate(-50%,-50%) rotate('+(-d)+'deg)';}
async function lockOrientation(){if(!document.body.classList.contains('mobile')||lockAngle!=null)return;lockAngle=curAngle();
try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
await screen.orientation.lock(lockAngle===90||lockAngle===270?'landscape':'portrait');}catch(e){/* iOS: CSS counter-rotation below */}
applyRotLock();}
window.addEventListener('orientationchange',()=>setTimeout(applyRotLock,50));
window.addEventListener('resize',applyRotLock);
document.getElementById('start')?.addEventListener('click',lockOrientation);

// Rival cars: follow the track centre-line by parameter t (one lap = 2*PI), each with its own lane, pace and weave
var finishPos=0;
const RIVAL_DEF=[
 {name:'VOLT',color:[.95,.28,.25],pace:60,t0:.09,lane:-3.6},
 {name:'NOVA',color:[.25,.55,.98],pace:58,t0:.09,lane:3.6},
 {name:'RAZE',color:[.98,.72,.18],pace:56,t0:.045,lane:-3.6},
 {name:'HALO',color:[.92,.92,.95],pace:54,t0:.045,lane:3.6},
 {name:'ONYX',color:[.62,.3,.92],pace:57,t0:-.045,lane:-3.6},
 {name:'FURY',color:[.98,.45,.75],pace:55,t0:-.045,lane:3.6}];
var rivals=[];
function resetRivals(){rivals=RIVAL_DEF.map((d,i)=>({...d,t:d.t0,off:d.lane,speed:0,phase:i*1.7,done:false,x:0,z:0,h:Math.PI/2,bump:0}));rivals.forEach(placeRival);}
function placeRival(r){const tt=r.t,[px,,pz]=point(tt,r.off);r.x=px;r.z=pz;r.h=Math.atan2(RX*Math.cos(tt),-RZ*Math.sin(tt));}
function playerTotal(){return (lap-1)*Math.PI*2+progress;}
function racePosition(){const me=finished?Infinity:playerTotal();let p=1;for(const r of rivals){const rt=r.done?r.doneAt:r.t;if(finished){if(r.done&&r.doneTime<time)p++;}else if(rt>me)p++;}return p;}
function ordinal(n){return n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');}
function updateRivals(dt){const me=playerTotal(),LAPS=Math.PI*2*3;
 for(const r of rivals){
  // corners are tightest at the ends of the long axis (sin t ~ 0)
  const corner=.84+.16*Math.sin(r.t)**2;
  // gentle rubber band so the pack stays around the player
  const gap=r.t-me,band=Math.max(.9,Math.min(1.1,1-gap*.12));
  let target=r.pace*corner*band;if(r.done)target=r.pace*.55;
  r.speed+=Math.max(-20*dt,Math.min(14*dt,target-r.speed));
  if(r.bump>0){r.bump-=dt;r.speed*=1-dt*1.5;}
  r.phase+=dt*.35;const wantOff=r.lane+Math.sin(r.phase)*1.6;r.off+=(wantOff-r.off)*Math.min(1,dt*1.2);r.off=Math.max(-6.5,Math.min(6.5,r.off));
  const ds=r.speed*dt,tl=Math.hypot(RX*Math.cos(r.t),RZ*Math.sin(r.t));r.t+=ds/tl;
  if(!r.done&&r.t>=LAPS){r.done=true;r.doneAt=r.t+100;r.doneTime=time;}
  placeRival(r);
  // bump against the player
  const dx=x-r.x,dz=z-r.z,d=Math.hypot(dx,dz);
  if(d<2.6&&d>0.001){const push=(2.6-d)/2,nx=dx/d,nz=dz/d;x+=nx*push;z+=nz*push;
   const side=Math.sign(nx*Math.cos(r.h)-nz*Math.sin(r.h))||1;r.off-=side*push*.6;
   const rel=speed-r.speed;if(Math.abs(rel)>1){speed-=rel*.35;r.speed+=rel*.35;r.bump=.4;}}
 }
 // rivals don't drive through each other
 for(let i=0;i<rivals.length;i++)for(let j=i+1;j<rivals.length;j++){const a=rivals[i],b=rivals[j];const dt2=(a.t-b.t)*RX,dof=a.off-b.off;if(Math.abs(dt2)<4.5&&Math.abs(dof)<2.2){const s=dof>=0?1:-1;a.off+=s*.05;b.off-=s*.05;const back=dt2<0?a:b;back.speed=Math.min(back.speed,(dt2<0?b:a).speed*.98);}}
}
function drawRivals(){for(const r of rivals)car(r.x,r.z,r.h,r.color);}
resetRivals();

// Pause menu: resume / restart / quit to title
(()=>{const m=document.createElement('div');m.id='menu';m.className='hidden';
m.innerHTML='<div class="menu-box"><h2>PAUSED</h2><button data-a="resume">RESUME</button><button data-a="restart">RESTART RACE</button><button data-a="quit">QUIT TO TITLE</button></div>';
document.body.appendChild(m);
m.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
 if(a==='resume')pause();
 else if(a==='restart')start();
 else if(a==='quit'){reset();active=false;paused=false;m.classList.add('hidden');$('message').textContent='';$('overlay').classList.remove('hidden');}});
const pb=$('pause');pb.innerHTML='MENU <kbd>P</kbd>';
})();
