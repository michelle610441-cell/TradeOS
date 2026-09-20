
const STEPS=["交易日","◈ 今日驾驶舱","①宏观","②大盘","③大势","④情绪","⑤板块","⑥个股","⑦买点","⑧仓位","⑨持仓","⑩卖出","⑪复盘/博主","⑫统计","⑬龙虎榜","战法库","盘前候选","⚡极速决策","20笔挑战"];
const phases=["启动","加速","高潮","分歧","退潮","冰点","修复"];
const models=["龙头高位横盘二波","强势板块延续","断板反包","强势板块补涨套利","大阳回踩","N字形走势","楔形/三角形","分时强弱","KDJ趋势","其他"];
const DISCIPLINE_MOTTOS=["量能不足，谨慎追高。","先定主流板块，再判断情绪时机，最后寻找领涨个股。","拉升回踩再买，买确定性。","顺着情绪上升周期操作，避开退潮阶段。","成本不是市场的支撑位。","看好，不代表可以没有失效条件。"];
let db, currentStep=0, selectedDayId=null, selectedSetupId=null, state={days:[],bloggers:[],setupLibrary:[],tradeCases:[],disciplineChallenges:[],settings:{experimentMaxPositionPct:5,experimentPromotionCases:5}};

function showToast(t){let e=document.getElementById("toast");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",1600)}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}

function save(){
 state.version='4.0';state.dataSchemaVersion=2;let d=day();if(d)d.updatedAt=new Date().toISOString();
 try{localStorage.setItem('tradeos_v4_0',JSON.stringify(state));return true}
 catch(e){showToast('保存失败，请立即导出完整备份：'+e.message);return false}
}

function load(){
 for(const key of ['tradeos_v4_0','tradeos_v3_1','tradeos_v3_0_1','tradeos_v3_0','tradeos_v2_9','tradeos_v2_8','tradeos_v2_7_1','tradeos_v2_7','tradeos_v2_6_complete','tradeos_v2','tradeos_v1']){
  const raw=localStorage.getItem(key);if(!raw)continue;
  try{state=migratePayload(JSON.parse(raw));return}catch(e){alert(key+' 读取失败，原数据未覆盖：'+e.message)}
 }
}

function day(){return state.days.find(x=>x.id===selectedDayId)||state.days[0]||null}
function selectDay(id){selectedDayId=id;currentStep=0;render()}
function prevDay(){let i=state.days.findIndex(x=>x.id===selectedDayId);if(i>=0 && state.days[i+1]){selectedDayId=state.days[i+1].id;currentStep=0;render()}}
function nextDay(){let i=state.days.findIndex(x=>x.id===selectedDayId);if(i>0){selectedDayId=state.days[i-1].id;currentStep=0;render()}}
function newDay(){
 const date=today(),existing=state.days.find(d=>d.date===date);
 if(existing){selectedDayId=existing.id;currentStep=0;render();showToast('已打开今天的交易日');return}
 const prev=[...state.days].filter(d=>d.date<date).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const d=normalizeDay({date,createdAt:new Date().toISOString()});
 if(prev){
  d.holdings=clone(prev.holdings.filter(h=>n(h.qty)>0));
  d.holdings.forEach(h=>{h.inheritedFrom=prev.date;h.availableQty=h.qty});
  d.stocks=clone(prev.stocks);d.currentStockId=prev.currentStockId;
  d.account=clone(prev.account);d.aiPlan=clone(prev.aiPlan);d.aiPlan.asOf='';
 }
 state.days.push(d);state.days.sort((a,b)=>b.date.localeCompare(a.date));selectedDayId=d.id;
 save();currentStep=0;render();showToast('已建立今日档案，继承持仓和计划')
}

function ensure(){
 if(!state.days.length)return;
 if(!state.days.some(d=>d.id===selectedDayId))selectedDayId=state.days[0].id;
}

function setPath(obj,key,val){obj[key]=val;save()}
function field(obj,key,label,type="text",placeholder=""){let v=obj[key]??"";return `<div><label>${label}</label><input data-obj="${obj.__name||""}" data-key="${key}" type="${type}" value="${String(v).replaceAll('"','&quot;')}" placeholder="${placeholder}"></div>`}
function nav(){document.getElementById("nav").innerHTML=STEPS.map((x,i)=>`<button data-num="${i===0?'⌂':i===1?'◈':i-1}" class="${i===currentStep?'on':''}" onclick="goStep(${i})">${x}</button>`).join("")}
function goStep(i){currentStep=i;render();if(typeof scrollTo==='function')scrollTo({top:0,behavior:'smooth'})}
function wrap(title,body){return `<section class="card"><h2>${title}</h2>${body}</section>`}
function text(obj,key,label,ph=""){bindArea(obj);return `<div><label>${label}</label>${ph?`<p class="hint">${ph}</p>`:""}<textarea data-key="${key}" data-area="${obj._id}" placeholder="${ph}">${esc(obj[key]||"")}</textarea></div>`}
function input(obj,key,label,type="text"){bindArea(obj);let hints={"股票名称":"填写准备研究/交易的个股。","代码":"填写A股代码，便于复盘定位。","同花顺热度榜排名":"手动填写热度榜排名；≤100才进入候选池。","主流板块":"先写当前最强/最主流方向。","涨停家数":"手动统计板块内涨停家数。","资金流向":"填写流入/流出，并记录你的判断依据。","昨日领涨今日延续性":"重点看昨日领涨板块今天是否继续加强。","计划买入价":"不要把追高当作买点；记录你真正愿意成交的价格。","计划止损":"写清楚结构失效的位置。","确定性评分":"用你的主观确定性衡量仓位，而不是事后解释。","计划仓位 %":"先写计划，再填写实际仓位。","实际仓位 %":"记录真实成交后的仓位。","卖出价":"填写实际成交价。","实际收益率 %":"平仓后填写，供统计使用。"};return `<div><label>${label}</label>${hints[label]?`<p class="hint">${hints[label]}</p>`:""}<input data-key="${key}" data-area="${obj._id}" type="${type}" value="${esc(obj[key]??"")}"></div>`}
function select(obj,key,label,opts){bindArea(obj);let hints={phase:"情绪阶段决定策略节奏：启动看机会，分歧找强者，高潮做止盈。",model:"选择与你实际执行最接近的交易模式，便于之后统计。",action:"动作只是纪律提示，最终判断仍由你完成。"};return `<div><label>${label}</label>${hints[key]?`<p class="hint">${hints[key]}</p>`:""}<select data-key="${key}" data-area="${obj._id}"><option value="">请选择</option>${opts.map(x=>`<option ${obj[key]===x?"selected":""}>${x}</option>`).join("")}</select></div>`}
function bindArea(obj){obj._id=obj._id||id();return obj}

function stocksOf(d){return Array.isArray(d.stocks)?d.stocks:[]}
function currentStock(d){return stocksOf(d).find(x=>x.id===d.currentStockId)||stocksOf(d)[0]||null}
function newStock(){let d=day(),s={id:id(),name:"",code:"",hot:"",model:"",leader:false,ma:false,limit10:false,board2:false,sectorStrong:false,top100:false,notes:"",buy:{phase:"",price:"",planStop:"",confidence:"",notes:""},position:{plan:"",actual:"",reason:""}};d.stocks.push(s);d.currentStockId=s.id;save();render();}
function selectStock(id){let d=day();d.currentStockId=id;save();render()}
function deleteStock(id){let d=day();d.stocks=stocksOf(d).filter(x=>x.id!==id);if(d.currentStockId===id)d.currentStockId=d.stocks[0]?.id||null;save();render()}
function stockModel(id){let d=day(),s=stocksOf(d).find(x=>x.id===id);return s?.model||""}
function changeTradeModel(i,val){let d=day(),t=(d.trades||[])[i];if(t){t.model=val;t.modelEdited=true;save();render()}}
function render(){
 nav(); ensure(); let d=day(), a=document.getElementById("app");
 if(!d){a.innerHTML=wrap('交易日档案 · V4.0','<p>盘前想慢，盘中动快，盘后想透。</p><p>尚无交易日记录。</p><button class="btn" onclick="newDay()">建立今日档案</button><button class="btn alt" onclick="importData()">导入完整备份</button><button class="btn alt" onclick="exportData()">导出完整备份</button>');document.body.classList.remove('fast-mode');renderDisciplineRadar(null);return}
 if(currentStep===0)a.innerHTML=dayPage(d);
 else if(currentStep===1)a.innerHTML=dashboardPage(d);
 else if(currentStep===2)a.innerHTML=sectionArea(d,"macro","① 宏观","宏观环境、政策、流动性、外围市场与自己的判断。");
 else if(currentStep===3)a.innerHTML=marketPage(d);
 else if(currentStep===4)a.innerHTML=sectionArea(d,"trend","③ 大势","趋势方向、指数结构、风险偏好与操作环境。");
 else if(currentStep===5)a.innerHTML=emotionPage(d);
 else if(currentStep===6)a.innerHTML=sectorPage(d);
 else if(currentStep===7)a.innerHTML=stockPage(d);
 else if(currentStep===8)a.innerHTML=buyPage(d);
 else if(currentStep===9)a.innerHTML=positionPage(d);
 else if(currentStep===10)a.innerHTML=holdPage(d);
 else if(currentStep===11)a.innerHTML=sellPage(d);
 else if(currentStep===12)a.innerHTML=reviewPage(d);
 else if(currentStep===13)a.innerHTML=statsPage();
 else if(currentStep===14)a.innerHTML=leaderboardPage(d);
 else if(currentStep===15)a.innerHTML=setupLibraryPage();
 else if(currentStep===16)a.innerHTML=candidatePoolPage(d);
 else if(currentStep===17)a.innerHTML=fastExecutionPage(d);
 else a.innerHTML=disciplineChallengePage(d);
 bind();mountV4(d);renderDisciplineRadar(d);
}
function sectionArea(d,key,title,desc){let o=bindArea(d[key]);return wrap(title,`<p class="muted">${desc}</p><p class="hint">先写你的判断，不自动抓新闻；把“结论”和“风险”写成当天可复盘的具体判断。</p><div class="grid">${input(o,"conclusion","核心结论")} ${input(o,"rating","主观评级")} ${input(o,"risk","主要风险")}</div>${text(o,"notes","详细分析")}<button class="btn" onclick="save();showToast('已自动保存')">保存</button>`)}
function marketPage(d){
 let o=bindArea(d.market);let checks=[["up3800","上涨家数 > 3800"],["strong3","强势板块有3个以上延续"],["leader","龙头股表态（涨停/新高）"],["idx5","三大指数均站上5日线"],["nocb","连板无核按钮/无天地板"]];
 let risk=[["tech","科技板块集体大跌"],["stagnant","量比 > 4.0 且指数不涨"],["up800","上涨家数 < 800"],["kill","高位人气票出现3个以上跌停"]];
 const energy=volumeEnergy(o);
 return wrap("② 大盘 · 严格市场层",`<p class="muted">按你的严格市场规则逐项勾选。市场层只负责决定“允许不允许激进操作”，不替你自动选股。</p><p class="hint">只需填写量能（量比）和上涨家数。量能＜1 为缩量，＝1 为平量，＞1 为放量；不再比较成交额或设置阈值。</p><div class="grid">${input(o,"volumeRatio","量能（量比）","number")} ${input(o,"upCount","上涨家数","number")} ${input(o,"asOf","行情截至（北京时间）","datetime-local")}</div>${volumeEnergyUI(o)}<h3>一类行情</h3>${checks.map(([k,t])=>`<div class="check"><input type="checkbox" data-area="${o._id}" data-key="${k}" ${o[k]?"checked":""}>${t}</div>`).join("")}<h3>二类行情</h3>${["无明显强势板块","上涨家数 < 2000","连板无异常","三大指数部分站稳5日线"].map((t,i)=>`<div class="check"><input type="checkbox" data-area="${o._id}" data-key="b${i}" ${o["b"+i]?"checked":""}>${t}</div>`).join("")}<div id="autoLowVolume" class="check autoCheck ${energy.statusClass}"><span id="autoLowVolumeIcon" aria-hidden="true">${energy.value===null?'○':energy.value<1?'✓':'—'}</span><div><b>缩量条件：量能＜1</b><small id="autoLowVolumeNote">${energy.value===null?'填写量能后自动判断':energy.value<1?'已满足二类行情的缩量条件':'当前未满足缩量条件'}</small></div></div><h3>观望风险覆盖</h3>${risk.map(([k,t])=>`<div class="check"><input type="checkbox" data-area="${o._id}" data-key="${k}" ${o[k]?"checked":""}>${t}</div>`).join("")}<div class="grid"><div><label>最终市场状态</label><select data-area="${o._id}" data-key="final"><option>一类行情</option><option>二类行情</option><option>观望</option></select></div></div>${text(o,"notes","市场分析")}<button class="btn" onclick="save();showToast('市场分析已保存')">保存</button>`);
}
function emotionPage(d){let o=bindArea(d.emotion);return wrap("④ 情绪周期",`<p class="muted">启动 → 加速 → 高潮 → 分歧 → 退潮 → 冰点 → 修复。市场环境和情绪周期是两个维度。</p><p class="hint">启动关注/买入；分歧重点寻找强者；加速不追；高潮止盈；退潮不新开；冰点不参与；修复等待新的启动。</p>${select(o,"phase","当前阶段",phases)}<div class="grid"><div><label>操作动作</label><select data-area="${o._id}" data-key="action"><option>启动：关注/买入</option><option>分歧：重点买入</option><option>加速：持有，不追</option><option>高潮：卖出/止盈</option><option>退潮：卖出/不新开</option><option>冰点：不参与</option><option>修复：观察等待新启动</option></select></div></div>${text(o,"notes","周期依据")}<button class="btn" onclick="save();showToast('已保存')">保存</button>`)}
function sectorPage(d){let o=bindArea(d.sector);return wrap("⑤ 板块",`<p class="muted">先定主流板块。重点观察昨日领涨板块今天是否继续加强，避免无序轮动。</p><p class="hint">强势板块可从涨停家数、阶梯式梯队、多个涨停龙头、多只大阳线股票等方面判断。</p><div class="grid">${input(o,"name","主流板块")} ${input(o,"limitUps","涨停家数","number")} ${input(o,"fundFlow","资金流向")} ${input(o,"continuity","昨日领涨今日延续性")}</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="ladder" ${o.ladder?"checked":""}>阶梯式梯队</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="multiLeader" ${o.multiLeader?"checked":""}>多个涨停龙头</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="bigCandle" ${o.bigCandle?"checked":""}>多只大阳线股票</div>${text(o,"notes","板块分析")}<button class="btn" onclick="save();showToast('已保存')">保存</button>`)}
function stockPage(d){
 let s=currentStock(d);
 if(!s) return wrap("⑥ 个股 · 多股票池",`<p class="muted">一天可以记录多只股票。每只股票独立保存自己的交易模式，卖出时会自动带入对应模式。</p><button class="btn" onclick="newStock()">＋添加股票</button>`);
 let o=bindArea(s);
 return wrap("⑥ 个股 · 多股票池",`<p class="muted">一天可以记录多只候选/交易股票。交易模式属于“个股”，而不是卖出页面；卖出时选择股票即可自动继承。</p><p class="hint">建议把真正准备交易的股票分别建立档案。这样同一天研究多只股票时，不会覆盖前一只股票。</p><div class="row"><select onchange="selectStock(this.value)">${stocksOf(d).map(x=>`<option value="${x.id}" ${x.id===s.id?"selected":""}>${x.name||"未命名股票"} ${x.code?"· "+x.code:""}</option>`).join("")}</select><button class="btn" onclick="newStock()">＋添加股票</button><button class="btn danger" onclick="deleteStock('${s.id}')">删除当前股票</button></div><div class="grid">${input(o,"name","股票名称")} ${input(o,"code","代码")} ${input(o,"hot","同花顺热度榜排名","number")} ${select(o,"model","交易模式",models)}</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="leader" ${o.leader?"checked":""}>龙头/阶段领涨</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="ma" ${o.ma?"checked":""}>均线多头排列</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="limit10" ${o.limit10?"checked":""}>10日内有涨停</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="board2" ${o.board2?"checked":""}>二板以上</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="sectorStrong" ${o.sectorStrong?"checked":""}>处于强势板块</div><div class="check"><input type="checkbox" data-area="${o._id}" data-key="top100" ${o.top100?"checked":""}>热度榜 Top 100（排名≤100）</div>${text(o,"notes","个股判断")}<button class="btn" onclick="save();showToast('当前股票已保存')">保存当前股票</button><h3>今日股票清单</h3><div class="tableWrap"><table><tr><th>股票</th><th>代码</th><th>交易模式</th><th>热度</th><th>状态</th></tr>${stocksOf(d).map(x=>`<tr><td><button class="btn alt small" onclick="selectStock('${x.id}')">${x.name||"未命名"}</button></td><td>${x.code||"—"}</td><td>${x.model||"—"}</td><td>${x.hot||"—"}</td><td>${x.id===s.id?"当前": ""}</td></tr>`).join("")}</table></div>`)
}
function buyPage(d){let s=currentStock(d);if(!s)return wrap("⑦ 买点",`<p class="muted">请先在⑥个股建立股票档案。买点必须绑定具体股票，避免多只股票互相覆盖。</p><button class="btn" onclick="goStep(7)">去⑥个股添加股票</button>`);let o=bindArea(s.buy);let selected=`<b>${s.name||"未命名股票"}</b> · ${s.code||""} · 模式：<span class="pill">${s.model||"尚未设置"}</span>`;return wrap("⑦ 买点 · 当前股票",`<p class="muted">每只股票拥有独立买点。切换⑥个股中的股票后，这里的买点也会随之切换。</p><p class="hint">交易模式来自⑥个股；这里不重复填写模式，只记录这只股票具体在哪里、为什么买。</p><div class="card"><label>当前股票</label><div>${selected}</div></div>${select(o,"phase","买入情绪阶段",phases)}<div class="grid">${input(o,"price","计划买入价","number")} ${input(o,"planStop","计划止损","number")} ${input(o,"confidence","确定性评分","number")}</div>${text(o,"notes","买入逻辑")}${text(o,"invalidWhen","计划失效条件")}${text(o,"pendingActions","待执行动作")}${input(o,"takeProfit","计划止盈价","number")}${text(o,"changeReason","本次计划调整原因")}<button class="btn" onclick="save();showToast('当前股票买点已保存')">保存</button>`)}
function positionPage(d){let s=currentStock(d),r=bindArea(d.aiPlan);if(!s)return wrap("⑧ 仓位",`<h3>今日风险边界</h3><div class="twoCol">${input(r,'maxPositionPct','今日仓位上限 %','number')}${input(r,'maxLossPct','今日可接受亏损上限 %','number')}</div><p class="muted">请先在⑥个股建立股票档案。仓位与具体股票绑定。</p><button class="btn" onclick="goStep(7)">去⑥个股添加股票</button>`);let o=bindArea(s.position);return wrap("⑧ 仓位 · 当前股票",`<h3>今日风险边界</h3><div class="twoCol">${input(r,'maxPositionPct','今日仓位上限 %','number')}${input(r,'maxLossPct','今日可接受亏损上限 %','number')}</div><p class="muted">每只股票拥有独立的计划仓位、实际仓位和仓位理由。</p><div class="selectedStock"><label>当前股票</label><b>${esc(s.name||"未命名股票")}</b> · ${esc(s.code||"")} · 模式：<span class="pill">${esc(s.model||"尚未设置")}</span></div><div class="twoCol">${input(o,"plan","计划仓位 %","number")} ${input(o,"actual","实际仓位 %","number")}</div>${text(o,"reason","仓位理由")}<button class="btn" onclick="save();showToast('当前股票仓位已保存')">保存</button>`)}


function n(v){let x=Number(v);return Number.isFinite(x)?x:0}
function yuan(v){return nullable(v)===null?"—":"¥"+n(v).toFixed(2)}
function percent(v){return nullable(v)===null?"—":n(v).toFixed(2)+"%"}
function holdingCalc(d){
 let marketValue=0,costValue=0;
 (d.holdings||[]).forEach(h=>{marketValue+=n(h.qty)*n(h.price);costValue+=n(h.qty)*n(h.cost)});
 return {marketValue,costValue,floatingPnl:marketValue-costValue}
}
function recomputeAccount(d){
 const a=d.account,h=holdingCalc(d),cash=nullable(a.cash);
 const known=d.holdings.every(h=>nullable(h.qty)!==null&&nullable(h.price)!==null);
 const equity=cash!==null&&known?cash+h.marketValue:null;
 const capital=nullable(a.initialCapital)!==null?n(a.initialCapital)+n(a.deposit)-n(a.withdraw):null;
 const totalPnl=equity!==null&&capital!==null?equity-capital:null;
 d.accountSnapshot={equity,cash,marketValue:known?h.marketValue:null,floatingPnl:h.floatingPnl,totalPnl,returnPct:capital>0&&totalPnl!==null?totalPnl/capital*100:null,positionPct:equity>0?h.marketValue/equity*100:null,savedAt:d.accountSnapshot?.savedAt||''};return d.accountSnapshot;
}

function updateClosePrice(i,val){let d=day();if(!d.holdings?.[i])return;d.holdings[i].price=val;d.holdings[i].priceUpdatedAt=new Date().toISOString();d.holdings[i].priceAsOf=null;recomputeAccount(d);save();render()}
function findHoldingStockOptions(d){
 let seen=new Set(),arr=[];
 (d.holdings||[]).forEach(h=>{if(!seen.has(h.stockId)){seen.add(h.stockId);arr.push({id:h.stockId,name:h.name,code:h.code})}});
 stocksOf(d).forEach(s=>{if(!seen.has(s.id)){seen.add(s.id);arr.push(s)}});
 return arr
}

function saveAccountSnapshot(){let d=day();let s=recomputeAccount(d);if(s.equity===null){showToast('请补齐当前现金和持仓价格后保存快照');return}s.savedAt=new Date().toISOString();save();showToast("今日账户快照已保存");render()}
function equityPoints(){
 var out=[];
 for(var i=0;i<state.days.length;i++){
   var d=state.days[i]||{},s=d.accountSnapshot||{};
   if(s.savedAt&&nullable(s.equity)!==null){
     out.push({date:d.date||"",equity:n(s.equity),ret:n(s.returnPct)});
   }
 }
 out.sort(function(a,b){return String(a.date).localeCompare(String(b.date))});
 return out
}
function equityChart(){
 let a=equityPoints();if(!a.length)return '<p class="hint">暂无账户快照。每天收盘更新价格后，点击“保存今日账户快照”。</p>';
 let W=760,H=250,P=38,ys=a.map(x=>x.equity),mn=Math.min(...ys),mx=Math.max(...ys);if(mx===mn)mx=mn+1;
 let pts=a.map((q,i)=>{let x=P+(a.length===1?(W-2*P)/2:(W-2*P)*i/(a.length-1));let y=H-P-(H-2*P)*(q.equity-mn)/(mx-mn);return{x,y,q}});
 return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:640px;height:260px"><line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" stroke="currentColor" opacity=".2"/><polyline fill="none" stroke="currentColor" stroke-width="3" points="${pts.map(p=>p.x+","+p.y).join(" ")}"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5"><title>${p.q.date} · ${yuan(p.q.equity)} · ${percent(p.q.ret)}</title></circle>`).join("")}<text x="${P}" y="20" font-size="12">最高 ${yuan(mx)}</text><text x="${P}" y="${H-8}" font-size="12">最低 ${yuan(mn)}</text></svg></div>`
}

function holdPage(d){
 let s=recomputeAccount(d),opts=findHoldingStockOptions(d);bindArea(d.account);
 return wrap("⑨ 持仓 · 账户系统",`
 <p class="muted">持仓会自动延续到下一交易日。没有买卖时，你每天只需要更新收盘价。</p>
 <p class="hint">账户总权益 = 当前现金 + 持仓市值；追加资金和取出资金单独记录，不算投资收益。</p>
 <h3>账户基础</h3><div class="grid">${input(d.account,"initialCapital","初始本金","number")}${input(d.account,"cash","当前现金","number")}${input(d.account,"deposit","累计追加资金","number")}${input(d.account,"withdraw","累计取出资金","number")}</div>${text(d.account,"note","账户备注")}
 <div class="grid"><div class="card"><div class="stat">${yuan(s.equity)}</div><div class="muted">账户总权益</div></div><div class="card"><div class="stat">${yuan(s.marketValue)}</div><div class="muted">持仓市值</div></div><div class="card"><div class="stat">${yuan(s.floatingPnl)}</div><div class="muted">浮动盈亏</div></div><div class="card"><div class="stat">${yuan(s.totalPnl)}</div><div class="muted">累计总盈亏</div></div><div class="card"><div class="stat">${percent(s.returnPct)}</div><div class="muted">累计账户收益率</div></div><div class="card"><div class="stat">${percent(s.positionPct)}</div><div class="muted">当前总仓位</div></div></div>
 <h3>当前持仓 · 最新记录价格</h3><div class="tableWrap"><table><tr><th>股票</th><th>数量</th><th>成本</th><th>记录价格</th><th>市值</th><th>浮盈亏</th><th>收益率</th></tr>${(d.holdings||[]).map((h,i)=>{let mv=n(h.qty)*n(h.price),p=(n(h.price)-n(h.cost))*n(h.qty),r=n(h.cost)?(n(h.price)-n(h.cost))/n(h.cost)*100:0;return `<tr><td>${h.name||"—"} ${h.code||""}</td><td>${h.qty}</td><td>${n(h.cost).toFixed(3)}</td><td><input type="number" step="0.001" value="${h.price||""}" onchange="updateClosePrice(${i},this.value)" style="min-width:105px"></td><td>${yuan(mv)}</td><td>${yuan(p)}</td><td>${percent(r)}</td></tr>`}).join("")||"<tr><td colspan=7>当前无持仓</td></tr>"}</table></div>
 ${holdingDetails(d)}<h3>交易流水</h3><div class="grid"><select id="lg_stock">${opts.map(x=>`<option value="${x.id}">${x.name||"未命名"} ${x.code?"· "+x.code:""}</option>`).join("")}</select><input id="lg_qty" type="number" placeholder="成交股数"><input id="lg_price" type="number" step="0.001" placeholder="成交价"><input id="lg_fee" type="number" step="0.01" placeholder="手续费（可选）"></div><textarea id="lg_note" placeholder="交易备注"></textarea>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="recordLedger('买入')">买入</button><button class="btn" onclick="recordLedger('加仓')">加仓</button><button class="btn" onclick="recordLedger('减仓')">减仓</button><button class="btn danger" onclick="recordLedger('清仓')">清仓</button></div>
 <div class="tableWrap"><table><tr><th>类型</th><th>股票</th><th>股数</th><th>价格</th><th>成交金额</th><th>已实现盈亏</th><th>备注</th><th></th></tr>${(d.ledger||[]).map((x,i)=>`<tr><td>${x.type}</td><td>${x.name||"—"}</td><td>${x.qty}</td><td>${x.price}</td><td>${yuan(x.amount)}</td><td>${yuan(x.realizedPnl)}</td><td>${x.note||"—"}</td><td><button class="btn danger small" onclick="deleteLedger(${i})">撤销</button></td></tr>`).join("")||"<tr><td colspan=8>尚无交易流水</td></tr>"}</table></div>
 <button class="btn" onclick="saveAccountSnapshot()">保存今日账户快照</button>`)
}
function sellPage(d){let s=currentStock(d);return wrap("⑩ 卖出",`<p class="muted">卖出记录是一笔独立交易。选择哪只股票，就自动使用那只股票在⑥个股里设定的交易模式。</p><p class="hint">如果⑥个股里的模式后来改了，不会偷偷改历史交易；历史交易保存自己的模式快照，并可在⑫统计中心人工修正。</p><div class="grid"><div><label>卖出股票</label><select id="sellStock" onchange="syncSellStock(this.value)">${stocksOf(d).map(x=>`<option value="${x.id}" ${(d.sell.stockId===x.id||( !d.sell.stockId && s&&s.id===x.id))?"selected":""}>${x.name||"未命名"} ${x.code?"· "+x.code:""}</option>`).join("")}</select></div><div><label>对应交易模式</label><input id="sellModelPreview" value="${stockModel(d.sell.stockId||(s&&s.id))||"尚未设置"}" disabled></div>${input(d.sell,"sellPrice","卖出价","number")} ${input(d.sell,"returnPct","实际收益率 %","number")}</div>${text(d.sell,"reason","卖出理由")}<button class="btn" onclick="saveTrade()">记录卖出/交易</button><h3>今日已记录交易</h3><div class="tableWrap"><table><tr><th>股票</th><th>模式</th><th>收益</th><th>时间</th></tr>${(d.trades||[]).map(t=>`<tr><td>${t.name||"—"}</td><td>${t.model||"—"}</td><td>${t.returnPct}%</td><td>${t.createdAt?new Date(t.createdAt).toLocaleTimeString():"—"}</td></tr>`).join("")||"<tr><td colspan=4>尚无交易记录</td></tr>"}</table></div>`)}
function syncSellStock(id){let d=day();d.sell.stockId=id;document.getElementById("sellModelPreview").value=stockModel(id)||"尚未设置";save()}
function reviewPage(d){return wrap("⑪ 复盘 + 博主",`<p class="muted">三大复盘柱：定主流板块 → 判情绪时机 → 抓领涨龙头。</p><p class="hint">复盘重点记录：今天做对什么、违反什么、市场最重要的变化，以及明天只做什么/不做什么。博主内容仅手动记录，不自动抓取社交媒体。</p>${text(d.review,"summary","今日复盘总结")}${text(d.review,"sectorSummary","板块复盘总结")}<div class="grid"><div><label>SOP执行情况</label><select data-area="${d.review._id}" data-key="discipline"><option>完整执行</option><option>部分执行</option><option>SOP例外</option></select></div><div><label>主要错误标签</label><input data-area="${d.review._id}" data-key="error" value="${d.review.error||""}"></div></div><h3>关注博主</h3><div class="grid"><input id="bn" placeholder="博主名称"><select id="bv"><option>看多</option><option>中性</option><option>看空</option></select><input id="bsector" placeholder="关注板块/方向"><input id="bchange" placeholder="持仓变化：新进/增仓/减仓/清仓"></div><textarea id="bnote" placeholder="博主观点/复盘备注"></textarea><button class="btn" onclick="addBlogger()">记录博主</button><div class="tableWrap"><table><tr><th>博主</th><th>观点</th><th>方向</th><th>持仓变化</th><th>备注</th></tr>${(d.bloggerLogs||[]).map(x=>`<tr><td>${x.name}</td><td>${x.view}</td><td>${x.sector}</td><td>${x.change}</td><td>${x.note}</td></tr>`).join("")}</table></div>`)}

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function leaderboardPage(d){
 let lb=bindArea(d.leaderboard);
 const inst=(d.leaderboard.institutions||[]).map((x,i)=>`<tr><td>${esc(x.name)||"—"}</td><td>${esc(x.code)||"—"}</td><td>${esc(x.side)||"—"}</td><td>${esc(x.amount)||"—"}</td><td>${esc(x.seat)||"—"}</td><td>${esc(x.note)||"—"}</td><td><button class="btn danger small" onclick="delRank('institutions',${i})">删除</button></td></tr>`).join("")||"<tr><td colspan=7>尚无机构记录</td></tr>";
 const hot=(d.leaderboard.hotMoney||[]).map((x,i)=>`<tr><td>${esc(x.name)||"—"}</td><td>${esc(x.code)||"—"}</td><td>${esc(x.side)||"—"}</td><td>${esc(x.amount)||"—"}</td><td>${esc(x.seat)||"—"}</td><td>${esc(x.note)||"—"}</td><td><button class="btn danger small" onclick="delRank('hotMoney',${i})">删除</button></td></tr>`).join("")||"<tr><td colspan=7>尚无游资记录</td></tr>";
 return wrap("⑬ 龙虎榜复盘",`
 <p class="muted">只做手动记录，不抓取外部数据。把机构、游资、买卖方向、金额和席位特征留下来，用于验证你的买入逻辑和复盘判断。</p>
 <p class="hint">龙虎榜只是辅助证据，不单独构成买入理由。可重点记录：机构净买/净卖、知名游资席位、是否与主流板块/龙头逻辑共振。</p>
 <h3>机构记录</h3>
 <div class="grid"><input id="ri_name" placeholder="股票名称"><input id="ri_code" placeholder="代码"><select id="ri_side"><option>净买入</option><option>净卖出</option><option>买入</option><option>卖出</option><option>混合</option></select><input id="ri_amount" placeholder="金额/净额"><input id="ri_seat" placeholder="机构席位/数量"></div>
 <textarea id="ri_note" placeholder="机构逻辑、与板块/个股关系"></textarea>
 <button class="btn" onclick="addRank('institutions')">＋ 添加机构记录</button>
 <div class="tableWrap"><table><tr><th>股票</th><th>代码</th><th>方向</th><th>金额</th><th>席位</th><th>备注</th><th></th></tr>${inst}</table></div>
 <h3 style="margin-top:18px">游资记录</h3>
 <div class="grid"><input id="rh_name" placeholder="股票名称"><input id="rh_code" placeholder="代码"><select id="rh_side"><option>净买入</option><option>净卖出</option><option>买入</option><option>卖出</option><option>混合</option></select><input id="rh_amount" placeholder="金额/净额"><input id="rh_seat" placeholder="游资/营业部席位"></div>
 <textarea id="rh_note" placeholder="游资特征、席位联动、是否一日游等"></textarea>
 <button class="btn" onclick="addRank('hotMoney')">＋ 添加游资记录</button>
 <div class="tableWrap"><table><tr><th>股票</th><th>代码</th><th>方向</th><th>金额</th><th>席位</th><th>备注</th><th></th></tr>${hot}</table></div>
 ${text(lb,"notes","龙虎榜总复盘","例如：机构与游资是否同向；是否强化/削弱原交易逻辑。")}
 <button class="btn" onclick="save();showToast('龙虎榜复盘已保存')">保存</button>`);
}
function addRank(kind){
 let d=day(), p=kind==="institutions"?"ri":"rh";
 let item={id:id(),name:document.getElementById(p+"_name").value,code:document.getElementById(p+"_code").value,side:document.getElementById(p+"_side").value,amount:document.getElementById(p+"_amount").value,seat:document.getElementById(p+"_seat").value,note:document.getElementById(p+"_note").value,date:d.date};
 d.leaderboard[kind].push(item); save(); render(); showToast("龙虎榜记录已添加");
}
function delRank(kind,i){let d=day();d.leaderboard[kind].splice(i,1);save();render();}

function statsPage(){
 try{
   var trades=[], ledgers=[], bloggers=[];
   for(var di=0;di<state.days.length;di++){
     var dd=state.days[di]||{};
     var dt=Array.isArray(dd.trades)?dd.trades:[];
     for(var ti=0;ti<dt.length;ti++) trades.push({d:dd,t:dt[ti]||{},i:ti});
     var dl=Array.isArray(dd.ledger)?dd.ledger:[];
     for(var li=0;li<dl.length;li++) ledgers.push(dl[li]||{});
     var db=Array.isArray(dd.bloggerLogs)?dd.bloggerLogs:[];
     for(var bi=0;bi<db.length;bi++) bloggers.push(db[bi]||{});
   }

   var measured=trades.filter(x=>nullable(x.t.returnPct)!==null);
   var wins=0,sumReturn=0;
   for(var i=0;i<measured.length;i++){
     var rv=Number(measured[i].t.returnPct);
     if(!Number.isFinite(rv))rv=0;
     sumReturn+=rv;if(rv>0)wins++;
   }
   var avg=measured.length?sumReturn/measured.length:0;

   var rows=[];
   for(var mi=0;mi<models.length;mi++){
     var model=models[mi],count=0,w=0,sum=0,minLoss=null;
     for(var j=0;j<trades.length;j++){
       var t=trades[j].t;
       if((t.model||"")===model&&nullable(t.returnPct)!==null){
         count++;
         var r=Number(t.returnPct);if(!Number.isFinite(r))r=0;
         sum+=r;if(r>0)w++;if(r<0&&(minLoss===null||r<minLoss))minLoss=r;
       }
     }
     rows.push({m:model,n:count,wr:count?w/count*100:0,av:count?sum/count:0,ml:minLoss===null?0:minLoss});
   }

   var points=equityPoints();
   var last=points.length?points[points.length-1]:null;
   var realized=0,turnover=0;
   for(var k=0;k<ledgers.length;k++){
     realized+=n(ledgers[k].realizedPnl);
     turnover+=n(ledgers[k].amount);
   }

   var bm=Object.create(null);
   for(var b=0;b<bloggers.length;b++){
     var x=bloggers[b],name=x.name||"未命名";
     if(!bm[name])bm[name]={n:0,bull:0};
     bm[name].n++;
     if(x.view==="看多")bm[name].bull++;
   }

   var historyRows="";
   for(var h=0;h<trades.length;h++){
     var rec=trades[h],d=rec.d||{},t=rec.t||{},idx=rec.i;
     var dayId=String(d.id||"").replace(/'/g,"&#39;");
     var tid=String(t.id||"").replace(/'/g,"&#39;");
     var opts="";
     for(var om=0;om<models.length;om++){
       opts+='<option '+((t.model||"")===models[om]?'selected':'')+'>'+models[om]+'</option>';
     }
     var rr=nullable(t.returnPct)??'';
     historyRows+='<tr><td>'+(d.date||"—")+'</td><td>'+(t.name||"—")+'</td><td><select onchange="changeTradeModelById(\''+dayId+'\',\''+tid+'\',this.value,'+idx+')">'+opts+'</select></td><td><input type="number" step="0.01" value="'+rr+'" onchange="changeTradeReturnById(\''+dayId+'\',\''+tid+'\',this.value,'+idx+')" style="min-width:110px"></td><td><button class="btn danger small" onclick="deleteTradeById(\''+dayId+'\',\''+tid+'\','+idx+')">删除</button></td></tr>';
   }
   if(!historyRows)historyRows='<tr><td colspan="5">尚无交易记录</td></tr>';

   var bloggerRows="";
   var names=Object.keys(bm);
   for(var bn=0;bn<names.length;bn++){
     var nm=names[bn],bx=bm[nm];
     bloggerRows+='<tr><td>'+nm+'</td><td>'+bx.n+'</td><td>'+bx.bull+'</td><td>本地历史</td></tr>';
   }
   if(!bloggerRows)bloggerRows='<tr><td colspan="4">尚无记录</td></tr>';

   return wrap("⑫ 统计中心",
     '<p class="muted">V4.0：历史交易按实际记录统计；账户曲线使用已保存快照。</p>'+
     '<h3>账户收益</h3>'+
     '<div class="grid">'+
       '<div class="card"><div class="stat">'+(last?yuan(last.equity):"—")+'</div><div class="muted">最新账户权益</div></div>'+
       '<div class="card"><div class="stat">'+(last?percent(last.ret):"—")+'</div><div class="muted">累计账户收益率</div></div>'+
       '<div class="card"><div class="stat">'+yuan(realized)+'</div><div class="muted">累计已实现盈亏</div></div>'+
       '<div class="card"><div class="stat">'+yuan(turnover)+'</div><div class="muted">累计成交金额</div></div>'+
     '</div>'+
     '<h3>账户权益曲线</h3>'+equityChart()+
     '<h3>交易质量</h3>'+
     '<div class="grid">'+
       '<div class="card"><div class="stat">'+trades.length+'</div><div class="muted">交易笔数</div></div>'+
       '<div class="card"><div class="stat">'+(measured.length?(wins/measured.length*100).toFixed(1):"0")+'%</div><div class="muted">胜率（已填收益率）</div></div>'+
       '<div class="card"><div class="stat">'+avg.toFixed(2)+'%</div><div class="muted">平均单笔收益</div></div>'+
       '<div class="card"><div class="stat">'+state.days.length+'</div><div class="muted">交易日</div></div>'+
     '</div>'+
     '<h3>交易模式统计</h3><div class="tableWrap"><table class="statsTable"><tr><th>交易模式</th><th>样本数</th><th>胜率</th><th>平均收益</th><th>最大单笔亏损</th></tr>'+
       rows.map(function(x){return '<tr><td><b>'+x.m+'</b></td><td>'+x.n+'</td><td>'+x.wr.toFixed(1)+'%</td><td>'+x.av.toFixed(2)+'%</td><td>'+(x.n?x.ml.toFixed(2)+'%':'—')+'</td></tr>'}).join("")+
     '</table></div>'+
     '<h3>历史交易 · 可编辑 / 删除</h3><p class="hint">实际收益率和模式都可以修正，误录交易可以删除。</p><div class="tableWrap"><table><tr><th>日期</th><th>股票</th><th>当前模式</th><th>实际收益率 %</th><th>操作</th></tr>'+historyRows+'</table></div>'+
     '<h3>博主持仓/观点统计</h3><div class="tableWrap"><table><tr><th>博主</th><th>记录次数</th><th>看多次数</th><th>最近记录</th></tr>'+bloggerRows+'</table></div>'
   );
 }catch(err){
   console.error("TradeOS stats error",err);
   return wrap("⑫ 统计中心",
     '<p class="hint">统计页检测到一条旧数据格式异常，但页面不会再卡死。</p>'+
     '<div class="card"><b>错误信息：</b> '+String(err&&err.message?err.message:err)+'</div>'+
     '<p class="muted">你可以先导出 JSON 备份；把错误信息发给我，我可以继续针对那条旧记录修复。</p>'
   );
 }
}
function changeTradeModelByIndex(dayId,i,val){let d=state.days.find(x=>x.id===dayId);if(d&&d.trades[i]){d.trades[i].model=val;d.trades[i].modelEdited=true;save();showToast('交易模式已修正');render()}}
function changeTradeModelById(dayId,tid,val,i){let d=state.days.find(x=>x.id===dayId);let t=tid?d?.trades?.find(x=>x.id===tid):d?.trades?.[i];if(t){t.model=val;t.modelEdited=true;save();showToast('交易模式已修正');render()}}
function changeTradeReturnById(dayId,tid,val,i){let d=state.days.find(x=>x.id===dayId);let t=tid?d?.trades?.find(x=>x.id===tid):d?.trades?.[i];if(t){t.returnPct=(val===""||val==null)?null:Number(val);t.returnEdited=true;save();showToast("实际收益率已修正");render()}}
function deleteTradeById(dayId,tid,i){let d=state.days.find(x=>x.id===dayId);if(!d)return;let idx=tid?d.trades.findIndex(x=>x.id===tid):i;if(idx>=0&&confirm("确定删除这笔交易记录吗？删除后统计会重新计算。")){d.trades.splice(idx,1);save();showToast("交易记录已删除");render()}}
function bind(){
 const d=day();if(!d)return;
 const targets=[d.macro,d.market,d.trend,d.emotion,d.sector,d.buy,d.position,d.review,d.sell,d.leaderboard,d.account,d.aiPlan,...d.holdings,...d.stocks.flatMap(s=>[s,s.buy,s.position])];
 document.querySelectorAll('[data-area]').forEach(e=>{
  const o=targets.find(x=>x&&x._id===e.dataset.area);if(!o)return;
  if(e.tagName==='SELECT')e.value=o[e.dataset.key]??'';
  const handler=()=>{

   o[e.dataset.key]=e.type==='checkbox'?e.checked:e.value;o.updatedAt=new Date().toISOString();save();
   if(o===d.market&&e.dataset.key==='volumeRatio')updateVolumeDisplay(o);
};
  e.addEventListener(e.tagName==='SELECT'||e.type==='checkbox'?'change':'input',handler);
  e.addEventListener('change',()=>{const owner=d.stocks.find(st=>o===st.buy||o===st.position||(o===st&&e.dataset.key==='model'));if(owner){owner.planHistory=owner.planHistory||[];const next=planOf(owner);if(JSON.stringify(owner.planHistory.at(-1)?.plan)!==JSON.stringify(next)){owner.planHistory.push({changedAt:new Date().toISOString(),plan:next,reason:owner.buy.changeReason||null});save()}}});
 });
}

function addHolding(){let d=day(),s=currentStock(d);if(!s){showToast("请先选择股票");return}d.holdings=d.holdings||[];d.holdings.push({id:id(),stockId:s.id,name:s.name||"",code:s.code||"",qty:hq.value,cost:hc.value,price:hp.value});save();render()}
function delHolding(i){day().holdings.splice(i,1);save();render()}
function addBlogger(){let d=day();d.bloggerLogs.push({name:bn.value,view:bv.value,sector:bsector.value,change:bchange.value,note:bnote.value,date:d.date});save();render()}
function saveTrade(){
 let d=day(),sid=document.getElementById("sellStock")?.value||d.sell.stockId||(currentStock(d)&&currentStock(d).id),s=stocksOf(d).find(x=>x.id===sid);
 if(!s){showToast("请先在⑥个股添加股票");return}
 let rp=document.querySelector('[data-area="'+d.sell._id+'"][data-key="returnPct"]');
 let sp=document.querySelector('[data-area="'+d.sell._id+'"][data-key="sellPrice"]');
 let rr=document.querySelector('[data-area="'+d.sell._id+'"][data-key="reason"]');
 d.sell.stockId=sid;
 if(rp)d.sell.returnPct=rp.value;
 if(sp)d.sell.sellPrice=sp.value;
 if(rr)d.sell.reason=rr.value;
 let val=d.sell.returnPct;
 d.trades.push({id:id(),date:d.date,stockId:s.id,name:s.name||"",code:s.code||"",model:s.model||"",modelSource:"stock",returnPct:(val===""||val==null)?null:Number(val),sellPrice:d.sell.sellPrice||"",reason:d.sell.reason||"",createdAt:new Date().toISOString()});
 save();showToast("交易已记录");render()
}
function normalizeDay(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('交易日必须为对象');
 const d=clone(raw);d.id=d.id||id();d.date=d.date||today();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date))||new Date(d.date).toISOString().slice(0,10)!==d.date)throw Error('无效日期：'+d.date);
 d.createdAt=d.createdAt||null;d.updatedAt=d.updatedAt||null;
 for(const k of ['macro','market','trend','emotion','sector','buy','position','sell','review','account','accountSnapshot','leaderboard','aiPlan'])d[k]=object(d[k]);
 for(const k of ['stocks','holdings','ledger','trades','bloggerLogs']){
  if(d[k]!=null&&!Array.isArray(d[k]))throw Error(k+' 应为数组');
  d[k]=(d[k]||[]).filter(x=>x&&typeof x==='object');
 }
 for(const k of ['candidatePool','executionDecisions']){
  if(d[k]!=null&&!Array.isArray(d[k]))throw Error(k+' 应为数组');
  d[k]=(d[k]||[]).filter(x=>x&&typeof x==='object');
 }
 if(!d.stocks.length&&d.stock&&Object.keys(d.stock).some(k=>k!=='_id'&&d.stock[k]))d.stocks=[{...d.stock,buy:clone(d.buy),position:clone(d.position)}];
 d.stocks.forEach(st=>{st.id=st.id||id();st.buy=object(st.buy);st.position=object(st.position);st.model=st.model||st.buy.model||''});
 d.currentStockId=d.currentStockId||d.stocks[0]?.id||null;
 for(const h of d.holdings){
  const match=d.stocks.filter(st=>(h.stockId&&st.id===h.stockId)||(h.code&&st.code===h.code)||(!h.code&&h.name&&st.name===h.name));
  const st=match.length===1?match[0]:null;
  h.id=h.id||id();h.stockId=h.stockId||st?.id||id();h.code=h.code||st?.code||'';
  if(!h.originalPlan)h.originalPlan=null;
 }
 d.trades.forEach(t=>{t.id=t.id||id()});
 for(const k of ['institutions','hotMoney'])d.leaderboard[k]=Array.isArray(d.leaderboard[k])?d.leaderboard[k]:[];
 if(!d.market.volumeEnergyRuleVersion){
  const oldVolumeRule=d.market.lowVolumeRuleVersion||Object.hasOwn(d.market,'avg5Amount')||Object.hasOwn(d.market,'lowVolumePct')||Object.hasOwn(d.market,'b4');
  if(oldVolumeRule){d.market.legacyLowVolumeFlag=d.market.b1??d.market.legacyLowVolumeFlag;d.market.b1=d.market.b2??false;d.market.b2=d.market.b3??false;d.market.b3=d.market.b4??false;delete d.market.b4}
  d.market.volumeEnergyRuleVersion=1;
 }
 const bindingIds=new Set();
 for(const o of [d.macro,d.market,d.trend,d.emotion,d.sector,d.buy,d.position,d.sell,d.review,d.account,d.leaderboard,d.aiPlan,...d.holdings,...d.stocks.flatMap(st=>[st,st.buy,st.position])]){
  if(!o._id||bindingIds.has(o._id))o._id=id();bindingIds.add(o._id);
 }
 return d;
}

