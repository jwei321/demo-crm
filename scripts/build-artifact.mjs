#!/usr/bin/env node
/**
 * Builds a single self-contained HTML preview of the Market & Planning Hub.
 * Inlines the current data/market.json + editorial copy, no external requests,
 * so it can be published as a hosted page (Claude Artifact). Output: the path
 * given as argv[2], default scratchpad/hub.html.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA = JSON.parse(readFileSync(path.join(process.cwd(), "data", "market.json"), "utf8"));

const STATIC = {
  aia: "https://www.aia.com.sg/en/our-products/save-and-invest/aia-funds-information/fund-performance",
  sectorInfo: {
    tech: ["Software, semiconductors and hardware — the index's engine. One-third of the S&P 500 by weight, and the source of most of this cycle's gains via AI capex.", ["Apple", "Microsoft", "NVIDIA"]],
    fin: ["Banks, insurers, payment networks and asset managers. Earnings track interest rates and credit conditions — cuts squeeze margins but boost deal-making.", ["Berkshire", "JPMorgan", "Visa"]],
    health: ["Pharma, biotech, devices and insurers. Demand is defensive — people don't skip medicine in recessions. GLP-1 drugs are the current growth story.", ["Eli Lilly", "UnitedHealth", "J&J"]],
    consd: ["Retail, autos, travel and leisure — the discretionary wallet. First to feel it when consumers tighten, first to rip when confidence returns.", ["Amazon", "Tesla", "Home Depot"]],
    comms: ["Internet platforms, media and telecoms — dominated by the ad duopoly and streaming. Behaves more like tech than telephone lines.", ["Alphabet", "Meta", "Netflix"]],
    indu: ["Aerospace, machinery, transport and defence. The classic economy-tracker — order books here confirm or deny the “soft landing”.", ["GE Aerospace", "Caterpillar", "Uber"]],
    staples: ["Food, beverages and household basics. Demand barely moves with the cycle — the sector you hide in, not the one you get rich in.", ["P&G", "Costco", "Coca-Cola"]],
    energy: ["Oil & gas majors and services. Tracks crude more than the index — a hedge against the inflation shocks that hurt everything else.", ["ExxonMobil", "Chevron", "ConocoPhillips"]],
    util: ["Power and water utilities — bond-like dividend payers, so rate-sensitive. Data-centre electricity demand is the new growth angle.", ["NextEra", "Southern Co", "Duke Energy"]],
    reit: ["Listed property — offices, towers, warehouses, data centres. The most rate-sensitive sector in the index; cuts are its oxygen.", ["Prologis", "American Tower", "Equinix"]],
    mat: ["Chemicals, miners and construction materials. Rides global industrial demand and the commodity cycle — China matters most here.", ["Linde", "Sherwin-Williams", "Freeport"]],
  },
  macroNext: {
    "CPI (YOY)": "Next print mid-Aug — a reading under 2.3% would cement a September cut.",
    "CORE CPI (YOY)": "Watch shelter costs — the last sticky component holding core up.",
    VIX: "Sub-15 rarely lasts a full quarter — hedging is historically cheap here.",
    UNEMPLOYMENT: "Above ~4.4% would start triggering recession-rule chatter.",
    "PMI (MFG)": "Two more months above 50 would confirm the manufacturing turn.",
    "FED FUNDS": "Futures price the next cut in September, another in December.",
    "US GDP (QOQ)": "Q2 advance estimate lands late July — consensus near 2%.",
    "SG CPI (YOY)": "MAS reviews policy in October — cooling CPI gives room to ease.",
  },
  macroSrc: {
    "CPI (YOY)": ["US BLS", "https://www.bls.gov/cpi/"],
    "CORE CPI (YOY)": ["US BLS", "https://www.bls.gov/cpi/"],
    VIX: ["CBOE", "https://www.cboe.com/tradable_products/vix/"],
    UNEMPLOYMENT: ["US BLS", "https://www.bls.gov/news.release/empsit.nr0.htm"],
    "PMI (MFG)": ["ISM", "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/"],
    "FED FUNDS": ["FEDERAL RESERVE", "https://www.federalreserve.gov/monetarypolicy/openmarket.htm"],
    "US GDP (QOQ)": ["US BEA", "https://www.bea.gov/data/gdp/gross-domestic-product"],
    "SG CPI (YOY)": ["SINGSTAT", "https://www.singstat.gov.sg/find-data/search-by-theme/economy/prices-and-price-indices/latest-data"],
  },
  companies: [["NVIDIA","NVDA"],["Apple","AAPL"],["Microsoft","MSFT"],["Alphabet","GOOGL"],["Tesla","TSLA"],["Amazon","AMZN"],["Meta","META"],["DBS Group","D05.SI"],["OCBC","O39.SI"],["UOB","U11.SI"],["Singtel","Z74.SI"],["Sea Limited","SE"],["Grab","GRAB"],["Netflix","NFLX"],["AMD","AMD"],["Intel","INTC"]],
  horizons: [
    { label: "NEXT FEW MONTHS", sentiment: "The setup: rate cuts priced in, VIX under 15, inflation cooling. Markets are risk-on but late-cycle — momentum leads, and complacency is the main risk.", picks: [
      { i: 3, tag: "MOMENTUM", reason: "AI capex is still accelerating and this fund owns the direct beneficiaries — NVIDIA, Microsoft, Broadcom. In an easing, risk-on environment, momentum tends to keep working over short horizons." },
      { i: 0, tag: "RATE-CUT PLAY", reason: "Fed cuts usually soften the dollar and pull capital into Asian equities. The region's banks and chipmakers are the fastest responders over a few months." },
      { i: 9, tag: "DRY POWDER", reason: "A VIX this low signals complacency. Keeping a cash sleeve means you can buy any dip — and money you need within a year shouldn't be fully invested anyway." }],
      risks: ["A hot CPI print that reprices rate cuts away — the fastest route to a correction from here.","A VIX spike from complacent levels: crowded momentum trades unwind hardest.","An earnings miss from the handful of AI leaders that carry the index's concentration."],
      signs: ["Aug and Sep US CPI prints vs the ~2.3% consensus path","The Fed's dot plot at the September meeting","NVIDIA earnings and hyperscaler capex guidance"] },
    { label: "NEXT FEW YEARS", sentiment: "The setup: soft landing intact, rates normalising toward ~3%. Over 2–5 years, valuations and earnings matter more than momentum.", picks: [
      { i: 0, tag: "VALUATION", reason: "Asia ex-Japan trades well below US multiples while earnings keep compounding. As rates settle, that discount has historically narrowed over multi-year stretches." },
      { i: 11, tag: "BALANCED CORE", reason: "With bonds paying real yields again, the 60/40 mix works as designed — equity upside with a cushion for the drawdowns you will inevitably hit across a cycle." },
      { i: 10, tag: "DIVERSIFIED GROWTH", reason: "If the soft landing extends into a new cycle, a globally diversified all-equity portfolio captures it without betting on any single region or theme." }],
      risks: ["Inflation re-accelerating and forcing rates back up — the scenario that hurts stocks and bonds at once.","The recession arriving late — soft landings have been declared before and unwound before.","China property stress spilling into regional banks and Asia-heavy funds."],
      signs: ["US unemployment holding under ~4.5%","The US 10Y settling into a 3.5–4% band","Asian earnings revisions turning decisively positive"] },
    { label: "NEXT DECADE", sentiment: "The setup: over 10+ years, cycles wash out. Secular forces — AI, Asian middle-class growth, ageing demographics — and compounding dominate everything else.", picks: [
      { i: 3, tag: "SECULAR: AI", reason: "Every prior platform shift — PC, internet, mobile — compounded for well over a decade. AI infrastructure and software look earlier in that curve, not later." },
      { i: 6, tag: "DEMOGRAPHICS", reason: "Emerging markets have the working-age population growth and rising consumption. A decade is long enough to ride out the volatility that comes with the trade." },
      { i: 7, tag: "AGEING WORLD", reason: "Healthcare demand is the most predictable line on any 10-year chart — the world gets older every year regardless of what the Fed does." }],
      risks: ["AI monetisation disappointing versus the capex poured in — the dot-com-era lesson.","Geopolitics: Taiwan concentration is the single biggest tail risk inside both tech and Asia funds.","Demographic dividends only pay out with reform — India has delivered; not every market will."],
      signs: ["AI revenue (not just capex) compounding year over year","EM currency stability against the dollar","US healthcare pricing reform — the sector's main policy overhang"] },
  ],
  quiz: [
    { q: "If your investments dropped 15% in a month, you would…", o: [["Sell everything — I could not take more losses",0],["Sell some to feel safer",1],["Hold and wait it out",2],["Buy more while prices are low",3]] },
    { q: "How long before you need most of this money?", o: [["Under 3 years",0],["3–7 years",1],["7–15 years",2],["15+ years",3]] },
    { q: "Your experience with investing is…", o: [["None — deposits only",0],["Some funds or unit trusts",1],["Comfortable with shares and ETFs",2],["Very experienced, incl. volatile assets",3]] },
    { q: "Your income situation is…", o: [["Irregular or uncertain",0],["Stable but tight",1],["Stable with room to save",2],["High and secure",3]] },
    { q: "Which statement fits you best?", o: [["Protecting capital matters most",0],["Steady growth with small dips is fine",1],["Growth matters — I accept swings",2],["Maximum growth — volatility is the price",3]] },
    { q: "A 25% loss on paper would…", o: [["Keep me up at night",0],["Worry me, but I would cope",1],["Not bother me much",2],["Feel like a buying opportunity",3]] },
  ],
  profiles: [
    { max: 4, name: "Conservative", blurb: "You prioritise protecting what you have. Illustrative mixes at this level lean heavily on bonds and cash, trading growth for stability.", alloc: [["Equities",15,"#4D9FFF"],["Bonds",55,"#7A5CFF"],["Cash",25,"#2EE6C8"],["Gold",5,"#F5C558"]] },
    { max: 8, name: "Cautious", blurb: "You want growth but with a firm safety net. A cautious mix keeps meaningful bond exposure while letting equities do some work.", alloc: [["Equities",30,"#4D9FFF"],["Bonds",45,"#7A5CFF"],["Cash",20,"#2EE6C8"],["Gold",5,"#F5C558"]] },
    { max: 12, name: "Balanced", blurb: "You accept moderate swings in exchange for long-term growth. Balanced mixes split risk between equities and defensive assets.", alloc: [["Equities",45,"#4D9FFF"],["Bonds",35,"#7A5CFF"],["Cash",10,"#2EE6C8"],["Gold",10,"#F5C558"]] },
    { max: 15, name: "Growth", blurb: "You are comfortable riding market cycles for higher expected returns. Growth mixes are equity-led with modest ballast.", alloc: [["Equities",65,"#4D9FFF"],["Bonds",20,"#7A5CFF"],["Cash",5,"#2EE6C8"],["Gold",10,"#F5C558"]] },
    { max: 99, name: "Aggressive", blurb: "You seek maximum long-term growth and can stomach large drawdowns. Aggressive mixes are almost fully invested in equities.", alloc: [["Equities",80,"#4D9FFF"],["Bonds",10,"#7A5CFF"],["Cash",5,"#2EE6C8"],["Gold",5,"#F5C558"]] },
  ],
};

const APP = String.raw`
/* ===== data (injected) ===== */
const DATA = __DATA__;
const ST = __STATIC__;
const GREEN="#3EE68F",RED="#FF6A6A",GOLD="#F5C558",ORANGE="#FF8A3C",MUTED="#6B7494",SECON="#8A94B8";
const INSTR=DATA.instruments, SECTORS=DATA.sectors, MACRO=DATA.macro, FUNDS=DATA.funds, FF=DATA.fundFacts;
const TFS=["1W","1M","3M","YTD","1Y"], STFS=["1W","1M","3M","YTD","1Y","5Y","10Y","MAX"];

