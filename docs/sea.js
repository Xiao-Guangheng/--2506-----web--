/* A bright, coherent curtain of letters with continuously turning red fish. */
(() => {
  'use strict';
  const phrases=['HELLOWORLD','保持好奇探索未知','WUSTCOMPUTERSCIENCE','代码与海自由游动','0123456789','AIAGENT'];
  const school=[
    {phase:.4,speed:.23,y:.25,size:18},
    {phase:1.1,speed:.19,y:.39,size:20},
    {phase:1.65,speed:.23,y:.43,size:15},
    {phase:3.8,speed:.16,y:.57,size:17},
    {phase:5.1,speed:.21,y:.32,size:14}
  ];
  class OCOcean {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.w=0;this.h=0;this.time=0;
      this.pointer={x:-1000,y:-1000};this.particles=[];this.lastTime=null;
      const move=e=>{const r=canvas.getBoundingClientRect();this.pointer.x=e.clientX-r.left;this.pointer.y=e.clientY-r.top;};
      canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',move);
      canvas.addEventListener('pointerleave',()=>{this.pointer.x=-1000;this.pointer.y=-1000;});
      if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>this.resize()).observe(canvas);
      this.resize();
    }
    resize() {
      const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;
      const dpr=Math.min(globalThis.devicePixelRatio||1,2);
      this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.fontSize=this.w<430?9.8:11.4;
      this.mobile=this.h<500;
      const width=this.w*.69,height=this.h*(this.mobile?.76:.70);
      const cols=Math.max(18,Math.round(width/(this.fontSize*1.24)));
      const rows=Math.max(18,Math.round(height/(this.fontSize*1.48)));
      this.particles=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const value=Math.sin(row*78.233+col*12.9898)*43758.5453,seed=value-Math.floor(value);
        const phrase=phrases[(row+Math.floor(col/9))%phrases.length];
        this.particles.push({u:col/(cols-1),v:row/(rows-1),seed,char:phrase[(col+row)%phrase.length],dx:0,dy:0});
      }
      this.draw(this.time);
    }
    fishPosition(f,t) {
      const phase=t*f.speed+f.phase;
      const ax=this.w*.31,ay=this.h*(this.mobile?.047:.045);
      const x=this.w*.45+Math.cos(phase)*ax;
      const y=this.h*f.y+Math.sin(phase)*ay+Math.sin(t*.34+f.phase)*this.h*.007;
      const vx=-Math.sin(phase)*ax*f.speed;
      const vy=Math.cos(phase)*ay*f.speed+Math.cos(t*.34+f.phase)*this.h*.007*.34;
      return {x,y,angle:Math.atan2(vy,vx),speed:Math.hypot(vx,vy)};
    }
    drawFish(f,pos,t) {
      const c=this.ctx,s=f.size*Math.min(1.2,Math.max(.70,this.w/570)),beat=t*11+f.phase;
      const spine=x=>Math.sin(beat-x/s*2.1)*s*.105*Math.max(0,(s-x)/(s*1.9));
      const tailY=spine(-s*.9),fan=Math.sin(beat+1.8)*s*.26;
      c.save();c.translate(pos.x,pos.y);c.rotate(pos.angle);c.globalAlpha=.98;
      // Forked tail flexes from the same travelling wave as the body.
      c.fillStyle='#d91d35';c.beginPath();c.moveTo(-s*.75,tailY);
      c.bezierCurveTo(-s*1.03,tailY-s*.13,-s*1.46,fan-s*.48,-s*1.63,fan-s*.45);
      c.quadraticCurveTo(-s*1.20,fan,-s*1.63,fan+s*.45);
      c.bezierCurveTo(-s*1.37,fan+s*.36,-s*.99,tailY+s*.16,-s*.75,tailY);c.fill();
      c.fillStyle='#ff354b';c.beginPath();
      for(let side=0;side<2;side++)for(let i=0;i<=18;i++){
        const u=side===0?i/18:1-i/18,x=-s*.90+u*s*1.92;
        const radius=Math.pow(Math.sin(Math.PI*u),.78)*s*.34;
        const y=spine(x)+(side===0?-radius:radius);
        if(side===0&&i===0)c.moveTo(x,y);else c.lineTo(x,y);
      }
      c.closePath();c.fill();
      // Small translucent fins, rather than a rigid triangular fish icon.
      c.fillStyle='#ff6b72';c.beginPath();c.moveTo(s*.15,spine(s*.15));
      c.quadraticCurveTo(-s*.06,spine(0)+s*.51,-s*.38,spine(-s*.38)+s*.31);c.closePath();c.fill();
      c.strokeStyle='#ff9a95';c.lineWidth=Math.max(.65,s*.048);c.globalAlpha=.65;
      c.beginPath();c.moveTo(s*.68,spine(s*.68)-s*.09);c.quadraticCurveTo(s*.25,-s*.23,-s*.27,spine(-s*.27)-s*.10);c.stroke();
      c.globalAlpha=.9;c.fillStyle='#7e1527';c.beginPath();c.arc(s*.67,spine(s*.67)-s*.055,Math.max(.7,s*.055),0,Math.PI*2);c.fill();
      c.restore();
    }
    draw(t) {
      const c=this.ctx,w=this.w,h=this.h;if(!w||!h)return;
      const dt=this.lastTime===null?1/60:Math.max(0,Math.min(.05,t-this.lastTime));
      this.lastTime=t;this.time=t;
      c.clearRect(0,0,w,h);
      const fish=school.map(f=>this.fishPosition(f,t));
      c.font=`500 ${this.fontSize}px "Microsoft YaHei", "Noto Sans SC", Consolas, sans-serif`;
      c.textAlign='center';c.textBaseline='middle';
      const relax=1-Math.exp(-dt*8);
      for(const p of this.particles){
        // Neighbouring rows move together: the text reads as one rippling sheet.
        const wave=Math.sin(p.v*10.5+t*.46)*.033+Math.sin(p.v*21-t*.27)*.013;
        const fold=Math.sin(p.u*5.8+p.v*5+t*.25);
        const x=w*(.09+p.u*.69+wave+fold*.017);
        const y=h*(.105+p.v*(this.mobile?.75:.70))+Math.sin(p.u*8.0+p.v*6+t*.34)*7;
        let dx=0,dy=0;
        const ax=x-this.pointer.x,ay=y-this.pointer.y,d=Math.hypot(ax,ay);
        if(d>0&&d<105){const force=(1-d/105)**2*24;dx+=ax/d*force;dy+=ay/d*force;}
        for(const fp of fish){const ax=x-fp.x,ay=y-fp.y,d=Math.hypot(ax,ay);if(d>0&&d<34){const force=(1-d/34)*9;dx+=ax/d*force;dy+=ay/d*force;}}
        p.dx+=(dx-p.dx)*relax;p.dy+=(dy-p.dy)*relax;
        const edge=Math.min(1,(p.u+.04)*8,(1.05-p.u)*7);
        const bottom=this.mobile?1:Math.max(.18,1-Math.max(0,p.v-.65)*2.15);
        c.globalAlpha=(.65+p.seed*.25+Math.sin(p.v*13+t*.7+p.u*4)*.065)*edge*bottom;
        c.fillStyle=p.seed>.65?'#f4fdff':'#c8f2ff';
        c.fillText(p.char,x+p.dx,y+p.dy);
      }
      c.globalAlpha=1;
      school.forEach((f,i)=>this.drawFish(f,fish[i],t));
      for(let i=0;i<18;i++){
        c.globalAlpha=.17;c.fillStyle='#d4faff';
        c.beginPath();c.arc(w*(.08+(i*.113)%.76),h*((i*.091-t*.006+4)%1),i%4===0?1.1:.6,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
    }
  }
  OCOcean.school=school;
  globalThis.OCOcean=OCOcean;
})();