function migratePayload(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||p.meta?.schemaVersion)throw Error('请选择完整备份，AI分析文件不能用于恢复');
 if(p.dataSchemaVersion>2)throw Error('该备份来自更高数据版本，请勿降级导入');
 for(const k of ['setupLibrary','tradeCases','disciplineChallenges','auditEvents'])if(p[k]!=null&&!Array.isArray(p[k]))throw Error(k+' 应为数组，原数据未覆盖');
 p=clone(p);
 let raw;
 if(Array.isArray(p.days))raw=p.days;
 else if(p.current||Array.isArray(p.archive))raw=[...(p.current?[p.current]:[]),...(p.archive||[])];
 else if(p.date&&['market','holdings','stock','stocks','review'].some(k=>k in p))raw=[p];
 else throw Error('未识别的备份结构');
 const byDate=new Map(),duplicates=clone(p.duplicateArchive||[]);
 for(const item of raw){const d=normalizeDay(item);if(byDate.has(d.date)){
  const old=byDate.get(d.date);duplicates.push({date:d.date,records:[clone(old),clone(d)]});
  byDate.set(d.date,mergeDay(old,d));
 }else byDate.set(d.date,d)}
 const days=[...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));
 const ids=new Set();days.forEach(d=>{if(ids.has(d.id))d.id=id();ids.add(d.id)});
 const next={...p,version:'4.0',dataSchemaVersion:2,days,bloggers:Array.isArray(p.bloggers)?p.bloggers:[],duplicateArchive:duplicates};
 next.setupLibrary=Array.isArray(p.setupLibrary)?p.setupLibrary:models.map((name,i)=>({id:'legacy-setup-'+(i+1),name,type:name.includes('龙头')?'龙头战法':'传统模式',status:'legacy_needs_definition',currentVersion:1,createdAt:new Date().toISOString(),versions:[{version:1,effectiveAt:new Date().toISOString(),marketConditions:'',emotionPhases:[],sectorConditions:'',stockRoleConditions:'',priceVolumeConditions:'',intradayConditions:'',entryTriggers:[],forbiddenConditions:[],initialPositionPct:null,maxPositionPct:null,addPositionConditions:'',invalidationConditions:'',exitRules:'',fastChecks:[],historicalCases:[],notes:'由旧交易模式自动建立，尚未补充完整规则。'}]}));
 next.tradeCases=Array.isArray(p.tradeCases)?p.tradeCases:[];
 next.disciplineChallenges=Array.isArray(p.disciplineChallenges)?p.disciplineChallenges:[];
 next.settings={experimentMaxPositionPct:5,experimentPromotionCases:5,...object(p.settings)};
 next.days.forEach(d=>{d.stocks.forEach(st=>{if(!st.setupId){const setup=next.setupLibrary.find(x=>x.name===st.model);if(setup)st.setupId=setup.id}});d.trades.forEach(t=>{if(!t.classification)t.classification='legacy_unclassified'})});
 return migrateV4(next);
}