let S={tf:"YTD",secTf:"YTD",horizon:0,sel:INSTR[0].id,hoverSec:SECTORS[0].id,query:"",co:"NVIDIA",fund:0,
  g:{init:25000,monthly:500,ret:6,yrs:20},inf:{amt:100000,rate:2.5,yrs:20},
  r:{age:35,retAge:62,income:4000,savings:150000},r72:6,quiz:{i:0,score:0,done:false}};

/* ===== helpers ===== */
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function hash(s){let h=0;for(const c of s.toLowerCase())h=(h*31+c.charCodeAt(0))>>>0;return h;}
function rnd(h,i,lo,hi){const x=Math.abs(Math.sin(h*0.0001+i*7.3))%1;return lo+x*(hi-lo);}
function spark(vals,w,h){const mn=Math.min(...vals),mx=Math.max(...vals),rg=mx-mn||1;
  return vals.map((v,i)=>(i?"L":"M")+(i*(w/(vals.length-1))).toFixed(1)+","+(h-2-((v-mn)/rg)*(h-4)).toFixed(1)).join(" ");}
const fmt=v=>"S$"+Math.round(v||0).toLocaleString("en-SG");
const sgn=(v,s)=>(v>=0?"+":"")+v.toFixed(1)+(s??"%");
const chgOf=i=>i.chg[S.tf];
const riskCol=l=>l===2?ORANGE:l===1?GOLD:GREEN;

/* ===== compute ===== */
function candleView(){
  const inst=INSTR.find(i=>i.id===S.sel), d=inst.data, NC=26, cw=620/NC, seed=S.tf.length+S.sel.length, raw=[];
  let pc=50;
  for(let t=0;t<NC;t++){const f=t/(NC-1)*(d.length-1),i0=Math.floor(f),fr=f-i0;
    const close=d[i0]+(d[Math.min(i0+1,d.length-1)]-d[i0])*fr+Math.sin(t*2.1+seed)*1.8;
    const open=pc,hi=Math.max(open,close)+0.8+Math.abs(Math.sin(t*3.3+seed))*1.4,lo=Math.min(open,close)-0.8-Math.abs(Math.cos(t*2.7+seed))*1.4;
    pc=close;raw.push({open,close,hi,lo});}
  const cLo=Math.min(...raw.map(c=>c.lo)),cHi=Math.max(...raw.map(c=>c.hi)),cRng=cHi-cLo||1,cy=v=>288-((v-cLo)/cRng)*276;
  const candles=raw.map((c,t)=>{const up=c.close>=c.open,top=cy(Math.max(c.open,c.close)),bot=cy(Math.min(c.open,c.close));
    return {cx:(t*cw+cw/2).toFixed(1),x:(t*cw+cw*0.22).toFixed(1),w:(cw*0.56).toFixed(1),wy1:cy(c.hi).toFixed(1),wy2:cy(c.lo).toFixed(1),by:top.toFixed(1),bh:Math.max(bot-top,1.5).toFixed(1),color:up?GREEN:RED};});
  const last=raw[raw.length-1].close,pos=Math.max(0,Math.min(1,(last-cLo)/cRng));
  return {candles,pos};
}
function companyView(){
  const q=S.query.trim().toLowerCase();
  const matches=q?ST.companies.filter(([n,t])=>n.toLowerCase().includes(q)||t.toLowerCase().includes(q)).slice(0,5):[];
  const known=ST.companies.find(([n])=>n===S.co),name=S.co,ticker=known?known[1]:name.slice(0,4).toUpperCase();
  const h=hash(name),R=(i,lo,hi)=>rnd(h,i,lo,hi);
  const chg=R(1,-3,14),revC=R(2,-5,25),epsC=R(3,-8,30),revenue=R(4,2,400),eps=R(5,.5,12);
  const scores=[R(6,.45,.95),R(7,.35,.9),R(8,.3,.92),R(9,.35,.88),R(10,.25,.85),R(11,.2,.8)],avg=scores.reduce((a,b)=>a+b)/6;
  const volI=Math.round(R(12,20,80)),volH=Math.round(R(13,15,45)),volR=Math.round(R(14,25,60));
  const CX=150,CY=115,RAD=88,pt=(i,f)=>{const a=-Math.PI/2+i*Math.PI/3;return [(CX+Math.cos(a)*RAD*f).toFixed(1),(CY+Math.sin(a)*RAD*f).toFixed(1)];};
  const ring=f=>[0,1,2,3,4,5].map(i=>pt(i,f).join(",")).join(" ");
  const sg=off=>{const p=[];for(let i=0;i<12;i++)p.push(R(20+off+i,8,30)+i*R(19+off,0,1.2));
    const mn=Math.min(...p),mx=Math.max(...p),rg=mx-mn||1,xy=p.map((v,i)=>[(i*(100/11)).toFixed(1),(32-((v-mn)/rg)*28).toFixed(1)]);
    return {line:xy.map((q,i)=>(i?"L":"M")+q[0]+","+q[1]).join(" "),area:"0,34 "+xy.map(q=>q[0]+","+q[1]).join(" ")+" 100,34"};};
  const s1=sg(0),s2=sg(40),surf=[];
  for(let i=0;i<=20;i++){const x=i/20;surf.push([(x*380).toFixed(1),(14+Math.pow(x-R(15,.3,.7),2)*130+R(16,0,12)).toFixed(1)]);}
  const fmtB=v=>"$"+v.toFixed(v>=10?1:2)+"B";
  return {matches,name,ticker,chgTxt:sgn(chg)+" YTD",chgColor:chg>=0?GREEN:RED,
    revenue:fmtB(revenue),revChg:sgn(revC),revChgColor:revC>=0?GREEN:RED,eps:"$"+eps.toFixed(2),epsChg:sgn(epsC),epsChgColor:epsC>=0?GREEN:RED,
    spark1:s1.line,spark1Area:s1.area,spark2:s2.line,spark2Area:s2.area,
    hexGrid1:ring(1),hexGrid2:ring(.66),hexGrid3:ring(.33),spokes:[0,1,2,3,4,5].map(i=>{const[x,y]=pt(i,1);return{x,y};}),
    radarPts:scores.map((s,i)=>pt(i,s).join(",")).join(" "),radarPts2:ring(.6),
    healthLabel:avg>.7?"Strong":avg>.5?"Stable":"Weak",healthColor:avg>.7?GREEN:avg>.5?GOLD:RED,
    volFlag:volI>55?"⚠ Elevated":"Normal",volFlagColor:volI>55?ORANGE:GREEN,
    volBars:[{name:"Historical (30d)",pct:volH,color:"#2EE6C8"},{name:"Implied (ATM)",pct:volI,color:ORANGE},{name:"Realised",pct:volR,color:"#4D9FFF"}],
    volSurf:surf.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" "),volSurfArea:"0,70 "+surf.map(p=>p[0]+","+p[1]).join(" ")+" 380,70",
    metrics:[{name:"Market Cap",val:"$"+R(23,40,3200).toFixed(0)+"B",color:"#fff"},{name:"Market Share",val:sgn(R(17,2,25)),color:GREEN},
      {name:"P/E Ratio",val:R(18,8,60).toFixed(1),color:"#fff"},{name:"Gross Margin",val:R(24,22,76).toFixed(0)+"%",color:"#fff"},
      {name:"ROE",val:R(25,5,45).toFixed(1)+"%",color:"#fff"},{name:"Debt / Equity",val:R(26,.1,1.8).toFixed(2),color:"#fff"},
      {name:"Dividend Yield",val:R(21,0,5).toFixed(2)+"%",color:"#fff"},{name:"Beta",val:R(22,.5,2.2).toFixed(2),color:"#fff"}]};
}
function fundView(){
  const F=FUNDS[S.fund],DC=2*Math.PI*54;let acc=0;
  const segs=F.alloc.map(([n,pct,col])=>{const len=pct/100*DC,off=-acc/100*DC;acc+=pct;return{color:col,da:len.toFixed(1)+" "+(DC-len).toFixed(1),off:off.toFixed(1)};});
  const maxH=F.holdings[0][1],maxG=F.geo[0][1];
  return {F,segs,legend:F.alloc.map(([n,pct,col])=>({name:n,pct,color:col})),
    holdings:F.holdings.map(([n,p])=>({name:n,pct:p.toFixed(1)+"%",w:(p/maxH*100).toFixed(0)+"%"})),
    geo:F.geo.map(([n,p])=>({name:n,pct:p+"%",w:(p/maxG*100).toFixed(0)+"%"})),
    returns:F.returns.map(([n,v])=>({name:n,val:sgn(v),color:v>=0?GREEN:RED})),
    facts:["INCEPTION","BENCHMARK","ANNUAL FEE","VOLATILITY (3Y)","SHARPE (3Y)","MAX DRAWDOWN"].map((n,i)=>({name:n,val:(FF[F.short]||["—","—","—","—","—","—"])[i]}))};
}
function calc(){const{g,inf,r,r72}=S;const m=g.ret/1200,n=g.yrs*12;
  const fv=m>0?g.init*Math.pow(1+m,n)+g.monthly*((Math.pow(1+m,n)-1)/m):g.init+g.monthly*n;
  const contrib=g.init+g.monthly*n,real=inf.amt/Math.pow(1+inf.rate/100,inf.yrs),yrsTo=Math.max(0,r.retAge-r.age),pot=r.savings*Math.pow(1.05,yrsTo),need=r.income*12*25;
  return {fv,contrib,growth:fv-contrib,real,pot,need,gap:pot-need,dbl:72/r72};}
function growthGeom(){const g=S.g,c=calc(),pts=[];
  for(let y=0;y<=g.yrs;y++){const mm=g.ret/1200,nn=y*12,fvY=mm>0?g.init*Math.pow(1+mm,nn)+g.monthly*((Math.pow(1+mm,nn)-1)/mm):g.init+g.monthly*nn;pts.push({total:fvY,contrib:g.init+g.monthly*nn});}
  const maxV=Math.max(c.fv,1),px=y=>(y/g.yrs*600).toFixed(1),py=v=>(212-v/maxV*195).toFixed(1);
  const tXY=pts.map((p,y)=>px(y)+","+py(p.total)),cXY=pts.map((p,y)=>px(y)+","+py(p.contrib));
  return {tArea:"0,212 "+tXY.join(" ")+" 600,212",tLine:tXY.map((p,i)=>(i?"L":"M")+p).join(" "),cArea:"0,212 "+cXY.join(" ")+" 600,212",cLine:cXY.map((p,i)=>(i?"L":"M")+p).join(" ")};}

/* ===== render helpers ===== */
function tfPills(list,cur,act){return list.map(t=>'<button class="tp'+(cur===t?" sel":"")+'" data-act="'+act+'" data-arg="'+t+'">'+t+'</button>').join("");}