function exportData(){downloadJSON({...state,version:'4.0',dataSchemaVersion:2,exportedAt:new Date().toISOString()},'TradeOS-backup-'+today()+'.json')}

function importData(){
 const i=document.createElement('input');i.type='file';i.accept='.json';
 i.onchange=async()=>{if(!i.files[0])return;try{
  const next=migratePayload(JSON.parse(await i.files[0].text()));
  if(!confirm('导入将替换当前全部记录。是否继续？当前数据会另存为本机恢复副本。'))return;
  localStorage.setItem('tradeos_before_import',JSON.stringify(state));
  const old=state;state=next;selectedDayId=state.days[0]?.id||null;
  if(!save()){state=old;return}render();showToast('导入成功；同日重复记录已合并，原记录保留在完整备份中');
 }catch(e){alert('导入失败，原数据保留：'+e.message)}};i.click();
}

function clone(x){return JSON.parse(JSON.stringify(x))}
function object(x){return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function nullable(v){return v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null)}
function clean(x){
 if(Array.isArray(x))return x.map(clean);
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).filter(([k])=>!['_id','_editBatch','currentStockId','__name','undoBefore','undoAfter','researchBefore','researchAfter'].includes(k)).map(([k,v])=>[k,clean(v)]));
 return x===''?null:x;
}
function mergeDay(a,b){
 // Input order is authoritative. Preserve all conflicting originals in duplicateArchive.
 function merge(x,y){
  if(x==null||x==='')return clone(y);
  if(Array.isArray(x)&&Array.isArray(y)){
   const seen=new Set();return [...x,...y].filter(v=>{let k=JSON.stringify(clean(v),(key,value)=>key==='id'?undefined:value);if(seen.has(k))return false;seen.add(k);return true});
  }
  if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)&&!Array.isArray(y)){
   const out=clone(x);for(const k of Object.keys(y))out[k]=k in out?merge(out[k],y[k]):clone(y[k]);return out;
  }
  return x;
 }
 const d=merge(a,b);d.id=a.id;
 for(const key of ['candidatePool','executionDecisions']){
  const items=new Map();[...(a[key]||[]),...(b[key]||[])].forEach(x=>{const k=x.id||JSON.stringify(x);if(!items.has(k))items.set(k,clone(x))});d[key]=[...items.values()];
 }
 // Holdings are account snapshots, never concatenate two snapshots of the same date.
 d.holdings=clone(a.holdings.length?a.holdings:b.holdings);
 d.stocks=clone(a.stocks);
 for(const st of b.stocks){const old=d.stocks.find(x=>x.id===st.id||(x.code&&x.code===st.code));if(!old)d.stocks.push(clone(st))}
 return normalizeDay(d);
}
function downloadJSON(payload,name){
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function deleteDay(dayId){
 const d=state.days.find(d=>d.id===dayId);if(!d)return;
 if(d.executionDecisions?.length||d.ledger.some(l=>l.tradeCaseId)){showToast('该日包含锁定票据或关联案例，不直接删除；请保留研究链，误记流水用撤销');return}
 if(!confirm('删除 '+d.date+' 的全部记录？其他日期的持仓快照不会联动修改。'))return;
 if(!confirm('再次确认删除？建议先导出完整备份。'))return;
 state.days=state.days.filter(d=>d.id!==dayId);selectedDayId=state.days[0]?.id||null;save();render();
}
function changeDate(value){
 const d=day();if(!value||value===d.date)return;
 if(state.days.some(x=>x.date===value)){showToast('该日期已有档案，请从历史记录打开');render();return}
 if(d.ledger.length||d.trades.length){showToast('已有交易流水的档案不能改日期');render();return}
 d.date=value;state.days.sort((a,b)=>b.date.localeCompare(a.date));save();render();
}
function dayPage(d){
 const o=bindArea(d.aiPlan);
 return wrap('交易日档案 · V4.0',`
 <section class="homeDate"><div><label>当前交易日（北京时间）</label><input type="date" value="${d.date}" onchange="changeDate(this.value)"></div><div class="homeDateActions"><button class="btn" onclick="newDay()">＋新建／打开今日</button><button class="btn alt" onclick="prevDay()">← 上一天</button><button class="btn alt" onclick="nextDay()">下一天 →</button></div></section>
 <div class="metaStrip"><span>创建：${esc(d.createdAt?new Date(d.createdAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'旧档案未记录')}</span><span>最近保存：${esc(d.updatedAt?new Date(d.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'尚未记录')}</span></div>
 <section class="homePanel"><h3>AI 分析 JSON</h3><p class="hint">选择分析时段和数据时间后导出。仓位与亏损上限移到⑧仓位统一维护。</p><div class="twoCol">${select(o,'session','分析时段',['盘前','盘中','盘后'])}${input(o,'asOf','本次数据截至（北京时间）','datetime-local')}</div>${text(o,'questions','想让 AI 回答的问题')}<button class="btn" onclick="exportAI()">导出 AI 分析 JSON</button></section>
 <details class="dataTools"><summary>数据管理（备份／导入）</summary><p class="hint">公开 GitHub 仓库不要上传导出的 JSON。</p><button class="btn alt" onclick="exportData()">导出完整备份</button><button class="btn alt" onclick="importData()">导入完整备份</button></details>
 <h3>历史交易日</h3><div class="tableWrap"><table><tr><th>日期</th><th>情绪</th><th>市场判断</th><th>交易笔数</th><th>操作</th></tr>${state.days.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.emotion.phase||'—')}</td><td>${esc(x.market.final||'—')}</td><td>${x.trades.length}</td><td><button class="btn small" onclick="selectDay('${x.id}')">查看</button><button class="btn danger small" onclick="deleteDay('${x.id}')">删除</button></td></tr>`).join('')}</table></div>`);
}
function dashboardWarnings(d,s){
 const out=[],m=d.market||{},phase=d.emotion.phase||'',limit=nullable(d.aiPlan.maxPositionPct);
 if(!m.final)out.push({level:'warn',text:'尚未填写最终市场状态'});
 const energy=volumeEnergy(m);if(energy.value!==null&&energy.value<1)out.push({level:'warn',text:'量能不足，谨慎追高，等待回踩确认'});
 if(['退潮','冰点'].includes(phase))out.push({level:'bad',text:'情绪处于'+phase+'，按SOP不应新开仓'});
 const riskLabels={tech:'科技板块集体大跌',stagnant:'高量滞涨',up800:'上涨家数少于800',kill:'高位人气票批量跌停'};
 Object.keys(riskLabels).forEach(k=>{if(m[k])out.push({level:'bad',text:riskLabels[k]})});
 if(limit!==null&&nullable(s.positionPct)!==null&&s.positionPct>limit)out.push({level:'bad',text:'当前仓位 '+s.positionPct.toFixed(1)+'% 已超过今日上限 '+limit+'%'});
 (d.holdings||[]).forEach(h=>{const name=h.name||h.code||'未命名持仓';if(nullable(h.price)===null)out.push({level:'warn',text:name+' 缺少最新价格'});if(nullable(h.availableQty)===null)out.push({level:'warn',text:name+' 尚未核对可卖数量'});const st=d.stocks.find(x=>x.id===h.stockId);if(nullable(st?.buy?.planStop)===null)out.push({level:'warn',text:name+' 尚未设置当前止损'});});
 if(!d.aiPlan.actions)out.push({level:'warn',text:'尚未填写账户待执行计划'});
 if(stocksOf(d).length&&!d.sector.name)out.push({level:'warn',text:'已有候选股，但主流板块尚未确认'});
 stocksOf(d).forEach(st=>{const name=st.name||st.code||'未命名候选股';if(nullable(st.hot)!==null&&nullable(st.hot)>100)out.push({level:'warn',text:name+' 热度排名超过100，谨慎作为核心候选'});if(!st.model)out.push({level:'warn',text:name+' 尚未选择交易模式'});if(!st.buy.invalidWhen)out.push({level:'warn',text:name+' 尚未写明计划失效条件'})});
 return out;
}
function dailyMotto(d){const key=d?.date||today();return DISCIPLINE_MOTTOS[[...key].reduce((n,c)=>n+c.charCodeAt(0),0)%DISCIPLINE_MOTTOS.length]}
function dashboardPage(d){
 const s=recomputeAccount(d),energy=volumeEnergy(d.market),warnings=dashboardWarnings(d,s),fresh=d.aiPlan.asOf||d.market.asOf||'',ready=[d.market.final,d.emotion.phase,d.sector.name,d.aiPlan.actions].filter(Boolean).length;
 const holdings=(d.holdings||[]).map(h=>{const st=d.stocks.find(x=>x.id===h.stockId),price=nullable(h.price),cost=nullable(h.cost),ret=cost>0&&price!==null?(price-cost)/cost*100:null,plan=planOf(st);return `<tr><td><b>${esc(h.name||'—')}</b><small>${esc(h.code||'')}</small></td><td>${percent(ret)}</td><td>${nullable(h.availableQty)===null?'待核对':esc(h.availableQty)}</td><td>${plan?.stopLoss??'—'}</td><td>${plan?.takeProfit??'—'}</td><td>${esc(h.assessment||'—')}</td><td>${esc(h.adviceStatus||'—')}</td></tr>`}).join('')||'<tr><td colspan="7">当前无持仓</td></tr>';
 const watch=stocksOf(d).map(st=>{const p=planOf(st),qualified=st.top100&&st.model&&nullable(st.buy.price)!==null&&nullable(st.buy.planStop)!==null;return `<tr><td><b>${esc(st.name||'未命名')}</b><small>${esc(st.code||'')}</small></td><td>${esc(st.model||'—')}</td><td>${esc(st.buy.phase||'—')}</td><td>${p?.entry??'—'}</td><td>${p?.stopLoss??'—'}</td><td>${p?.positionPct??'—'}${p?.positionPct!==null?'%':''}</td><td><span class="pill ${qualified?'ok':'warn'}">${qualified?'计划较完整':'待补充'}</span></td></tr>`}).join('')||'<tr><td colspan="7">尚无候选股</td></tr>';
 const riskList=warnings.length?warnings.map(x=>`<li class="${x.level}">${esc(x.text)}</li>`).join(''):'<li class="ok">当前没有从已填写数据中识别到明显警报</li>';
 return `<section class="dashboardHero"><div><p class="eyebrow">TODAY · ${esc(d.date)}</p><h2>今日交易驾驶舱</h2><p>把盘中真正需要看的内容集中在这里；数据来自各SOP页面，不需要重复填写。</p></div><div class="readiness"><strong>${ready}/4</strong><span>核心信息完整度</span></div></section>
 <div class="dashboardMetrics"><div class="dashMetric"><span>市场状态</span><strong>${esc(d.market.final||'待判断')}</strong></div><div class="dashMetric"><span>情绪阶段</span><strong>${esc(d.emotion.phase||'待判断')}</strong></div><div class="dashMetric"><span>量能</span><strong>${energy.value===null?'—':energy.value+' · '+energy.label}</strong></div><div class="dashMetric"><span>总仓位</span><strong>${percent(s.positionPct)}</strong></div><div class="dashMetric"><span>账户权益</span><strong>${yuan(s.equity)}</strong></div><div class="dashMetric"><span>可用现金</span><strong>${yuan(s.cash)}</strong></div></div>
 <div class="dashboardColumns"><section class="card"><div class="sectionHead"><h2>今日结论与行动</h2><button class="btn alt small" onclick="goStep(0)">编辑计划</button></div><div class="dashText"><label>市场预期</label><p>${esc(d.aiPlan.expectation||'尚未填写')}</p></div><div class="dashText actionText"><label>待执行计划</label><p>${esc(d.aiPlan.actions||'尚未填写')}</p></div><div class="dashText"><label>主流板块</label><p>${esc(d.sector.name||'尚未确定')} ${d.sector.continuity?'· '+esc(d.sector.continuity):''}</p></div><small>数据截至：${esc(fresh||'尚未填写')}</small></section><section class="card"><div class="sectionHead"><h2>风险雷达</h2><button class="btn alt small" onclick="goStep(3)">检查大盘</button></div><ul class="riskList">${riskList}</ul></section></div>
 ${wrap('持仓处理 · '+(d.holdings||[]).length+'只',`<div class="sectionHead"><p class="hint">收益和仓位按最新手动价格计算；具体动作仍以预案触发条件为准。</p><button class="btn alt small" onclick="goStep(10)">更新持仓</button></div><div class="tableWrap"><table><tr><th>持仓</th><th>浮盈亏</th><th>可卖</th><th>止损</th><th>止盈</th><th>当前判断</th><th>AI建议</th></tr>${holdings}</table></div>`)}
 ${wrap('候选计划 · '+stocksOf(d).length+'只',`<div class="sectionHead"><p class="hint">“计划较完整”只表示基础字段齐全，不代表已经触发买点。</p><button class="btn alt small" onclick="goStep(7)">管理候选股</button></div><div class="tableWrap"><table><tr><th>股票</th><th>模式</th><th>阶段</th><th>计划买入</th><th>止损</th><th>仓位</th><th>完整度</th></tr>${watch}</table></div>`)}
 <section class="card quickNav"><h2>快速进入</h2><div class="row"><button class="btn alt" onclick="goStep(3)">大盘判断</button><button class="btn alt" onclick="goStep(5)">情绪周期</button><button class="btn alt" onclick="goStep(8)">买点计划</button><button class="btn alt" onclick="goStep(10)">持仓流水</button><button class="btn alt" onclick="goStep(12)">盘后复盘</button></div></section>`;
}
function volumeEnergy(m){
 const value=nullable(m.volumeRatio);
 if(value===null||value<0)return {value:null,state:'unknown',label:'待填写',statusClass:'isUnknown'};
 if(value<1)return {value,state:'contracting',label:'缩量',statusClass:'isContracting'};
 if(value===1)return {value,state:'flat',label:'平量',statusClass:'isFlat'};
 return {value,state:'expanding',label:'放量',statusClass:'isExpanding'};
}
function volumeEnergyUI(o){
 const r=volumeEnergy(o);
 return `<div id="volumeStatus" class="volumeStatus ${r.statusClass}"><span id="volumeValue" class="volumeValue">${r.value===null?'—':r.value}</span><div><b id="volumeLabel">${r.label}</b><small id="volumeHint">${r.value===null?'填写量能后自动判断':r.value<1?'量能＜1，属于缩量环境':r.value===1?'量能＝1，与基准持平':'量能＞1，属于放量环境'}</small></div></div>`;
}
function updateVolumeDisplay(o){
 const r=volumeEnergy(o),status=document.getElementById('volumeStatus'),value=document.getElementById('volumeValue'),label=document.getElementById('volumeLabel'),hint=document.getElementById('volumeHint'),check=document.getElementById('autoLowVolume'),icon=document.getElementById('autoLowVolumeIcon'),note=document.getElementById('autoLowVolumeNote');
 if(status){status.className='volumeStatus '+r.statusClass}if(value)value.textContent=r.value===null?'—':r.value;if(label)label.textContent=r.label;if(hint)hint.textContent=r.value===null?'填写量能后自动判断':r.value<1?'量能＜1，属于缩量环境':r.value===1?'量能＝1，与基准持平':'量能＞1，属于放量环境';
 if(check)check.className='check autoCheck '+r.statusClass;if(icon)icon.textContent=r.value===null?'○':r.value<1?'✓':'—';if(note)note.textContent=r.value===null?'填写量能后自动判断':r.value<1?'已满足二类行情的缩量条件':'当前未满足缩量条件';
}
function planOf(s){return s?{tradeMode:s.model||null,buyReason:s.buy.notes||null,entry:nullable(s.buy.price),stopLoss:nullable(s.buy.planStop),takeProfit:nullable(s.buy.takeProfit),positionPct:nullable(s.position.plan),invalidWhen:s.buy.invalidWhen||null,pendingActions:s.buy.pendingActions||null}:null}
function holdingDetails(d){
 return d.holdings.map(h=>{bindArea(h);return `<div class="card"><h3>${esc(h.name||h.code||'持仓')} · 计划与价格时间</h3><div class="grid">${input(h,'availableQty','当前可卖数量（未知留空）','number')}${input(h,'priceAsOf','价格截至（北京时间）','datetime-local')}${input(h,'previousClose','上一交易日收盘价','number')}${input(h,'sector','所属板块')}</div><p class="hint">最初买入计划：${h.originalPlan?'已锁定建仓快照':'旧记录缺失，未自动推断'}。当前计划在⑥～⑧维护。</p>${text(h,'assessment','当前持仓判断')}${text(h,'lastAdvice','最近一次 AI 建议（手动粘贴，可选）')}${select(h,'adviceStatus','建议状态',['未采纳','已采纳','已失效'])}</div>`}).join('');
}
function timestamp(v){return v?(v.includes('Z')||/[+-]\d\d:\d\d$/.test(v)?v:v+':00+08:00'):null}
function buildAI(d){
 const a=d.account,missing=[],market=clean(d.market),cash=nullable(a.cash);
 for(const key of ['amount','avg5Amount','lowVolumePct','amountBasis','lowVolumeRuleVersion','legacyLowVolumeFlag','volumeEnergyRuleVersion'])delete market[key];
 const knownPrices=d.holdings.every(h=>nullable(h.qty)!==null&&nullable(h.price)!==null);
 const mv=knownPrices?holdingCalc(d).marketValue:null,equity=mv!==null&&cash!==null?mv+cash:null;
 if(cash===null)missing.push('account.cash');if(!d.aiPlan.asOf)missing.push('meta.dataAsOf');
 const snapshot={meta:{schemaVersion:'1.1',appVersion:'3.1',exportId:id(),exportType:'analysis_snapshot',tradeDate:d.date,exportedAt:new Date().toISOString(),timezone:'Asia/Shanghai',session:({'盘前':'pre_market','盘中':'intraday','盘后':'post_market'})[d.aiPlan.session]||null,dataAsOf:timestamp(d.aiPlan.asOf),units:{money:'CNY',quantity:'shares',percentage:'35 means 35%'},source:'manual_records_and_calculations',requestType:'full_analysis'},
 account:{cash,totalEquity:equity,totalPositionPct:equity>0?mv/equity*100:null,availableCashPct:equity>0?cash/equity*100:null,maxPositionPctToday:nullable(d.aiPlan.maxPositionPct),maxAcceptableLossPctToday:nullable(d.aiPlan.maxLossPct)},
 macro:clean(d.macro),market:{userAssessment:market,asOf:timestamp(d.market.asOf),derived:{volumeEnergy:volumeEnergy(d.market)}},trend:clean(d.trend),emotion:clean(d.emotion),sectors:[clean(d.sector)],
 holdings:d.holdings.map(h=>{
  const st=d.stocks.find(s=>s.id===h.stockId),price=nullable(h.price),cost=nullable(h.cost),qty=nullable(h.qty);
  if(!h.originalPlan)missing.push('holdings.'+h.id+'.originalPlan');if(!h.priceAsOf)missing.push('holdings.'+h.id+'.priceAsOf');
  return {holdingId:h.id,stockId:h.stockId,symbol:h.code||null,exchange:h.exchange||null,name:h.name||null,sector:h.sector||null,quantity:qty,availableQuantity:nullable(h.availableQty),cost,recordedPrice:price,priceAsOf:timestamp(h.priceAsOf),previousClose:nullable(h.previousClose),positionPct:equity>0&&price!==null&&qty!==null?price*qty/equity*100:null,unrealizedReturnPct:cost>0&&price!==null?(price-cost)/cost*100:null,originalPlan:clean(h.originalPlan),currentPlan:planOf(st),planHistory:clean(st?.planHistory||[]),currentAssessment:h.assessment||null,lastAdvice:h.lastAdvice?{text:h.lastAdvice,status:h.adviceStatus||null,recordUpdatedAt:h.updatedAt||null}:null};
 }),watchlist:d.stocks.map(st=>({stockId:st.id,symbol:st.code||null,name:st.name||null,heatRank:nullable(st.hot),tradeMode:st.model||null,cycleStage:st.buy.phase||null,plan:planOf(st),userAssessment:st.notes||null})),
 transactions:clean(d.ledger),closedTradeReviews:clean(d.trades),auxiliaryInformation:{institutions:clean(d.leaderboard.institutions),hotMoney:clean(d.leaderboard.hotMoney),bloggerPositions:clean(d.bloggerLogs)},userPlan:{marketExpectation:d.aiPlan.expectation||null,plannedActions:d.aiPlan.actions||null,questionsForAI:d.aiPlan.questions||null},review:clean(d.review),dataQuality:{missingFields:missing,notes:['用户判断与软件计算分开记录；没有接入外部行情。','记录更新时间不等于行情截至时间；缺失字段不能解释为零。','历史持仓缺失的原始计划未推断；持仓快照不会因修改其他日期自动重算。']}};
 return enrichAI(snapshot,d);
}
function exportAI(){
 const d=day();if(!d)return;
 if(!d.aiPlan.session){showToast('请先选择盘前、盘中或盘后');return}
 downloadJSON(buildAI(d),'TradeOS-AI-'+d.date+'-'+({'盘前':'pre','盘中':'intraday','盘后':'post'})[d.aiPlan.session]+'.json');
}