/* ===== sections ===== */
function headerHTML(){
  const nav=["Markets","Sectors","Macro","Analyzer","Funds","Outlook","Tools"].map(n=>'<a class="nv" href="#'+n.toLowerCase()+'">'+n+'</a>').join("");
  return '<header class="hd"><a class="brand" href="#markets"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="11" stroke="'+GOLD+'" stroke-width="1.5"/><circle cx="13" cy="13" r="4.5" fill="'+GOLD+'"/><circle cx="21" cy="7" r="2" fill="'+GOLD+'" opacity=".6"/></svg><span>Market &amp; Planning Hub</span></a>'
    +'<nav class="nav">'+nav+'</nav>'
    +'<a class="aia" target="_blank" rel="noopener" href="'+ST.aia+'">AIA Fund Prices <span style="font-size:10px">↗</span></a>'
    +'<span class="stamp">'+esc(DATA.meta.stamp)+'</span></header>';
}
function tapeHTML(){
  const one=INSTR.map(i=>{const c=chgOf(i);return '<span class="tpi"><span style="color:'+SECON+';font-weight:600">'+esc(i.name)+'</span><span style="color:#E8ECF6">'+i.val+'</span><span style="color:'+(c>=0?GREEN:RED)+';font-weight:600">'+(c>=0?"+":"")+c.toFixed(2)+'%</span></span>';}).join("");
  return '<div class="tape"><div class="taperow">'+one+one+'</div></div>';
}
function marketsHTML(){
  const inst=INSTR.find(i=>i.id===S.sel),cv=candleView();
  const watch=INSTR.map(i=>{const c=chgOf(i),sel=i.id===S.sel,full=i.full.length>20?i.full.slice(0,19)+"…":i.full;
    return '<button class="wl'+(sel?" sel":"")+'" data-act="sel" data-arg="'+i.id+'"><span class="wlL"><span class="mono" style="font-size:12px;font-weight:600;color:#fff">'+esc(i.name)+'</span><span style="font-size:10px;color:'+MUTED+'">'+esc(full)+'</span></span><span class="wlR"><span class="mono" style="font-size:12px;font-weight:600;color:#E8ECF6">'+i.val+'</span><span class="mono" style="font-size:10.5px;font-weight:600;color:'+(c>=0?GREEN:RED)+'">'+(c>=0?"+":"")+c.toFixed(2)+'%</span></span></button>';}).join("");
  const grid=["0,75","0,150","0,225"].map(y=>{const yy=y.split(",")[1];return '<line x1="0" y1="'+yy+'" x2="620" y2="'+yy+'" stroke="rgba(255,255,255,.06)"/>';}).join("");
  const cands=cv.candles.map(c=>'<g><line x1="'+c.cx+'" y1="'+c.wy1+'" x2="'+c.cx+'" y2="'+c.wy2+'" stroke="'+c.color+'" stroke-width="1.4"/><rect x="'+c.x+'" y="'+c.by+'" width="'+c.w+'" height="'+c.bh+'" rx="1.5" fill="'+c.color+'"/></g>').join("");
  const y1=inst.chg["1Y"],ytd=inst.chg["YTD"],sp=spark(inst.data,100,28);
  const stat=(lb,v)=>'<div class="cell"><div class="mono" style="font-size:9.5px;color:'+MUTED+'">'+lb+'</div><div class="mono" style="font-size:16px;font-weight:600;color:'+(v>=0?GREEN:RED)+'">'+(v>=0?"+":"")+v.toFixed(1)+'%</div><svg width="100%" height="22" viewBox="0 0 100 28" preserveAspectRatio="none"><path d="'+sp+'" fill="none" stroke="'+(v>=0?GREEN:RED)+'" stroke-width="1.8"/></svg></div>';
  const vols=[["Historical",28,"#5E7CE2"],["Implied",68,GOLD],["Realised",42,"#4D9FFF"]].map(([n,p,c])=>'<div><div class="mono barlab"><span>'+n+'</span><span style="color:#fff;font-weight:600">'+p+'%</span></div><div class="bar"><div style="width:'+p+'%;background:'+c+';box-shadow:0 0 8px '+c+'"></div></div></div>').join("");
  const c0=chgOf(inst);
  return '<section id="markets" class="sec"><div class="mktgrid">'
    +'<div class="wlwrap"><div class="lbl" style="padding:4px 10px 8px">WATCHLIST</div>'+watch+'</div>'
    +'<div class="chartwrap"><div class="chead"><div class="mono" style="font-size:15px;font-weight:600;color:#fff">'+esc(inst.name)+'</div><div class="mono" style="font-size:32px;font-weight:600;color:#fff">'+inst.val+'</div><div class="mono" style="font-size:16px;font-weight:600;color:'+(c0>=0?GREEN:RED)+'">'+(c0>=0?"+":"")+c0.toFixed(1)+'% · '+S.tf+'</div><div class="pillbox">'+tfPills(TFS,S.tf,"tf")+'</div></div>'
    +'<svg width="100%" height="300" viewBox="0 0 620 300" preserveAspectRatio="none" style="display:block;margin-top:12px">'+grid+cands+'</svg></div>'
    +'<div class="railwrap"><div class="lbl">PERFORMANCE</div><div class="cellgrid">'+stat("1Y",y1)+stat("YTD",ytd)+'</div>'
    +'<div class="lbl" style="margin-top:4px">VOLATILITY</div>'+vols
    +'<div class="cell" style="margin-top:auto"><div class="mono" style="font-size:9.5px;color:'+MUTED+'">RANGE · '+S.tf+'</div><div class="mono barlab" style="margin:6px 0 4px"><span>LOW</span><span>HIGH</span></div><div class="rangebar"><div class="rangedot" style="left:'+(cv.pos*100).toFixed(0)+'%"></div></div></div>'
    +'</div></div></section>';
}
function sectorsHTML(){
  const secSel=SECTORS.find(s=>s.id===S.hoverSec)||SECTORS[0],secChg=secSel.chg[S.secTf];
  const SC1=["#8FF0C2","#25B577"],SC2=["#FFA3A3","#FF5A5A"];
  const orbs=SECTORS.map((s,i)=>{const c=s.chg[S.secTf],up=c>=0,size=Math.round(34+Math.sqrt(s.w)*23),[c2,c1]=up?SC1:SC2;
    const glowA=.3+Math.min(Math.abs(c),12)/12*.45,selO=S.hoverSec===s.id;
    const bg="radial-gradient(circle at 34% 30%, "+c2+", "+c1+" 55%, rgba(10,14,26,.6) 97%)";
    const glow="0 0 "+Math.round(size/3)+"px "+c1+Math.round(glowA*255).toString(16).padStart(2,"0")+", 0 0 "+Math.round(size*.8)+"px "+c1+"38";
    const anim="mhd"+((i%3)+1)+" "+(8+i*1.1)+"s ease-in-out infinite";
    return '<div class="orbpos" style="left:'+s.x+'%;top:'+s.y+'%;width:'+size+'px;height:'+size+'px;margin-left:'+(-size/2)+'px;margin-top:'+(-size/2)+'px"><div style="width:100%;height:100%;animation:'+anim+'"><div class="orb" tabindex="0" data-act="sec" data-arg="'+s.id+'" style="background:'+bg+';box-shadow:'+glow+';border:1.5px solid '+(selO?GOLD:"transparent")+'"><span class="mono" style="font-size:'+Math.max(8,size/10)+'px;font-weight:600;color:rgba(255,255,255,.95);letter-spacing:.05em;text-shadow:0 1px 6px rgba(0,0,0,.6)">'+s.label+'</span><span class="mono" style="font-size:'+Math.max(9,size/8.5)+'px;font-weight:600;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7)">'+(up?"+":"")+(Math.abs(c)>=100?c.toFixed(0):c.toFixed(1))+'%</span></div></div></div>';}).join("");
  const info=ST.sectorInfo[secSel.id]||["",[]];
  const tops=info[1].map(n=>'<span class="topname mono">'+esc(n)+'</span>').join("");
  const rets=STFS.map(t=>{const v=secSel.chg[t];return '<div class="cell"><div class="mono" style="font-size:9px;color:'+MUTED+';letter-spacing:.1em">'+t+'</div><div class="mono" style="font-size:12.5px;font-weight:600;color:'+(v>=0?GREEN:RED)+'">'+(v>=0?"+":"")+(Math.abs(v)>=100?v.toFixed(0):v.toFixed(1))+'%</div></div>';}).join("");
  return '<section id="sectors" class="sec"><div class="wrap twocol" style="align-items:center">'
    +'<div><h2>S&amp;P 500, by sector.</h2><p class="lead">Each orb is a sector of the index — size reflects its weight, colour and glow track its move over the selected period. Hover or tap to explore.</p>'
    +'<div class="pillbox2">'+tfPills(STFS,S.secTf,"sectf")+'</div>'
    +'<div class="secdetail"><div class="mono" style="font-size:10.5px;color:'+MUTED+';letter-spacing:.14em">SELECTED SECTOR · '+S.secTf+'</div>'
    +'<div class="secline"><div class="mono" style="font-size:clamp(24px,2.6vw,32px);font-weight:600;color:#fff">'+esc(secSel.name)+'</div><div class="mono" style="font-size:18px;font-weight:600;color:'+(secChg>=0?GREEN:RED)+'">'+(secChg>=0?"+":"")+secChg.toFixed(1)+'%</div><div class="mono" style="font-size:12px;color:'+MUTED+'">'+secSel.w+'% of index</div></div>'
    +'<p class="secdesc">'+esc(info[0])+'</p><div class="topwrap"><span class="mono" style="font-size:9.5px;color:'+MUTED+';letter-spacing:.14em">TOP NAMES</span>'+tops+'</div>'
    +'<div class="retgrid">'+rets+'</div></div></div>'
    +'<div class="orbfield"><div class="ring1"></div><div class="ring2"></div>'+orbs+'</div>'
    +'</div></section>';
}
function ladderHTML(){
  const maxAbs=Math.max(...INSTR.map(i=>Math.abs(chgOf(i))),0.1);
  const rows=[...INSTR].sort((a,b)=>chgOf(b)-chgOf(a)).map(i=>{const c=chgOf(i),w=Math.abs(c)/maxAbs*48,sel=i.id===S.sel;
    const col=sel?GOLD:c>=0?GREEN:RED;
    return '<button class="lrow" data-act="sel" data-arg="'+i.id+'" style="background:'+(sel?"rgba(245,197,88,.07)":"rgba(255,255,255,.02)")+';border-color:'+(sel?"rgba(245,197,88,.45)":"rgba(255,255,255,.07)")+'"><span class="mono" style="font-size:11.5px;font-weight:600;color:#E8ECF6;letter-spacing:.04em">'+esc(i.name)+'</span><span class="lbarwrap"><span class="lbaraxis"></span><span class="lbar" style="left:'+(c>=0?"50%":(50-w)+"%")+';width:'+w+'%;background:'+col+';box-shadow:0 0 10px '+col+'66"></span></span><span class="mono" style="font-size:12.5px;font-weight:600;color:'+(c>=0?GREEN:RED)+';text-align:right">'+(c>=0?"+":"")+c.toFixed(1)+'%</span></button>';}).join("");
  return '<section class="sec"><div class="wrap"><div class="h2row"><h2 style="font-size:clamp(22px,2.6vw,30px)">Asset classes, ranked</h2><span class="mono" style="font-size:12.5px;color:'+MUTED+'">'+S.tf+' · CLICK A ROW TO LOAD IT IN THE CHART ABOVE</span></div><div class="ladder">'+rows+'</div></div></section>';
}
function macroHTML(){
  const cards=MACRO.map(m=>{const src=ST.macroSrc[m.name]||["—","#"],col=m.good?GREEN:ORANGE,sc=m.good?"#2EE6C8":ORANGE;
    return '<a class="mcard" target="_blank" rel="noopener" href="'+src[1]+'"><div class="mcardtop"><span class="mono" style="font-size:10.5px;color:'+MUTED+';letter-spacing:.12em">'+esc(m.name)+'</span><span class="flag mono" style="color:'+col+';border-color:'+col+'55">'+m.flag+'</span></div>'
    +'<div class="mval"><span class="mono" style="font-size:27px;font-weight:600;color:#fff">'+m.val+'</span><span class="mono" style="font-size:12px;font-weight:600;color:'+col+'">'+esc(m.chgTxt)+'</span></div>'
    +'<svg width="100%" height="26" viewBox="0 0 100 28" preserveAspectRatio="none"><path d="'+spark(m.spark,100,28)+'" fill="none" stroke="'+sc+'" stroke-width="1.7" style="filter:drop-shadow(0 0 4px '+sc+')"/></svg>'
    +'<div class="mnote">'+esc(m.note)+'</div><div class="mnext">▸ '+esc(ST.macroNext[m.name]||"")+'</div>'
    +'<div class="mfoot"><span class="mono" style="font-size:9.5px;color:'+MUTED+';letter-spacing:.08em">SOURCE: '+src[0]+'</span><span class="mono" style="font-size:9.5px;color:'+GOLD+';font-weight:600">READ ↗</span></div></a>';}).join("");
  return '<section id="macro" class="sec"><div class="wrap"><h2>The numbers that matter</h2><p class="lead" style="max-width:560px">The handful of macro readings that drive most market headlines — and what each one means in plain English.</p><div class="macrogrid">'+cards+'</div><div class="disc">Readings refresh weekly from official sources where available; some values are indicative. Click a card to open the official source.</div></div></section>';
}
function analyzerHTML(){
  const c=companyView();
  const sug=c.matches.length?'<div class="sugbox" id="mh-sugbox">'+c.matches.map(([n,t])=>'<button class="sug" data-act="co" data-arg="'+esc(n)+'"><span style="font-size:13.5px;color:#fff;font-weight:600">'+esc(n)+'</span><span class="mono" style="font-size:11px;color:'+MUTED+'">'+t+'</span></button>').join("")+'</div>':'<div id="mh-sugbox"></div>';
  const chips=ST.companies.slice(0,6).map(([n])=>{const a=n===S.co;return '<button class="chip'+(a?" sel":"")+'" data-act="co" data-arg="'+esc(n)+'">'+esc(n)+'</button>';}).join("");
  const spokes=c.spokes.map(sp=>'<line x1="150" y1="115" x2="'+sp.x+'" y2="'+sp.y+'" stroke="rgba(255,255,255,.07)" stroke-width="1"/>').join("");
  const labels=[["150","16","middle","Past Performance"],["242","74","start","Future Outlook"],["242","166","start","Value"],["150","222","middle","Dividends"],["58","166","end","Profitability"],["58","74","end","Growth"]].map(l=>'<text x="'+l[0]+'" y="'+l[1]+'" fill="'+SECON+'" font-size="10.5" text-anchor="'+l[2]+'">'+l[3]+'</text>').join("");
  const stats=[["REV GROWTH",c.revChg,c.revChgColor,c.revenue,c.spark1,c.spark1Area],["EPS (TTM)",c.epsChg,c.epsChgColor,c.eps,c.spark2,c.spark2Area]].map(x=>'<div class="cell2"><div class="mono" style="display:flex;justify-content:space-between;font-size:10.5px"><span style="color:'+MUTED+'">'+x[0]+'</span><span style="color:'+x[2]+';font-weight:600">'+x[1]+'</span></div><div class="mono" style="font-size:21px;font-weight:600;color:#fff;margin:4px 0 6px">'+x[3]+'</div><svg width="100%" height="34" viewBox="0 0 100 34" preserveAspectRatio="none"><polygon points="'+x[5]+'" fill="'+GREEN+'" fill-opacity=".15"/><path d="'+x[4]+'" fill="none" stroke="'+GREEN+'" stroke-width="1.6"/></svg></div>').join("");
  const volbars=c.volBars.map(v=>'<div><div class="barlab" style="font-size:11.5px;color:#B9C2DC"><span>'+v.name+'</span><span class="mono" style="color:#fff;font-weight:600">'+v.pct+'%</span></div><div class="bar"><div style="width:'+v.pct+'%;background:'+v.color+';box-shadow:0 0 8px '+v.color+'"></div></div></div>').join("");
  const mets=c.metrics.map(m=>'<div class="metrow"><span style="color:#B9C2DC">'+m.name+'</span><span class="mono" style="color:'+m.color+';font-weight:600">'+m.val+'</span></div>').join("");
  return '<section id="analyzer" class="sec"><div class="wrap twocol" style="align-items:start">'
    +'<div><h2>Company analyzer</h2><p class="lead">Search a company to generate its snapshot — performance, health radar, volatility and key metrics. Try “Apple”, “DBS” or “Nvidia”.</p>'
    +'<div class="searchwrap"><div class="searchbox"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.6" stroke="'+MUTED+'" stroke-width="1.4"/><line x1="9.6" y1="9.6" x2="13" y2="13" stroke="'+MUTED+'" stroke-width="1.4" stroke-linecap="round"/></svg><input id="mh-search" placeholder="Search a company…" value="'+esc(S.query)+'"/></div>'+sug+'</div>'
    +'<div class="chips">'+chips+'</div>'
    +'<div class="panel radar"><div class="radartop"><div style="font-size:12.5px;font-weight:600;color:#E8ECF6">Company Health</div><div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:'+c.healthColor+';font-weight:600"><span style="width:6px;height:6px;border-radius:50%;background:'+c.healthColor+';box-shadow:0 0 8px '+c.healthColor+'"></span>'+c.healthLabel+'</div></div>'
    +'<div style="display:flex;justify-content:center"><svg width="300" height="230" viewBox="0 0 300 230"><polygon points="'+c.hexGrid1+'" fill="none" stroke="rgba(255,255,255,.12)"/><polygon points="'+c.hexGrid2+'" fill="none" stroke="rgba(255,255,255,.09)"/><polygon points="'+c.hexGrid3+'" fill="none" stroke="rgba(255,255,255,.06)"/>'+spokes+'<polygon points="'+c.radarPts+'" fill="rgba(245,197,88,.14)" stroke="'+GOLD+'" stroke-width="1.8" style="filter:drop-shadow(0 0 6px rgba(245,197,88,.5))"/><polygon points="'+c.radarPts2+'" fill="none" stroke="#2EE6C8" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7"/>'+labels+'</svg></div></div></div>'
    +'<div class="panel bigcard"><div class="cohead"><div style="font-size:20px;font-weight:700;color:#fff">'+esc(c.name)+'</div><div class="mono" style="font-size:11px;color:'+MUTED+'">'+c.ticker+'</div><div class="mono" style="font-size:13px;font-weight:600;color:'+c.chgColor+';margin-left:auto">'+c.chgTxt+'</div></div>'
    +'<div class="cellgrid">'+stats+'</div>'
    +'<div class="subhead" style="justify-content:space-between;display:flex"><div>Volatility Index</div><div style="font-size:11.5px;color:'+c.volFlagColor+'">'+c.volFlag+'</div></div>'
    +'<div class="cell2" style="display:flex;flex-direction:column;gap:11px">'+volbars+'<div style="font-size:11px;color:'+MUTED+'">Implied Vol Surface</div><svg width="100%" height="70" viewBox="0 0 380 70" preserveAspectRatio="none"><polygon points="'+c.volSurfArea+'" fill="'+ORANGE+'" fill-opacity=".35"/><path d="'+c.volSurf+'" fill="none" stroke="'+ORANGE+'" stroke-width="1.8" style="filter:drop-shadow(0 0 5px rgba(255,138,60,.6))"/></svg></div>'
    +'<div class="subhead">Market Metrics</div><div class="cell2" style="padding:0;overflow:hidden">'+mets+'</div>'
    +'<div class="disc">Illustrative, generated figures — not real company data or a recommendation.</div></div>'
    +'</div></section>';
}
function fundsHTML(){
  const v=fundView(),F=v.F;
  const chips=FUNDS.map((f,i)=>'<button class="chip'+(i===S.fund?" sel":"")+'" data-act="fund" data-arg="'+i+'">'+esc(f.short)+'</button>').join("");
  const segs=v.segs.map(s=>'<circle cx="70" cy="70" r="54" fill="none" stroke="'+s.color+'" stroke-width="17" stroke-dasharray="'+s.da+'" stroke-dashoffset="'+s.off+'" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 4px '+s.color+')"/>').join("");
  const legend=v.legend.map(l=>'<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#C7D0E8"><span style="width:10px;height:10px;border-radius:3px;background:'+l.color+';box-shadow:0 0 6px '+l.color+'"></span>'+l.name+' <span class="mono" style="color:#fff;font-weight:600">'+l.pct+'%</span></div>').join("");
  const hold=v.holdings.map(h=>'<div><div class="barlab" style="font-size:11.5px;color:#B9C2DC"><span>'+esc(h.name)+'</span><span class="mono" style="color:#fff;font-weight:600">'+h.pct+'</span></div><div class="bar"><div style="width:'+h.w+';background:'+GOLD+';box-shadow:0 0 8px rgba(245,197,88,.5)"></div></div></div>').join("");
  const geo=v.geo.map(g=>'<div><div class="barlab" style="font-size:11.5px;color:#B9C2DC"><span>'+esc(g.name)+'</span><span class="mono" style="color:#fff;font-weight:600">'+g.pct+'</span></div><div class="bar"><div style="width:'+g.w+';background:#4D9FFF;box-shadow:0 0 8px rgba(77,159,255,.5)"></div></div></div>').join("");
  const rets=v.returns.map(r=>'<div class="metrow"><span style="color:#B9C2DC">'+r.name+'</span><span class="mono" style="color:'+r.color+';font-weight:600">'+r.val+'</span></div>').join("");
  const facts=v.facts.map(f=>'<div class="cell"><div class="mono" style="font-size:8.5px;color:'+MUTED+';letter-spacing:.1em">'+f.name+'</div><div class="mono factval">'+f.val+'</div></div>').join("");
  return '<section id="funds" class="sec"><div class="wrap twocol" style="align-items:start">'
    +'<div><div class="eyebrow mono">AIA ILP FUNDS</div><h2 style="margin-top:8px">Fund analyzer</h2><p class="lead">Pick a fund to see what it actually invests in — the asset mix, top holdings, and where in the world your money sits.</p><div class="chips">'+chips+'</div>'
    +'<div class="panel" style="max-width:420px;margin-top:20px"><div style="font-size:12.5px;font-weight:600;color:#E8ECF6;margin-bottom:8px">Asset Allocation</div><div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;justify-content:center"><svg width="150" height="150" viewBox="0 0 140 140">'+segs+'</svg><div style="display:flex;flex-direction:column;gap:7px">'+legend+'</div></div></div>'
    +'<a class="fundlink" target="_blank" rel="noopener" href="'+ST.aia+'">Live prices &amp; factsheets on aia.com.sg <span style="font-size:11px">↗</span></a></div>'
    +'<div class="panel bigcard"><div class="cohead"><div style="font-size:19px;font-weight:700;color:#fff">'+esc(F.name)+'</div><span class="flag mono" style="color:'+riskCol(F.lvl)+';border-color:'+riskCol(F.lvl)+'55">'+F.risk+'</span><div class="mono" style="font-size:13px;font-weight:600;color:'+(F.ytd>=0?GREEN:RED)+';margin-left:auto">'+sgn(F.ytd)+' YTD</div></div>'
    +'<p style="margin:0 0 14px;font-size:12.5px;color:'+SECON+';line-height:1.55">'+esc(F.about)+'</p>'
    +'<div class="cellgrid"><div class="cell2"><div class="mono" style="font-size:10.5px;color:'+MUTED+'">BID PRICE</div><div class="mono" style="font-size:21px;font-weight:600;color:#fff;margin-top:4px">'+F.nav+'</div></div><div class="cell2"><div class="mono" style="font-size:10.5px;color:'+MUTED+'">FUND SIZE</div><div class="mono" style="font-size:21px;font-weight:600;color:#fff;margin-top:4px">'+F.size+'</div></div></div>'
    +'<div class="subhead">Top Holdings</div><div class="cell2" style="display:flex;flex-direction:column;gap:10px">'+hold+'</div>'
    +'<div class="subhead">Where it&#39;s invested</div><div class="cell2" style="display:flex;flex-direction:column;gap:10px">'+geo+'</div>'
    +'<div class="subhead">Returns</div><div class="cell2" style="padding:0;overflow:hidden">'+rets+'</div>'
    +'<div class="subhead">Fund Facts</div><div class="factgrid">'+facts+'</div>'
    +'<div class="subhead">Manager&#39;s take</div><div class="mtake">'+esc(F.commentary)+'</div>'
    +'<div class="disc">Real AIA fund names; composition, commentary and figures are illustrative. Check the official <a target="_blank" rel="noopener" href="'+ST.aia+'">AIA fund prices &amp; factsheets</a> for actual data.</div></div>'
    +'</div></section>';
}
function outlookHTML(){
  const H=ST.horizons[S.horizon];
  const tabs=ST.horizons.map((h,i)=>'<button class="otab'+(i===S.horizon?" sel":"")+'" data-act="hz" data-arg="'+i+'">'+h.label+'</button>').join("");
  const picks=H.picks.map((p,n)=>{const F=FUNDS[p.i];return '<div class="pick"><div class="pickhd"><span class="mono" style="font-size:22px;font-weight:700;color:rgba(245,197,88,.55)">0'+(n+1)+'</span><span class="mono" style="font-size:10px;font-weight:600;color:'+GOLD+';border:1px solid rgba(245,197,88,.4);border-radius:6px;padding:2px 8px">'+p.tag+'</span><span class="mono" style="font-size:10px;font-weight:600;color:'+riskCol(F.lvl)+';margin-left:auto">'+F.risk+'</span></div><div style="font-size:15.5px;font-weight:700;color:#fff;line-height:1.3">'+esc(F.name)+'</div><div style="font-size:12.5px;color:'+SECON+';line-height:1.6">'+esc(p.reason)+'</div><a class="viewlink mono" href="#funds" data-act="fund" data-arg="'+p.i+'">VIEW IN FUND ANALYZER →</a></div>';}).join("");
  const risks=H.risks.map(t=>'<div class="bullet"><span style="background:'+RED+';box-shadow:0 0 6px rgba(255,106,106,.6)"></span><span>'+esc(t)+'</span></div>').join("");
  const signs=H.signs.map(t=>'<div class="bullet"><span style="background:'+GOLD+';box-shadow:0 0 6px rgba(245,197,88,.6)"></span><span>'+esc(t)+'</span></div>').join("");
  return '<section id="outlook" class="sec"><div class="wrap"><div class="eyebrow mono">READING THE ROOM</div><h2 style="margin-top:8px">Which fund, for which horizon?</h2><p class="lead" style="max-width:600px">Given today&#39;s backdrop — cooling inflation, an easing Fed, a calm VIX — the case for each fund changes with how long your money stays invested. Pick a horizon.</p>'
    +'<div class="otabs">'+tabs+'</div><div class="sentiment">'+esc(H.sentiment)+'</div><div class="pickgrid">'+picks+'</div>'
    +'<div class="panelgrid"><div class="riskpanel"><div class="paneltitle mono" style="color:'+RED+'">WHAT COULD GO WRONG</div><div class="bullets">'+risks+'</div></div><div class="signpanel"><div class="paneltitle mono" style="color:'+GOLD+'">SIGNPOSTS TO WATCH</div><div class="bullets">'+signs+'</div></div></div>'
    +'<div class="disc" style="max-width:760px">Educational reasoning based on illustrative market readings — not a recommendation or personalised advice. Fund choice depends on your goals, risk tolerance and existing holdings; speak to a licensed adviser.</div></div></section>';
}
function slider(label,valId,valTxt,min,max,step,grp,fld,val){
  return '<label class="sl"><span>'+label+'</span><span class="slval mono" id="'+valId+'">'+valTxt+'</span><input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" data-act="slider" data-grp="'+grp+'" data-fld="'+fld+'"></label>';
}
function toolsHTML(){
  const c=calc(),g=S.g,gg=growthGeom();
  const growth='<div class="toolcard wide"><div style="display:flex;flex-wrap:wrap;gap:clamp(20px,4vw,44px)"><div style="flex:1;min-width:260px"><h3>Investment Growth</h3><p class="sub">How compounding builds over time.</p>'
    +slider("Initial investment","gInitL",fmt(g.init),0,500000,5000,"g","init",g.init)+slider("Monthly contribution","gMonL",fmt(g.monthly),0,5000,50,"g","monthly",g.monthly)+slider("Annual return","gRetL",g.ret+"%",0,12,0.5,"g","ret",g.ret)+slider("Years","gYrsL",g.yrs,1,40,1,"g","yrs",g.yrs)+'</div>'
    +'<div style="flex:1.3;min-width:280px;display:flex;flex-direction:column"><div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:10px"><div><div class="mono tlbl">PROJECTED VALUE</div><div class="mono big" id="gFinal" style="text-shadow:0 0 24px rgba(245,197,88,.35)">'+fmt(c.fv)+'</div></div><div><div class="mono tlbl">YOU PUT IN</div><div class="mono med" id="gContrib" style="color:#B9C2DC">'+fmt(c.contrib)+'</div></div><div><div class="mono tlbl">COMPOUND GROWTH</div><div class="mono med" id="gGrowth" style="color:'+GOLD+';text-shadow:0 0 14px rgba(245,197,88,.5)">'+fmt(c.growth)+'</div></div></div>'
    +'<svg width="100%" height="190" viewBox="0 0 600 220" preserveAspectRatio="none" style="display:block;margin-top:auto"><polygon id="gTA" points="'+gg.tArea+'" fill="'+GOLD+'" fill-opacity=".16"/><path id="gTL" d="'+gg.tLine+'" fill="none" stroke="'+GOLD+'" stroke-width="2.4" style="filter:drop-shadow(0 0 6px '+GOLD+')"/><polygon id="gCA" points="'+gg.cArea+'" fill="#5E7CE2" fill-opacity=".18"/><path id="gCL" d="'+gg.cLine+'" fill="none" stroke="#8FA3D9" stroke-width="2"/></svg>'
    +'<div style="display:flex;gap:18px;font-size:11.5px;color:'+SECON+';margin-top:6px"><span><span class="dot" style="background:#8FA3D9"></span>Contributions</span><span><span class="dot" style="background:'+GOLD+'"></span>Total with growth</span></div></div></div><div class="disc">Illustrative only. Assumes a constant return, compounded monthly, before fees and tax.</div></div>';
  const infOrb=Math.round(120*Math.sqrt(Math.max(c.real/S.inf.amt,0.02)));
  const inflation='<div class="toolcard"><h3>Inflation Eroder</h3><p class="sub">What cash quietly loses.</p>'
    +slider("Amount today","iAmtL",fmt(S.inf.amt),10000,1000000,10000,"inf","amt",S.inf.amt)+slider("Inflation","iRateL",S.inf.rate+"%",0.5,8,0.25,"inf","rate",S.inf.rate)+slider("Years","iYrsL",S.inf.yrs,1,40,1,"inf","yrs",S.inf.yrs)
    +'<div style="display:flex;align-items:flex-end;justify-content:center;gap:clamp(18px,4vw,40px);margin:20px 0 8px;min-height:150px"><div style="text-align:center"><div style="width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#FFE7AE,#F5C558 50%,rgba(245,197,88,.1) 85%);box-shadow:0 0 34px rgba(245,197,88,.5);margin:0 auto"></div><div class="mono orblab">TODAY</div></div><div style="text-align:center"><div id="iOrb" style="width:'+infOrb+'px;height:'+infOrb+'px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#8FA3D9,#5E7CE2 50%,rgba(94,124,226,.1) 85%);box-shadow:0 0 26px rgba(94,124,226,.45);margin:0 auto"></div><div class="mono orblab">IN <span id="iYrsTxt">'+S.inf.yrs+'</span> YEARS</div></div></div>'
    +'<div style="text-align:center"><div class="mono tlbl">REAL PURCHASING POWER</div><div class="mono" id="iReal" style="font-size:30px;font-weight:600;color:#fff">'+fmt(c.real)+'</div><div class="mono" id="iLost" style="font-size:13px;font-weight:600;color:'+RED+'">−'+(100-(c.real/S.inf.amt)*100).toFixed(0)+'% buying power</div></div><div class="disc" style="margin-top:auto">Illustrative only. Assumes constant inflation.</div></div>';
  const ratio=Math.min(c.pot/c.need,1),gapPos=c.gap>=0,gcol=ratio>=1?GREEN:ratio>=.65?GOLD:"#FF7A5A";
  const retire='<div class="toolcard"><h3>Retirement Gap</h3><p class="sub">Projected pot vs what you may need.</p>'
    +slider("Your age","rAgeL",S.r.age,20,60,1,"r","age",S.r.age)+slider("Retire at","rRetL",S.r.retAge,40,70,1,"r","retAge",S.r.retAge)+slider("Monthly income needed","rIncL",fmt(S.r.income),1000,15000,250,"r","income",S.r.income)+slider("Current savings","rSavL",fmt(S.r.savings),0,2000000,10000,"r","savings",S.r.savings)
    +'<div style="display:flex;align-items:center;gap:18px;justify-content:center;margin:18px 0 6px;flex-wrap:wrap"><div style="position:relative;width:150px;height:150px;flex:none"><svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="11"/><circle id="rGauge" cx="75" cy="75" r="62" fill="none" stroke="'+gcol+'" stroke-width="11" stroke-linecap="round" stroke-dasharray="389.6" stroke-dashoffset="'+(389.6*(1-ratio)).toFixed(1)+'" transform="rotate(-90 75 75)" style="filter:drop-shadow(0 0 8px '+gcol+')"/></svg><div class="gaugetxt"><div class="mono" id="rPct" style="font-size:22px;font-weight:600;color:#fff">'+Math.round(ratio*100)+'%</div><div class="mono" style="font-size:9.5px;color:'+MUTED+';letter-spacing:.14em">FUNDED</div></div></div>'
    +'<div style="min-width:150px"><div class="mono tlbl">PROJECTED POT</div><div class="mono" id="rPot" style="font-size:20px;font-weight:600;color:#fff">'+fmt(c.pot)+'</div><div class="mono tlbl" style="margin-top:8px">ESTIMATED NEED</div><div class="mono" id="rNeed" style="font-size:20px;font-weight:600;color:#B9C2DC">'+fmt(c.need)+'</div><div class="mono tlbl" style="margin-top:8px" id="rGapLabel">'+(gapPos?"SURPLUS":"SHORTFALL")+'</div><div class="mono" id="rGap" style="font-size:20px;font-weight:600;color:'+(gapPos?GREEN:"#FF7A5A")+'">'+(gapPos?"+":"−")+fmt(Math.abs(c.gap))+'</div></div></div>'
    +'<div class="disc" style="margin-top:auto">Illustrative only. Assumes 5% p.a. growth on savings and ~25 years of retirement income (4% rule). Excludes CPF.</div></div>';
  const r72='<div class="toolcard"><h3>Rule of 72</h3><p class="sub">How long money takes to double.</p>'+slider("Annual return","r72L",S.r72+"%",1,15,0.5,"r72","r72",S.r72)
    +'<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0 10px"><div style="width:56px;height:56px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:600;color:#B9C2DC;font-size:14px" class="mono">×1</div><svg width="46" height="14" viewBox="0 0 46 14" fill="none"><path d="M1 7h38m0 0l-6-5m6 5l-6 5" stroke="'+MUTED+'" stroke-width="1.6" stroke-linecap="round"/></svg><div style="width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#FFE7AE,#F5C558 55%);box-shadow:0 0 30px rgba(245,197,88,.55);display:flex;align-items:center;justify-content:center;font-weight:700;color:#0A0E1A;font-size:18px" class="mono">×2</div></div>'
    +'<div style="text-align:center;margin-bottom:8px"><div class="mono" style="font-size:clamp(34px,4vw,46px);font-weight:600;color:#fff;text-shadow:0 0 24px rgba(245,197,88,.4)"><span id="r72Yrs">'+c.dbl.toFixed(1)+'</span> <span style="font-size:18px;color:'+MUTED+';font-weight:400">years</span></div><div style="font-size:13px;color:'+SECON+'">to double at <span id="r72RateTxt">'+S.r72+'</span>% a year</div></div>'
    +'<div class="bar" style="height:5px;margin:10px 0 4px"><div id="r72Bar" style="width:'+Math.min(100,c.dbl/30*100).toFixed(0)+'%;background:'+GOLD+';box-shadow:0 0 10px rgba(245,197,88,.7)"></div></div><div class="barlab mono" style="font-size:10px;color:'+MUTED+'"><span>FASTER</span><span>SLOWER</span></div><div class="disc" style="margin-top:auto">Illustrative only. The rule of 72 is an approximation (72 ÷ return %).</div></div>';
  return '<section id="tools" class="sec"><div class="wrap"><div class="eyebrow mono">PLANNING TOOLS</div><h2 style="margin-top:8px">Play with the numbers</h2><p class="lead">Everything runs in your browser. Drag the sliders — charts respond live. All figures in SGD, illustrative only.</p><div class="toolgrid">'+growth+inflation+retire+r72+quizHTML()+'</div></div></section>';
}
function quizHTML(){
  const q=S.quiz,prof=ST.profiles.find(p=>q.score<=p.max)||ST.profiles[4];
  if(!q.done){
    const dots=ST.quiz.map((_,i)=>'<div style="flex:1;height:3px;border-radius:2px;background:'+(i<q.i?GOLD:i===q.i?"rgba(245,197,88,.4)":"rgba(255,255,255,.1)")+';box-shadow:'+(i<q.i?"0 0 8px rgba(245,197,88,.6)":"none")+'"></div>').join("");
    const opts=ST.quiz[Math.min(q.i,5)].o.map(([t,s])=>'<button class="qopt" data-act="quiz" data-arg="'+s+'">'+esc(t)+'</button>').join("");
    return '<div class="toolcard wide"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><h3>Risk Tolerance Quiz</h3><span style="font-size:12px;color:'+SECON+'">6 quick taps · educational, not a recommendation</span></div><div style="max-width:640px;margin-top:18px"><div style="display:flex;gap:6px;margin-bottom:16px">'+dots+'</div><div class="mono" style="font-size:11px;color:'+GOLD+';letter-spacing:.16em">QUESTION '+Math.min(q.i+1,6)+' / 6</div><div style="font-size:clamp(17px,2.2vw,21px);font-weight:600;color:#fff;margin:8px 0 16px">'+esc(ST.quiz[Math.min(q.i,5)].q)+'</div><div style="display:flex;flex-direction:column;gap:8px">'+opts+'</div></div></div>';
  }
  const DC=2*Math.PI*54;let acc=0;
  const segs=prof.alloc.map(([n,pct,col])=>{const len=pct/100*DC,off=-acc/100*DC;acc+=pct;return '<circle cx="70" cy="70" r="54" fill="none" stroke="'+col+'" stroke-width="17" stroke-dasharray="'+len.toFixed(1)+" "+(DC-len).toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 70 70)" style="filter:drop-shadow(0 0 4px '+col+')"/>';}).join("");
  const legend=prof.alloc.map(([n,pct,col])=>'<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#C7D0E8"><span style="width:10px;height:10px;border-radius:3px;background:'+col+';box-shadow:0 0 6px '+col+'"></span>'+n+' <span class="mono" style="color:#fff;font-weight:600">'+pct+'%</span></div>').join("");
  return '<div class="toolcard wide"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><h3>Risk Tolerance Quiz</h3><span style="font-size:12px;color:'+SECON+'">6 quick taps · educational, not a recommendation</span></div><div style="display:flex;gap:clamp(20px,4vw,50px);flex-wrap:wrap;align-items:center;margin-top:18px"><div style="flex:1;min-width:250px"><div class="mono" style="font-size:11px;color:'+MUTED+';letter-spacing:.16em">YOUR PROFILE</div><div style="font-size:clamp(28px,3.4vw,40px);font-weight:700;color:'+GOLD+';text-shadow:0 0 24px rgba(245,197,88,.4)">'+prof.name+'</div><p style="color:#B9C2DC;font-size:14.5px;line-height:1.6;max-width:440px">'+esc(prof.blurb)+'</p><button class="ghost" data-act="quizreset">Retake quiz</button></div><div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap"><svg width="150" height="150" viewBox="0 0 140 140">'+segs+'</svg><div style="display:flex;flex-direction:column;gap:7px">'+legend+'</div></div></div></div>';
}
function ctaHTML(){
  return '<section class="sec"><div class="cta"><h2>Questions about <em>your</em> situation?</h2><p class="lead" style="max-width:520px;margin:14px auto 22px">The tools above are a starting point. A licensed adviser can map them to your goals, existing holdings, CPF and risk tolerance.</p><a class="bookbtn" target="_blank" rel="noopener" href="'+ST.aia+'">Book a review</a><div class="disc" style="max-width:620px;margin:26px auto 0">This site is for educational purposes only and does not constitute financial advice, a recommendation, or an offer to buy or sell any product. Market data is illustrative and/or delayed and refreshes weekly. Investments can fall as well as rise; past performance is not indicative of future results. Fund names are the property of AIA; figures shown here are illustrative — always verify against official sources before acting.</div><div class="mono" style="font-size:10px;color:'+MUTED+';margin-top:14px;opacity:.7">'+esc(DATA.meta.stamp)+'</div></div></section>';
}

/* ===== main render ===== */
function render(){
  document.getElementById("app").innerHTML=headerHTML()+tapeHTML()+marketsHTML()+sectorsHTML()+ladderHTML()+macroHTML()+analyzerHTML()+fundsHTML()+outlookHTML()+toolsHTML()+ctaHTML();
}
/* partial updates that must not rebuild focused inputs */
function updateSuggestions(){
  const c=companyView(),box=document.getElementById("mh-sugbox");if(!box)return;
  box.outerHTML=c.matches.length?'<div class="sugbox" id="mh-sugbox">'+c.matches.map(([n,t])=>'<button class="sug" data-act="co" data-arg="'+esc(n)+'"><span style="font-size:13.5px;color:#fff;font-weight:600">'+esc(n)+'</span><span class="mono" style="font-size:11px;color:'+MUTED+'">'+t+'</span></button>').join("")+'</div>':'<div id="mh-sugbox"></div>';
}
function setTxt(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function setAttr(id,a,v){const e=document.getElementById(id);if(e)e.setAttribute(a,v);}
function updateTools(){
  const c=calc(),g=S.g,gg=growthGeom();
  setTxt("gInitL",fmt(g.init));setTxt("gMonL",fmt(g.monthly));setTxt("gRetL",g.ret+"%");setTxt("gYrsL",g.yrs);
  setTxt("gFinal",fmt(c.fv));setTxt("gContrib",fmt(c.contrib));setTxt("gGrowth",fmt(c.growth));
  setAttr("gTA","points",gg.tArea);setAttr("gTL","d",gg.tLine);setAttr("gCA","points",gg.cArea);setAttr("gCL","d",gg.cLine);
  const infOrb=Math.round(120*Math.sqrt(Math.max(c.real/S.inf.amt,0.02)));
  setTxt("iAmtL",fmt(S.inf.amt));setTxt("iRateL",S.inf.rate+"%");setTxt("iYrsL",S.inf.yrs);setTxt("iYrsTxt",S.inf.yrs);
  setTxt("iReal",fmt(c.real));setTxt("iLost","−"+(100-(c.real/S.inf.amt)*100).toFixed(0)+"% buying power");
  const io=document.getElementById("iOrb");if(io){io.style.width=infOrb+"px";io.style.height=infOrb+"px";}
  const ratio=Math.min(c.pot/c.need,1),gapPos=c.gap>=0,gcol=ratio>=1?GREEN:ratio>=.65?GOLD:"#FF7A5A";
  setTxt("rAgeL",S.r.age);setTxt("rRetL",S.r.retAge);setTxt("rIncL",fmt(S.r.income));setTxt("rSavL",fmt(S.r.savings));
  setTxt("rPot",fmt(c.pot));setTxt("rNeed",fmt(c.need));setTxt("rPct",Math.round(ratio*100)+"%");
  setTxt("rGapLabel",gapPos?"SURPLUS":"SHORTFALL");setTxt("rGap",(gapPos?"+":"−")+fmt(Math.abs(c.gap)));
  const rg=document.getElementById("rGap");if(rg)rg.style.color=gapPos?GREEN:"#FF7A5A";
  const ga=document.getElementById("rGauge");if(ga){ga.setAttribute("stroke-dashoffset",(389.6*(1-ratio)).toFixed(1));ga.setAttribute("stroke",gcol);ga.style.filter="drop-shadow(0 0 8px "+gcol+")";}
  setTxt("r72L",S.r72+"%");setTxt("r72Yrs",c.dbl.toFixed(1));setTxt("r72RateTxt",S.r72);
  const b=document.getElementById("r72Bar");if(b)b.style.width=Math.min(100,c.dbl/30*100).toFixed(0)+"%";
}

/* ===== events ===== */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-act]");if(!t)return;const act=t.getAttribute("data-act"),arg=t.getAttribute("data-arg");
  if(act==="slider")return;
  if(act==="tf"){S.tf=arg;render();}
  else if(act==="sel"){S.sel=arg;render();}
  else if(act==="sectf"){S.secTf=arg;render();}
  else if(act==="sec"){S.hoverSec=arg;render();}
  else if(act==="co"){S.co=arg;S.query="";render();}
  else if(act==="fund"){S.fund=+arg;render();if(t.classList.contains("viewlink")){setTimeout(()=>document.getElementById("funds").scrollIntoView({behavior:"smooth"}),40);}}
  else if(act==="hz"){S.horizon=+arg;render();}
  else if(act==="quiz"){const s=+arg;S.quiz={i:S.quiz.i+1,score:S.quiz.score+s,done:S.quiz.i+1>=6};render();}
  else if(act==="quizreset"){S.quiz={i:0,score:0,done:false};render();}
});
document.addEventListener("mouseover",e=>{const t=e.target.closest('[data-act="sec"]');if(t){const a=t.getAttribute("data-arg");if(a!==S.hoverSec){S.hoverSec=a;render();}}});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="mh-search"){S.query=t.value;updateSuggestions();return;}
  if(t.getAttribute&&t.getAttribute("data-act")==="slider"){
    const grp=t.getAttribute("data-grp"),fld=t.getAttribute("data-fld"),v=+t.value;
    if(grp==="r72")S.r72=v;
    else {S[grp]={...S[grp],[fld]:v};
      if(grp==="r"){const r=S.r;if(r.retAge<=r.age){if(fld==="age")r.retAge=Math.min(70,r.age+1);else r.age=Math.max(20,r.retAge-1);}}}
    updateTools();
  }
});
render();
`;

const CSS = String.raw`
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0A0E1A;color:#E8ECF6;font-family:var(--ui);-webkit-font-smoothing:antialiased}
:root{--ui:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;--mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
html{scroll-behavior:smooth}
a{color:#F5C558;text-decoration:none}a:hover{color:#FFD97A}
button:focus-visible,a:focus-visible,input:focus-visible,.orb:focus-visible{outline:2px solid #F5C558;outline-offset:2px}
::-webkit-scrollbar{height:6px;width:8px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}::-webkit-scrollbar-track{background:transparent}
@keyframes mhd1{0%,100%{transform:translate(0,0)}50%{transform:translate(7px,-11px)}}
@keyframes mhd2{0%,100%{transform:translate(0,0)}50%{transform:translate(-9px,8px)}}
@keyframes mhd3{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,10px)}}
@keyframes mhtape{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
h2{margin:0;font-size:clamp(24px,3vw,34px);font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.15;text-wrap:balance}
h3{margin:0 0 4px;font-size:19px;color:#fff}
.lead{margin:14px 0 0;color:#8A94B8;font-size:14.5px;line-height:1.6;max-width:400px;text-wrap:pretty}
.eyebrow{font-size:11px;letter-spacing:.22em;color:#F5C558}
.sec{border-bottom:1px solid rgba(255,255,255,.07)}
.wrap{max-width:1200px;margin:0 auto;padding:clamp(30px,4vw,50px) clamp(16px,4vw,48px)}
.twocol{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:clamp(20px,3vw,44px)}
.lbl{font-size:10px;color:#6B7494;letter-spacing:.16em;font-family:var(--mono)}
.disc{font-size:10.5px;color:#6B7494;margin-top:12px;line-height:1.5}
.panel{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
.cell{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px}
.cell2{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px}
.bar{height:4px;border-radius:2px;background:rgba(255,255,255,.08)}.bar>div{height:100%;border-radius:2px}
.barlab{display:flex;justify-content:space-between;font-size:11px;color:#B9C2DC;margin-bottom:4px;font-family:var(--mono)}
/* header */
.hd{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:20px;padding:13px clamp(16px,4vw,48px);background:rgba(10,14,26,.8);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.07);flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;color:#fff}.brand span{font-weight:700;font-size:15px;letter-spacing:.05em;white-space:nowrap}
.nav{display:flex;gap:2px;margin-left:auto;align-items:center;flex-wrap:wrap}
.nv{color:#B9C2DC;font-size:13.5px;padding:7px 12px;border-radius:8px;transition:all .2s}.nv:hover{color:#fff;background:rgba(255,255,255,.06)}
.aia{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(245,197,88,.5);background:rgba(245,197,88,.08);color:#F5C558;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:8px;white-space:nowrap;transition:all .2s}.aia:hover{background:rgba(245,197,88,.16)}
.stamp{font-size:10.5px;color:#6B7494;font-family:var(--mono);white-space:nowrap}
/* tape */
.tape{overflow:hidden;border-bottom:1px solid rgba(255,255,255,.08);padding:9px 0;background:rgba(255,255,255,.015)}
.taperow{display:flex;width:max-content;animation:mhtape 32s linear infinite}
.tpi{display:inline-flex;gap:8px;align-items:baseline;padding:0 16px;border-right:1px solid rgba(255,255,255,.07);font-family:var(--mono);font-size:11.5px;white-space:nowrap}
/* markets */
.mktgrid{display:grid;grid-template-columns:220px 1fr 250px;max-width:1360px;margin:0 auto}
.wlwrap{border-right:1px solid rgba(255,255,255,.08);padding:10px 8px 14px;display:flex;flex-direction:column;gap:2px}
.wl{display:flex;justify-content:space-between;align-items:center;gap:8px;background:transparent;border:none;border-left:2px solid transparent;border-radius:0 7px 7px 0;padding:9px 10px;cursor:pointer;font-family:inherit;text-align:left;transition:all .2s}
.wl:hover{background:rgba(255,255,255,.05)}.wl.sel{background:rgba(245,197,88,.08);border-left-color:#F5C558}
.wlL{display:flex;flex-direction:column}.wlR{display:flex;flex-direction:column;align-items:flex-end}
.chartwrap{padding:18px 20px;min-width:0}
.chead{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.pillbox{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:3px;margin-left:auto}
.pillbox2{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:4px;margin-top:20px;width:fit-content;flex-wrap:wrap}
.tp{border:none;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:600;padding:5px 10px;border-radius:6px;transition:all .25s;background:transparent;color:#8A94B8}
.pillbox2 .tp{font-size:12px;padding:7px 13px;border-radius:7px}
.tp.sel{background:#F5C558;color:#0A0E1A}
.railwrap{border-left:1px solid rgba(255,255,255,.08);padding:16px 14px;display:flex;flex-direction:column;gap:12px}
.cellgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rangebar{position:relative;height:4px;border-radius:2px;background:linear-gradient(90deg,#FF6A6A,#F5C558,#3EE68F)}
.rangedot{position:absolute;top:-3px;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.8);margin-left:-5px}
@media(max-width:820px){.mktgrid{grid-template-columns:1fr}.wlwrap,.railwrap{border:none}}
/* sectors */
.h2row{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.secdetail{margin-top:22px;border-top:1px solid rgba(255,255,255,.08);padding-top:16px}
.secline{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.secdesc{margin:10px 0 0;font-size:13px;color:#8A94B8;line-height:1.6;max-width:420px}
.topwrap{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}
.topname{font-size:11px;font-weight:600;color:#B9C2DC;border:1px solid rgba(255,255,255,.14);border-radius:99px;padding:3px 10px;white-space:nowrap}
.retgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px;max-width:420px}
.orbfield{position:relative;aspect-ratio:1;max-width:560px;margin:0 auto;width:100%}
.ring1{position:absolute;inset:0;border:1px solid rgba(255,255,255,.06);border-radius:50%}
.ring2{position:absolute;inset:15%;border:1px dashed rgba(245,197,88,.14);border-radius:50%}
.orbpos{position:absolute}
.orb{width:100%;height:100%;border-radius:50%;cursor:pointer;transition:transform .35s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.orb:hover{transform:scale(1.14)}
/* ladder */
.ladder{display:flex;flex-direction:column;gap:6px;max-width:760px}
.lrow{display:grid;grid-template-columns:92px 1fr 68px;align-items:center;gap:12px;border:1px solid;border-radius:9px;padding:10px 13px;cursor:pointer;font-family:inherit;transition:all .25s;text-align:left}
.lrow:hover{border-color:rgba(245,197,88,.5)}
.lbarwrap{position:relative;height:14px;display:block}.lbaraxis{position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.15)}
.lbar{position:absolute;top:2px;bottom:2px;border-radius:5px;transition:all .5s}
/* macro */
.macrogrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(255px,100%),1fr));gap:12px}
.mcard{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:6px;color:inherit;cursor:pointer;transition:all .3s}
.mcard:hover{border-color:rgba(245,197,88,.5);transform:translateY(-2px)}
.mcardtop{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.flag{font-size:10px;font-weight:600;border:1px solid;border-radius:6px;padding:2px 7px;white-space:nowrap}
.mval{display:flex;align-items:baseline;gap:10px}.mnote{font-size:12px;color:#8A94B8;line-height:1.5}.mnext{font-size:11px;color:#F5C558;line-height:1.5;opacity:.85}
.mfoot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
/* analyzer + funds */
.searchwrap{position:relative;max-width:420px}
.searchbox{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 13px}
.searchbox input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:var(--ui);font-size:14px}
.sugbox{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#0E1322;border:1px solid rgba(255,255,255,.14);border-radius:10px;overflow:hidden;z-index:30;box-shadow:0 12px 34px rgba(0,0,0,.6)}
.sug{display:flex;justify-content:space-between;align-items:center;width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.06);padding:11px 14px;cursor:pointer;font-family:inherit;text-align:left}
.sug:hover{background:rgba(245,197,88,.08)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.chip{border:1px solid rgba(255,255,255,.12);background:transparent;color:#8A94B8;font-family:var(--mono);font-size:11.5px;font-weight:600;padding:7px 13px;border-radius:99px;cursor:pointer;transition:all .2s;white-space:nowrap}
.chip:hover{border-color:#F5C558}.chip.sel{background:rgba(245,197,88,.12);border-color:rgba(245,197,88,.55);color:#F5C558}
.radar{max-width:420px;margin-top:20px}.radartop{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.bigcard{border-radius:16px;padding:clamp(16px,2.5vw,24px)}
.cohead{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.subhead{font-size:12.5px;font-weight:600;color:#E8ECF6;margin:16px 0 8px}
.metrow{display:flex;justify-content:space-between;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:12.5px}
.factgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px}
.factval{font-size:12px;font-weight:600;color:#E8ECF6;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mtake{background:rgba(245,197,88,.05);border:1px solid rgba(245,197,88,.2);border-radius:12px;padding:14px;font-size:12.5px;color:#B9C2DC;line-height:1.6}
.fundlink{display:inline-flex;align-items:center;gap:8px;margin-top:18px;font-size:13.5px;font-weight:600;color:#F5C558;border:1px solid rgba(245,197,88,.4);border-radius:9px;padding:11px 18px;transition:all .2s;min-height:44px}
.fundlink:hover{background:rgba(245,197,88,.1)}
/* outlook */
.otabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:4px;width:fit-content;flex-wrap:wrap}
.otab{border:none;cursor:pointer;font-family:var(--mono);font-size:11.5px;font-weight:600;padding:8px 16px;border-radius:7px;transition:all .25s;background:transparent;color:#8A94B8;white-space:nowrap}.otab.sel{background:#F5C558;color:#0A0E1A}
.sentiment{margin:18px 0 20px;padding:14px 18px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-left:2px solid #F5C558;border-radius:0 12px 12px 0;font-size:13.5px;color:#B9C2DC;line-height:1.6;max-width:760px}
.pickgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:12px}
.pick{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:border-color .3s}.pick:hover{border-color:rgba(245,197,88,.4)}
.pickhd{display:flex;align-items:center;gap:10px}.viewlink{margin-top:auto;font-size:12px;font-weight:600;color:#F5C558}
.panelgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:12px;margin-top:12px}
.riskpanel{background:rgba(255,106,106,.04);border:1px solid rgba(255,106,106,.2);border-radius:14px;padding:18px}
.signpanel{background:rgba(245,197,88,.04);border:1px solid rgba(245,197,88,.2);border-radius:14px;padding:18px}
.paneltitle{font-size:11px;font-weight:600;letter-spacing:.14em;margin-bottom:12px}
.bullets{display:flex;flex-direction:column;gap:10px}
.bullet{display:flex;gap:10px;font-size:12.5px;color:#B9C2DC;line-height:1.55}.bullet>span:first-child{width:6px;height:6px;border-radius:50%;flex:none;margin-top:6px}
/* tools */
.toolgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:14px}
.toolcard{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:clamp(18px,3vw,26px);display:flex;flex-direction:column}
.toolcard.wide{grid-column:1/-1}
.sub{margin:0 0 8px;font-size:13px;color:#8A94B8}
.sl{display:block;font-size:12.5px;color:#B9C2DC;margin-top:8px}.sl>span:first-child{}
.slval{float:right;color:#fff;font-weight:600}
.sl input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,.12);outline:none;width:100%;cursor:pointer;margin:10px 0 4px}
.sl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#F5C558;box-shadow:0 0 12px rgba(245,197,88,.7);cursor:pointer;border:2px solid #0A0E1A}
.sl input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#F5C558;box-shadow:0 0 12px rgba(245,197,88,.7);cursor:pointer;border:2px solid #0A0E1A}
.tlbl{font-size:10.5px;color:#6B7494;letter-spacing:.12em}
.big{font-size:clamp(28px,3.4vw,40px);font-weight:600;color:#fff}.med{font-size:clamp(18px,2vw,24px);font-weight:600}
.dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}
.orblab{font-size:11px;color:#6B7494;margin-top:8px}
.gaugetxt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.qopt{text-align:left;font-family:inherit;font-size:14.5px;color:#E8ECF6;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 16px;cursor:pointer;transition:all .2s;min-height:44px}
.qopt:hover{border-color:#F5C558;background:rgba(245,197,88,.07);transform:translateX(4px)}
.ghost{font-family:inherit;font-size:13px;font-weight:600;color:#F5C558;background:transparent;border:1px solid rgba(245,197,88,.4);border-radius:8px;padding:9px 18px;cursor:pointer;transition:all .2s;min-height:44px;margin-top:8px}.ghost:hover{background:rgba(245,197,88,.12)}
/* cta */
.cta{max-width:760px;margin:0 auto;padding:clamp(40px,6vw,72px) clamp(16px,4vw,48px);text-align:center}
.cta em{color:#F5C558;font-style:italic}
.bookbtn{display:inline-flex;align-items:center;gap:8px;background:#F5C558;color:#0A0E1A;font-weight:700;font-size:14px;padding:13px 26px;border-radius:10px;box-shadow:0 0 30px rgba(245,197,88,.35)}
`;

const HTML = `<div style="background:#F5C558;color:#0A0E1A;font:600 12.5px/1.4 system-ui,sans-serif;padding:8px 16px;text-align:center">
Live preview of the Market &amp; Planning Hub — a static snapshot for viewing/sharing. The self-updating production version deploys from your repo.
</div>
<style>${CSS}</style>
<div id="app"></div>
<script>${APP.replace("__DATA__", JSON.stringify(DATA)).replace("__STATIC__", JSON.stringify(STATIC))}</script>`;

const out = process.argv[2] || path.join(process.cwd(), "hub.html");
writeFileSync(out, HTML);
console.log("wrote", out, "(" + (HTML.length / 1024).toFixed(0) + " KB)");
