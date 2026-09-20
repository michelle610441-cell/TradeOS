/* V4 research layer. The original daily account ledger remains authoritative.
   Decisions are immutable snapshots; fills and reviews never rewrite them. */
const V4_PHILOSOPHY=[
 '系统不是为了保证我判断正确，而是让我判断错误时仍然活着。',
 '欲望可以很大，单次风险必须有限。','我可以对人生激进，对单次交易保守。',
 '盘前想慢，盘中动快，盘后想透。',
 '快速下单不等于冲动交易；没有预定义 Setup 的快速下单才值得警惕。',
 '欲望不是买点。','不能因为太想赢，就让 deadline 替我选择市场和战法。'
];
const MOTIVES=['想回本','弥补本月亏损','赚房租','完成月度收益目标','快速证明自己','别人赚钱而焦虑','交易日不够','只要一个涨停就回来了','FOMO','太想赢'];
const SETUP_FIELDS=[
 ['marketConditions','适用市场环境'],['emotionPhases','适用情绪周期（每行一项）'],
 ['sectorConditions','板块条件'],['stockRoleConditions','个股地位条件'],
 ['priceVolumeConditions','K线 / 量价条件'],['intradayConditions','分时条件'],
 ['entryTriggers','正式买点（每行一项）'],['forbiddenConditions','禁止买入条件（每行一项）'],
 ['addPositionConditions','加仓条件'],['invalidationConditions','失效条件'],
 ['exitRules','卖出规则'],['fastChecks','极速核心检查（每行一项）'],
 ['historicalCases','历史案例 / 链接（每行一项）'],['notes','备注']
];
const ARRAY_FIELDS=new Set(['emotionPhases','entryTriggers','forbiddenConditions','fastChecks','historicalCases']);
let selectedCandidateId=null,fastStockId=null,fastSetupId=null,selectedReviewId=null,selectedChallengeId=null;
const nowISO=()=>new Date().toISOString();
const valueOf=k=>document.getElementById(k)?.value||'';
const lines=v=>String(v||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
const setupVersion=s=>s?.versions?.find(v=>v.version===s.currentVersion)||s?.versions?.at(-1)||{};
const setupById=id=>state.setupLibrary.find(s=>s.id===id);
const pctValid=v=>nullable(v)!==null&&Number(v)>0&&Number(v)<=100;
function arg(v){return esc(JSON.stringify(v))}
function field4(k,label,v='',type='text'){
 return `<div class="field4"><label for="${k}">${label}</label><input id="${k}" type="${type}" ${type==='number'?'step="any"':''} value="${esc(v??'')}"></div>`;
}
function text4(k,label,v=''){return `<div class="field4"><label for="${k}">${label}</label><textarea id="${k}">${esc(v??'')}</textarea></div>`}
function option4(v,label,current){return `<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`}
function select4(k,label,options,current='',extra=''){
 return `<div class="field4"><label for="${k}">${label}</label><select id="${k}" ${extra}>${options.map(x=>option4(x[0],x[1],current)).join('')}</select></div>`;
}
function statusName(s){return ({draft:'草稿',formal:'正式',retired:'已停用',legacy_needs_definition:'旧模式待定义'})[s]||s}
function classificationPill(v){const p={system_in:['系统内','ok'],system_out:['系统外','bad'],experiment:['实验单','warn'],legacy_unclassified:['历史未分类','']};const x=p[v]||['待核对','warn'];return `<span class="pill ${x[1]}">${x[0]}</span>`}
function commitV4(fn){
 const before=clone(state);try{fn();if(!save()){state=before;return false}return true}catch(e){state=before;showToast(e.message);return false}
}
function blankRules(){return Object.fromEntries(SETUP_FIELDS.map(([k])=>[k,ARRAY_FIELDS.has(k)?[]:'']))}
function createSetupRecord(name,origin='manual',rules={}){
 const ts=nowISO();return {id:id(),name,type:'自定义战法',origin,status:'draft',currentVersion:1,createdAt:ts,
 versions:[{...blankRules(),initialPositionPct:null,maxPositionPct:null,...rules,version:1,effectiveAt:ts,status:'draft',name}]};
}
function migrateV4(p){
 // Do not silently drop malformed new collections or guess classifications for old fills.
 for(const k of ['setupLibrary','tradeCases','disciplineChallenges']){
  if(p[k]!=null&&!Array.isArray(p[k]))throw Error(k+' 格式错误');p[k]=p[k]||[];
 }
 p.settings={...object(p.settings),experimentMaxPositionPct:5,experimentPromotionCases:5};
 p.auditEvents=p.auditEvents||[];
 const names=new Set([...models,...p.days.flatMap(d=>[...d.stocks.map(s=>s.model),...d.trades.map(t=>t.model)]).filter(Boolean)]);
 names.forEach(name=>{if(!p.setupLibrary.some(s=>s.name===name)){const s=createSetupRecord(name,'legacy');s.status='legacy_needs_definition';p.setupLibrary.push(s)}});
 if(!p.setupLibrary.some(s=>s.id==='leader-fast-template')){
  const s=createSetupRecord('龙头快速上板 / 半路确认','template',{
   marketConditions:'盘前先定义允许参与的市场状态；当前环境必须与预案一致。',
   emotionPhases:['启动','分歧'],sectorConditions:'主流板块具备延续与跟随；不是个股孤立拉升。',
   stockRoleConditions:'事先识别的龙头或核心，不能仅因涨速快临时认定龙头。',
   priceVolumeConditions:'在盘前写明结构关键位与量价要求，不能只看涨幅。',
   intradayConditions:'价格与承接满足预案；快速拉升本身不是充分条件。',
   entryTriggers:['突破盘前定义的关键位并满足承接条件','半路或上板：使用事先选择的触发方式，不临时切换'],
   forbiddenConditions:['环境与预案冲突','个股地位不符','超过预设仓位或失效风险','只有涨速，没有预定义触发'],
   addPositionConditions:'只有事先定义的加仓条件成立才加仓。',
   invalidationConditions:'使用前补充本战法的结构失效条件及具体个股止损。',
   exitRules:'按事先定义的失效 / 止盈条件执行，不因成本价改变周期。',
   fastChecks:['关键触发已满足','板块情绪支持','个股地位符合'],
   notes:'软件模板不是已验证战法；需自行补齐关键位、仓位并发布。'
  });s.id='leader-fast-template';s.type='龙头战法';p.setupLibrary.push(s);
 }
 p.setupLibrary.forEach(s=>{s.versions=s.versions||[];s.origin=s.origin||'legacy';if(!s.versions.length)throw Error('战法缺少版本：'+s.name)});
 p.days.forEach(d=>{d.candidatePool=d.candidatePool||[];d.executionDecisions=d.executionDecisions||[];
  d.stocks.forEach(s=>{s.setupId=s.setupId||p.setupLibrary.find(x=>x.name===s.model)?.id||null});
 });
 return p;
}
function bootV4(){load();state=migratePayload(state);ensure();render()}
function qualifyingExperiments(setupId){
 const seen=new Set();return state.tradeCases.filter(c=>{if(!c.id||seen.has(c.id)||c.setupId!==setupId||c.classification!=='experiment'||!c.closedAt||!c.review?.completedAt||c.voidedAt)return false;seen.add(c.id);return true});
}
function validateRules(r){
 if(!r.entryTriggers?.length||!r.forbiddenConditions?.length||!r.invalidationConditions?.trim()||!r.exitRules?.trim())return '正式Setup必须有触发、禁止、失效和卖出规则';
 if(!pctValid(r.initialPositionPct)||!pctValid(r.maxPositionPct)||r.initialPositionPct>r.maxPositionPct)return '初始仓位与最大仓位需在0～100%内且初始不超过最大';
 if(!r.marketConditions?.trim()||!r.sectorConditions?.trim()||!r.stockRoleConditions?.trim()||!r.emotionPhases?.length)return '请补齐市场、情绪、板块和个股地位条件';
 return '';
}
function publishSetup(setupId,name,type,r,status){
 const s=setupById(setupId);if(!s)throw Error('战法不存在');
 if(!name.trim())throw Error('请填写战法名');
 if(status==='formal'){
  const err=validateRules(r);if(err)throw Error(err);
  const fromExperiment=s.origin==='experiment'||state.tradeCases.some(c=>c.setupId===s.id&&c.classification==='experiment');
  if(fromExperiment&&s.status!=='formal'&&qualifyingExperiments(s.id).length<5)throw Error('实验买点至少需要5个已清仓且完成复盘的独立案例；重复流水不计数');
 }
 const version=(s.currentVersion||0)+1,ts=nowISO();
 s.versions.push({...clone(r),version,effectiveAt:ts,status,name,type});s.currentVersion=version;s.name=name;s.type=type;s.status=status;
 s.origin=(s.origin==='experiment'||state.tradeCases.some(c=>c.setupId===s.id&&c.classification==='experiment'))?'experiment':s.origin;
}
function setupLibraryPage(){
 const list=state.setupLibrary,s=setupById(selectedSetupId)||list[0];selectedSetupId=s?.id||null;
 if(!s)return wrap('战法库','<button class="btn" onclick="addSetup()">新建战法</button>');
 const r=setupVersion(s);
 return wrap('战法库 · 定义允许交易的场景',`
 <div class="sectionHead"><p>先定义，再执行。旧模式保留原名，新规则只对以后生效。</p><button class="btn" onclick="addSetup()">＋新建</button></div>
 ${select4('setupPick','选择战法',list.map(x=>[x.id,x.name+' · '+statusName(x.status)]),s.id,'onchange="selectSetup(this.value)"')}
 <p class="pill">版本 ${s.currentVersion} · 已复盘实验案例 ${qualifyingExperiments(s.id).length}/5</p>
 <form onsubmit="event.preventDefault();saveSetupForm()">
 <div class="twoCol">${field4('su_name','战法名称',s.name)}${field4('su_type','战法类型',s.type)}
 ${select4('su_status','发布状态',[['draft','草稿'],['formal','正式'],['retired','停用'],['legacy_needs_definition','旧模式待定义']],s.status)}
 ${field4('su_initial','初始仓位 %',r.initialPositionPct,'number')}${field4('su_max','最大仓位 %',r.maxPositionPct,'number')}</div>
 <div class="twoCol">${SETUP_FIELDS.map(([k,l])=>text4('su_'+k,l,ARRAY_FIELDS.has(k)?(r[k]||[]).join('\n'):r[k])).join('')}</div>
 <button class="btn" type="submit">保存新版本</button></form>
 <details><summary>版本记录（历史决策仍引用原版本）</summary>${s.versions.map(v=>`<p>v${v.version} · ${esc(v.effectiveAt)} · ${esc(statusName(v.status||'草稿'))}</p>`).join('')}</details>`);
}
function selectSetup(v){selectedSetupId=v;render()}
function addSetup(){const name=prompt('新战法名称');if(!name?.trim())return;if(commitV4(()=>{const s=createSetupRecord(name.trim());state.setupLibrary.push(s);selectedSetupId=s.id}))render()}
function saveSetupForm(){
 const r={...blankRules(),initialPositionPct:nullable(valueOf('su_initial')),maxPositionPct:nullable(valueOf('su_max'))};
 SETUP_FIELDS.forEach(([k])=>r[k]=ARRAY_FIELDS.has(k)?lines(valueOf('su_'+k)):valueOf('su_'+k));
 if(commitV4(()=>publishSetup(selectedSetupId,valueOf('su_name'),valueOf('su_type'),r,valueOf('su_status')))){showToast('新版本已保存，旧票据不变');render()}
}

function isPreMarket(date,ts){return Number.isFinite(Date.parse(ts))&&Date.parse(ts)<Date.parse(date+'T09:30:00+08:00')}
function candidateFor(d,stockId,setupId){return d.candidatePool.find(c=>c.stockId===stockId&&!c.archivedAt&&(!setupId||c.setupId===setupId))}
function candidatePoolPage(d){
 const c=d.candidatePool.find(x=>x.id===selectedCandidateId)||{},st=d.stocks.find(x=>x.id===c.stockId)||currentStock(d);
 const setup=setupById(c.setupId||st?.setupId),r=setupVersion(setup);
 return wrap('盘前候选池 · 今天等待什么',`
 <div class="sectionHead"><p>自动沿用个股买点；盘中新增会如实标注时间，不伪装成盘前计划。</p><button class="btn alt" onclick="goStep(7)">管理个股</button></div>
 <div class="candidateCards">${d.candidatePool.filter(x=>!x.archivedAt).map(x=>`<article><span class="eyebrow">${x.source==='pre_market'?'盘前确认':'盘中 / 补录'}</span><h3>${esc(x.name)}</h3><p>${esc(setupById(x.setupId)?.name||'未选战法')} · ${esc(x.role||'未定定位')}</p><p>${esc(x.allowedTriggers||'触发待补充')}</p><button class="btn" onclick="openFast(${arg(x.stockId)},${arg(x.setupId)})">⚡ 极速检查</button><button class="btn alt small" onclick="editCandidate(${arg(x.id)})">编辑</button><button class="btn alt small" onclick="archiveCandidate(${arg(x.id)})">移出</button></article>`).join('')}</div>
 <details ${selectedCandidateId||!d.candidatePool.length?'open':''}><summary>${selectedCandidateId?'编辑候选 · 保存新修订':'＋添加候选'}</summary>
 ${st?`<form onsubmit="event.preventDefault();addCandidate()"><div class="twoCol">
 ${select4('cp_stock','股票',d.stocks.map(x=>[x.id,(x.name||'未命名')+' '+(x.code||'')]),st.id)}
 ${select4('cp_setup','战法',state.setupLibrary.filter(x=>x.status!=='retired').map(x=>[x.id,x.name+' · '+statusName(x.status)]),setup?.id||'')}
 ${field4('cp_sector','所属板块',c.sector||st.sector||d.sector.name||'')}
 ${select4('cp_role','个股定位',['待确认','龙头','核心','跟风','补涨'].map(x=>[x,x]),c.role||'待确认')}
 ${field4('cp_entry','预期买点',c.expectedEntry||st.buy.price||'')}
 ${field4('cp_pos','计划总持仓 %',c.plannedPositionPct??st.position.plan??r.initialPositionPct,'number')}
 ${field4('cp_stop','初始止损价（可选）',c.initialStop??st.buy.planStop,'number')}</div>
 ${text4('cp_trigger','允许触发',c.allowedTriggers||st.buy.notes||(r.entryTriggers||[]).join('；'))}
 ${text4('cp_forbid','禁止条件',c.forbiddenConditions||(r.forbiddenConditions||[]).join('；'))}
 ${text4('cp_invalid','失效条件',c.invalidationCondition||st.buy.invalidWhen||r.invalidationConditions)}
 <button class="btn" type="submit">确认候选计划</button></form>`:'<p>先在⑥个股添加股票，也可在极速页临时添加。</p>'}
 </details>`);
}
function editCandidate(id){selectedCandidateId=id;render()}
function archiveCandidate(id){if(commitV4(()=>{const c=day().candidatePool.find(x=>x.id===id);if(c)c.archivedAt=nowISO()})){selectedCandidateId=null;render()}}
function addCandidate(){
 const d=day(),st=d.stocks.find(x=>x.id===valueOf('cp_stock')),s=setupById(valueOf('cp_setup')),pos=nullable(valueOf('cp_pos'));
 if(!st||!s||!pctValid(pos)||!valueOf('cp_trigger').trim()||!valueOf('cp_invalid').trim()){showToast('请补齐战法、有效仓位、触发和失效条件');return}
 const patch={stockId:st.id,symbol:st.code||'',name:st.name||'',sector:valueOf('cp_sector'),role:valueOf('cp_role'),setupId:s.id,setupVersion:s.currentVersion,expectedEntry:valueOf('cp_entry'),allowedTriggers:valueOf('cp_trigger'),forbiddenConditions:valueOf('cp_forbid'),plannedPositionPct:pos,initialStop:nullable(valueOf('cp_stop')),invalidationCondition:valueOf('cp_invalid')};
 if(commitV4(()=>{const old=d.candidatePool.find(x=>x.id===selectedCandidateId)||candidateFor(d,st.id,s.id),ts=nowISO();
  const c={...patch,id:old?.id||id(),createdAt:old?.createdAt||ts,confirmedAt:ts,source:isPreMarket(d.date,ts)?'pre_market':'intraday',revision:(old?.revision||0)+1,history:old?[...(old.history||[]),{...clone(old),history:undefined}]:[]};
  if(old)d.candidatePool[d.candidatePool.indexOf(old)]=c;else d.candidatePool.push(c);
 })){selectedCandidateId=null;showToast('候选已确认');render()}
}
function openFast(stockId,setupId){fastStockId=stockId||null;fastSetupId=setupId||null;currentStep=17;render()}
function quickStock(){
 const code=prompt('临时股票代码（6位）');if(!code)return;if(!/^\d{6}$/.test(code)){showToast('请输入6位代码');return}
 const found=day().stocks.find(x=>x.code===code);if(found){openFast(found.id);return}
 const name=prompt('股票简称（可留空）')||code;
 if(commitV4(()=>{const s={id:id(),code,name,buy:{},position:{},model:''};day().stocks.push(s);fastStockId=s.id})){fastSetupId=null;render()}
}
function chooseFastStock(v){fastStockId=v;fastSetupId=null;render()}
function chooseFastSetup(v){fastSetupId=v;render()}
function fastContext(d){
 const st=d.stocks.find(x=>x.id===fastStockId)||d.stocks.find(x=>candidateFor(d,x.id))||currentStock(d);
 const preferred=candidateFor(d,st?.id);const sid=fastSetupId||preferred?.setupId||st?.setupId||'';
 const setup=setupById(sid),c=candidateFor(d,st?.id,sid);return {st,setup,c,r:setupVersion(setup)};
}
function checkSelect(k,label){return select4(k,label,[['','待确认'],['yes','是'],['no','否']],'')}
function fastExecutionPage(d){
 const {st,setup,c,r}=fastContext(d);fastStockId=st?.id||null;fastSetupId=setup?.id||null;
 const planned=c?.plannedPositionPct??st?.position?.plan??r.initialPositionPct??'';
 return wrap('⚡ 极速决策 · 不连接券商，不自动下单',`
 <div class="fastHero"><p class="eyebrow">THINK SLOW · ACT WITH A PLAN</p><h2>这是龙头战法，还是你太想赢？</h2><p>欲望不是买点。速度不决定合规，预定义条件才决定。</p></div>
 <div class="sectionHead"><p class="hint">生成下单前票据 → 在券商成交 → 回持仓页记账。票据有效5分钟，过期需重新检查。主观行情条件需要你确认。</p><button class="btn alt small" onclick="quickStock()">＋临时股票</button></div>
 ${st?`<div class="twoCol">
 ${select4('fx_stock','股票',d.stocks.map(x=>[x.id,(x.name||x.code)+' '+(candidateFor(d,x.id)?.source==='pre_market'?'· 盘前候选':'')]),st.id,'onchange="chooseFastStock(this.value)"')}
 ${select4('fx_setup','预定义战法',[['','新买点 / 未定义'],...state.setupLibrary.filter(x=>x.status!=='retired').map(x=>[x.id,x.name+' · '+statusName(x.status)])],setup?.id||'','onchange="chooseFastSetup(this.value)"')}</div>
 <div class="fastSummary"><span class="pill ${setup?.status==='formal'?'ok':'warn'}">${setup?.status==='formal'?'正式Setup':'未有正式Setup'}</span><span class="pill">${c?.source==='pre_market'?'盘前候选':'非盘前候选 · 提高注意'}</span>
 <p><b>触发：</b>${esc(c?.allowedTriggers||(r.entryTriggers||[]).join('；')||'尚未定义')}</p>
 <p><b>禁止：</b>${esc([...(r.forbiddenConditions||[]),c?.forbiddenConditions].filter(Boolean).join('；')||'尚未定义')}</p>
 <p><b>失效：</b>${esc(c?.invalidationCondition||r.invalidationConditions||'尚未定义')}</p></div>
 <div class="fastChecks">
 ${checkSelect('fx_trigger','核心触发已满足？')}${checkSelect('fx_support','板块 / 情绪支持？')}${checkSelect('fx_role','个股地位符合？')}
 ${select4('fx_forbid','禁止条件检查',[['','待确认'],['no','无禁止条件'],['yes','命中禁止条件']],'')}
 ${field4('fx_pos','目标总持仓 %（含已有仓位）',planned,'number')}
 ${field4('fx_invalid','失效条件（自动带入）',c?.invalidationCondition||r.invalidationConditions||st.buy.invalidWhen||'')}
 </div>
 <p class="hint">仓位将与战法上限、今日总仓位上限及已记录账户数据核对。实际成交还会复核。</p>
 <details id="fxExtra"><summary>实验单理由 / 止损 / 动机（按需展开）</summary>
 ${field4('fx_newSetup','新买点名（未选战法时填写，后续实验沿用）')}
 ${field4('fx_reason','一句话理由（实验单必填）',c?.allowedTriggers||st.buy.notes||'')}
 ${field4('fx_stop','初始止损价（计算R，可留空）',c?.initialStop??st.buy.planStop,'number')}
 <div class="motiveGrid">${MOTIVES.map(x=>`<label><input class="fx_motive" type="checkbox" value="${esc(x)}">${x}</label>`).join('')}</div>
 <label><input id="fx_late" type="checkbox">这笔已经成交，现在补录（不认证为系统内）</label>
 </details><div class="fastActions"><button class="btn successBig" onclick="recordFastDecision('preset_entry')">符合预设买点</button><button class="btn danger" onclick="recordFastDecision('impulse')">临盘起意</button></div>
 `:'<button class="btn" onclick="quickStock()">添加股票开始</button>'}
 <h3>今日不可覆盖的决策票据</h3>${d.executionDecisions.slice().reverse().map(t=>`<details class="ticket"><summary>${esc(t.name)} · ${classificationPill(t.classification)} · ${esc(t.createdAt)}</summary><p>${esc(t.reason)} · 目标 ${esc(t.plannedPositionPct)}%</p><p>${esc(t.riskWarnings.join('；')||'未发现规则冲突')}。行情由用户确认，不是自动验证。</p><button class="btn alt small" onclick="openLedger(${arg(t.id)})">关联实际成交</button></details>`).join('')}`);
}
function scanMotives(reason,selected=[]){
 const patterns=[['想回本',/回本|回来了/],['弥补本月亏损',/弥补.*亏|本月.*亏/],['赚房租',/房租/],['完成月度收益目标',/月度.*目标|本月.*目标/],['快速证明自己',/证明自己/],['别人赚钱而焦虑',/别人.*赚|焦虑/],['交易日不够',/交易日.*不够|deadline/i],['只要一个涨停就回来了',/一个涨停/],['FOMO',/fomo|踏空/i],['太想赢',/太想赢/]];
 return [...new Set([...selected,...patterns.filter(([,re])=>re.test(reason)).map(([label])=>label)])];
}
function evaluateDecision(d,s,c,data,ts=nowISO()){
 const r=setupVersion(s),warnings=[],predefined=s?.status==='formal'&&r.status==='formal'&&Date.parse(r.effectiveAt)<=Date.parse(ts)&&!validateRules(r);
 const pos=nullable(data.pos),limit=nullable(r.maxPositionPct),account=recomputeAccount(d),holding=d.holdings.find(h=>h.stockId===data.stockId);
 const oldPct=account.equity>0&&nullable(holding?.price)!==null?n(holding.qty)*n(holding.price)/account.equity*100:0;
 const totalAfter=account.positionPct===null?null:account.positionPct-oldPct+(pos||0),dayLimit=nullable(d.aiPlan.maxPositionPct);
 const max=holding?limit:nullable(r.initialPositionPct),within=pctValid(pos)&&limit!==null&&max!==null&&pos<=Math.min(limit,max)&&account.equity>0&&pos>=oldPct&&
  (dayLimit===null||totalAfter<=dayLimit);
 const candidate=c?.source==='pre_market'&&Date.parse(c.confirmedAt)<=Date.parse(ts);
 if(!candidate)warnings.push('非盘前候选，不单独决定系统内外');
 if(!predefined)warnings.push('没有完整且事先发布的正式Setup');
 if(!within)warnings.push('仓位未通过数值核对，或账户数据缺失');
 if(data.forbid!=='no')warnings.push('禁止条件未排除');
 if(data.trigger!=='yes'||data.support!=='yes'||data.role!=='yes')warnings.push('触发 / 板块情绪 / 个股地位未全部确认');
 const phaseAllowed=!r.emotionPhases?.length||!d.emotion.phase||r.emotionPhases.includes(d.emotion.phase);
 if(!phaseAllowed)warnings.push('当前情绪不在战法适用周期内');
 if(data.late)warnings.push('事后补录，无法认证买入前条件');
 if(data.motives?.length)warnings.push('欲望不是买点：'+data.motives.join('、'));
 const ok=predefined&&within&&data.trigger==='yes'&&data.support==='yes'&&data.role==='yes'&&data.forbid==='no'&&!!data.invalid?.trim()&&phaseAllowed&&!data.late;
 return {classification:data.button==='impulse'?'experiment':ok?'system_in':'system_out',warnings,
 checks:{presetSetup:!!predefined,inCandidatePool:!!candidate,coreTriggerMet:data.trigger,marketEmotionSupported:data.support,stockRoleMatched:data.role,positionCompliant:within,invalidationDefined:!!data.invalid?.trim(),forbiddenConditionPresent:data.forbid},accountSnapshot:clone(account)};
}
function recordFastDecision(button){
 const d=day(),{st,setup,c}=fastContext(d);if(!st)return;
 const experiment=button==='impulse',pos=nullable(valueOf('fx_pos')),reason=valueOf('fx_reason'),invalid=valueOf('fx_invalid');
 if(!pctValid(pos)||!invalid.trim()||(experiment&&!reason.trim())||(experiment&&!setup&&!valueOf('fx_newSetup').trim())){
  document.getElementById('fxExtra').open=true;showToast('请填有效仓位与失效条件；实验单还需一句理由和可追踪的买点名');return;
 }
 const requestedPos=pos,effective=experiment?Math.min(pos,5):pos,ts=nowISO();
 const motives=scanMotives(reason,[...document.querySelectorAll('.fx_motive:checked')].map(e=>e.value));
 const data={stockId:st.id,button,pos:effective,trigger:valueOf('fx_trigger'),support:valueOf('fx_support'),role:valueOf('fx_role'),forbid:valueOf('fx_forbid'),invalid,motives,late:!!document.getElementById('fx_late')?.checked};
 const evaluation=evaluateDecision(d,setup,c,data,ts);
 if(experiment&&requestedPos>5)evaluation.warnings.push('计划由'+requestedPos+'%降低至5%；实际成交不会被软件修改');
 if(commitV4(()=>{
  let s=setup;if(experiment&&!s){s=createSetupRecord(valueOf('fx_newSetup').trim(),'experiment',{entryTriggers:[reason],invalidationConditions:invalid,initialPositionPct:5,maxPositionPct:5});state.setupLibrary.push(s)}
  const ticket={id:id(),createdAt:ts,lockedAt:ts,expiresAt:new Date(Date.parse(ts)+5*60000).toISOString(),stockId:st.id,symbol:st.code,name:st.name,setupId:s?.id||null,setupVersion:s?.currentVersion||null,
   setupSnapshot:s?{id:s.id,name:s.name,status:s.status,rules:clone(setupVersion(s))}:null,candidateId:c?.id||null,candidateSnapshot:c?clone(c):null,
   classification:evaluation.classification,checks:evaluation.checks,riskWarnings:evaluation.warnings,plannedPositionPct:effective,requestedPositionPct:requestedPos,
   reason,initialStop:nullable(valueOf('fx_stop')),invalidationCondition:invalid,motivationFlags:motives,decisionButton:button,lateEntry:data.late,
   marketSnapshot:{market:clone(d.market),emotion:clone(d.emotion),sector:clone(d.sector),stock:clone(st),dataAsOf:d.aiPlan.asOf||null},accountSnapshot:evaluation.accountSnapshot};
  d.executionDecisions.push(ticket);d.pendingDecisionId=ticket.id;
 })){showToast('票据已锁定。软件未下单；请按实际成交记账');render()}
}
function openLedger(ticketId){day().pendingDecisionId=ticketId;currentStep=10;render()}

function ledgerResearchControls(d){
 const pending=d.executionDecisions.find(t=>t.id===d.pendingDecisionId);
 return `<section class="researchLedger"><h3>下单前判断 → 实际成交</h3><p class="hint">只记录真实成交，不替你下单。每张票据仅关联一次买入 / 加仓；补录、过期、实际超仓会如实标记，不阻止记账。</p>
 <div class="twoCol">${select4('lg_decision','买入 / 加仓关联票据',[['','无下单前票据'],...d.executionDecisions.filter(t=>!ticketUsed(t.id)).map(t=>[t.id,t.name+' · '+({system_in:'系统内',system_out:'系统外',experiment:'实验单'})[t.classification]+' · '+t.createdAt])],pending&&!ticketUsed(pending.id)?pending.id:'')}
 ${field4('lg_executed','实际成交时间（北京时间；留空=现在）','','datetime-local')}</div>
 <p class="hint">卖出自动归入未结束案例，不消耗买入票据。旧“卖出复盘”不重复计入挑战。</p></section>`;
}
function ticketUsed(ticketId){return state.days.some(d=>d.ledger.some(l=>l.decisionId===ticketId))}
function actualAssessment(d,st,type,qty,price,fee,ticket,executedAt){
 const buy=type==='买入'||type==='加仓',h=d.holdings.find(x=>x.stockId===st.id),warnings=[];
 if(!buy)return {classification:null,warnings:[],positionCompliant:null};
 const valid=ticket&&ticket.stockId===st.id&&!ticketUsed(ticket.id);
 const temporal=valid&&!ticket.lateEntry&&Date.parse(ticket.createdAt)<=Date.parse(executedAt)&&Date.parse(executedAt)<=Date.parse(ticket.expiresAt);
 if(!valid)warnings.push('无可用下单前票据');
 if(valid&&!temporal)warnings.push('票据过期、事后补录或成交早于票据');
 const others=d.holdings.filter(x=>x.stockId!==st.id);
 const known=others.every(x=>nullable(x.price)!==null&&nullable(x.qty)!==null);
 const equity=known?n(d.account.cash)+others.reduce((s,x)=>s+n(x.qty)*n(x.price),0)+n(h?.qty)*price-fee:null;
 const positionPct=equity>0?(n(h?.qty)+qty)*price/equity*100:null;
 const totalPct=equity>0?(others.reduce((s,x)=>s+n(x.qty)*n(x.price),0)+(n(h?.qty)+qty)*price)/equity*100:null;
 const r=ticket?.setupSnapshot?.rules||{},rulesMax=nullable(h?r.maxPositionPct:r.initialPositionPct),max=ticket?.classification==='experiment'?5:rulesMax;
 const limit=nullable(d.aiPlan.maxPositionPct),planned=nullable(ticket?.plannedPositionPct);
 const within=positionPct!==null&&max!==null&&planned!==null&&positionPct<=Math.min(max,planned)+1e-8&&(limit===null||totalPct<=limit+1e-8);
 if(!within)warnings.push('实际仓位超出计划 / 上限，或缺少核对数据');
 const classification=ticket?.classification==='experiment'?'experiment':temporal&&within&&ticket.classification==='system_in'?'system_in':'system_out';
 return {classification,warnings,positionCompliant:within,positionPct,totalPct,equityAtFill:equity,temporalVerified:!!temporal};
}
function recordLedger(type){
 const d=day(),sid=valueOf('lg_stock'),buy=['买入','加仓'].includes(type);
 if(state.days.some(x=>x.date>d.date)){showToast('该日已有后续账户快照，不能回写流水；请先核对历史并使用最新日期');return}
 const st=findHoldingStockOptions(d).find(x=>x.id===sid),h=d.holdings.find(x=>x.stockId===sid);
 const qty=type==='清仓'?n(h?.qty):nullable(valueOf('lg_qty')),price=nullable(valueOf('lg_price')),fee=valueOf('lg_fee')===''?0:nullable(valueOf('lg_fee'));
 if(!st||!Number.isInteger(qty)||qty<=0||!(price>0)||fee===null||fee<0){showToast('请核对股票、正整数股数、成交价和非负费用');return}
 if(nullable(d.account.cash)===null){showToast('请先填写当前现金');return}
 if(buy&&qty*price+fee>n(d.account.cash)){showToast('现金不足；请核对真实成交与账户');return}
 if(!buy&&(!h||qty>n(h.qty)||nullable(h.availableQty)===null||qty>n(h.availableQty))){showToast('卖出数量超过持仓 / 可卖数量，或可卖数量待核对');return}
 const executedAt=valueOf('lg_executed')?timestamp(valueOf('lg_executed')):nowISO(),ms=Date.parse(executedAt);
 if(!Number.isFinite(ms)||ms>Date.now()+60000||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms))!==d.date){showToast('成交时间须在所选交易日且不能在未来');return}
 const ticket=buy?d.executionDecisions.find(t=>t.id===valueOf('lg_decision')):null;
 if(ticket&&(ticket.stockId!==sid||ticketUsed(ticket.id))){showToast('票据股票不符或已使用，请重新选择');return}
 const assessed=actualAssessment(d,st,type,qty,price,fee,ticket,executedAt);
 assessed.motivationFlags=scanMotives(valueOf('lg_note'));if(assessed.motivationFlags.length)assessed.warnings.push('欲望不是买点：'+assessed.motivationFlags.join('、'));
 const ledgerId=id(),ts=nowISO(),note=valueOf('lg_note'),beforeQty=n(h?.qty);
 if(!commitV4(()=>{
  const undoBefore={holdings:clone(d.holdings),account:clone(d.account)};
  const researchBefore={tradeCases:clone(state.tradeCases),disciplineChallenges:clone(state.disciplineChallenges),pendingDecisionId:d.pendingDecisionId||null};
  let holding=d.holdings.find(x=>x.stockId===sid),realizedPnl=0;
  if(buy){
   if(!holding){holding={id:id(),stockId:sid,name:st.name||'',code:st.code||'',qty:0,cost:0,price,availableQty:0,originalPlan:{...planOf(d.stocks.find(x=>x.id===sid)),capturedAt:ts}};d.holdings.push(holding)}
   holding.cost=(n(holding.qty)*n(holding.cost)+qty*price+fee)/(n(holding.qty)+qty);holding.qty=n(holding.qty)+qty;
   d.account.cash=n(d.account.cash)-qty*price-fee;
  }else{
   realizedPnl=(price-n(holding.cost))*qty-fee;holding.qty=n(holding.qty)-qty;holding.availableQty=n(holding.availableQty)-qty;d.account.cash=n(d.account.cash)+qty*price-fee;
  }
  holding.price=price;holding.priceUpdatedAt=ts;holding.priceAsOf=executedAt;
  const l={id:ledgerId,date:d.date,type,stockId:sid,name:st.name||'',code:st.code||'',qty,price,fee,amount:qty*price,realizedPnl,note,createdAt:ts,executedAt,
   decisionId:ticket?.id||null,setupId:ticket?.setupId||null,classification:assessed.classification,executionAssessment:assessed,undoBefore,researchBefore};
  d.ledger.push(l);d.holdings=d.holdings.filter(x=>n(x.qty)>0);
  linkTradeCase(d,l,ticket,beforeQty);
  l.undoAfter={holdings:clone(d.holdings),account:clone(d.account)};
  l.researchAfter={tradeCases:clone(state.tradeCases),disciplineChallenges:clone(state.disciplineChallenges)};
  d.pendingDecisionId=null;recomputeAccount(d);
 })){return}
 showToast(assessed.warnings.length?'真实成交已记录；纪律偏差已标记':'真实成交已记录');render();
}
function linkTradeCase(d,l,ticket,beforeQty){
 const buy=['买入','加仓'].includes(l.type);
 let c=state.tradeCases.find(x=>!x.closedAt&&!x.voidedAt&&(x.stockId===l.stockId||(x.code&&x.code===l.code)));
 if(!c){
  // An inherited holding without a V4 entry cannot acquire a new, fabricated origin.
  c={id:id(),stockId:l.stockId,code:l.code,name:l.name,decisionId:beforeQty?null:ticket?.id||null,setupId:beforeQty?null:ticket?.setupId||null,setupName:beforeQty?null:ticket?.setupSnapshot?.name||null,
   classification:beforeQty?'legacy_unclassified':l.classification||'system_out',entryClassification:beforeQty?'legacy_unclassified':l.classification||'system_out',
   inherited:beforeQty>0,openedAt:beforeQty?null:l.executedAt,recordedAt:l.createdAt,ledgerIds:[],initialRiskAmount:null,rMultiple:null,review:{},executionWarnings:[]};
  if(!beforeQty&&buy&&ticket?.initialStop>0&&ticket.initialStop<l.price)c.initialRiskAmount=(l.price-ticket.initialStop)*l.qty+l.fee;
  state.tradeCases.push(c);
  const ch=state.disciplineChallenges.find(x=>x.status==='active');
  if(ch&&!beforeQty&&ch.caseIds.length<20)ch.caseIds.push(c.id);
 }
 c.ledgerIds.push(l.id);l.tradeCaseId=c.id;
 if(buy&&l.classification!=='system_in'&&c.classification==='system_in')c.classification='system_out';
 c.executionWarnings.push(...l.executionAssessment.warnings.map(w=>({ledgerId:l.id,text:w})));
 // Risk-unit stays frozen at first entry, even if stop/size changes later.
 const all=state.days.flatMap(x=>x.ledger).filter(x=>c.ledgerIds.includes(x.id));
 c.realizedPnl=all.reduce((a,x)=>a+n(x.realizedPnl),0);
 c.investedAmount=all.filter(x=>['买入','加仓'].includes(x.type)).reduce((a,x)=>a+x.amount+x.fee,0);
 const remaining=d.holdings.find(h=>h.stockId===l.stockId);
 if(!remaining){c.closedAt=l.executedAt;c.returnPct=!c.inherited&&c.investedAmount>0?c.realizedPnl/c.investedAmount*100:null;c.rMultiple=c.initialRiskAmount>0?c.realizedPnl/c.initialRiskAmount:null}
 else{c.closedAt=null;c.returnPct=null;c.rMultiple=null}
}
function deleteLedger(i){
 const d=day(),l=d.ledger[i];if(!l)return;
 if(state.days.some(x=>x.date>d.date)||i!==d.ledger.length-1||!l.undoBefore){showToast('仅可撤销最新日期的最后一条可回滚流水');return}
 const current={holdings:clone(d.holdings),account:clone(d.account)};
 if(JSON.stringify(clean(current))!==JSON.stringify(clean(l.undoAfter))){showToast('流水后账户已有修改，无法安全撤销');return}
 if(l.researchAfter&&JSON.stringify({tradeCases:state.tradeCases,disciplineChallenges:state.disciplineChallenges})!==JSON.stringify(l.researchAfter)){showToast('流水后案例或挑战已修改，不能覆盖这些修改');return}
 if(!confirm('撤销该流水并恢复账户、交易案例与挑战进度？下单前票据保留。'))return;
 if(commitV4(()=>{
  d.holdings=clone(l.undoBefore.holdings);d.account=clone(l.undoBefore.account);
  if(l.researchBefore){state.tradeCases=clone(l.researchBefore.tradeCases);state.disciplineChallenges=clone(l.researchBefore.disciplineChallenges);d.pendingDecisionId=l.researchBefore.pendingDecisionId}
  d.ledger.pop();state.auditEvents.push({id:id(),type:'ledger_undo',ledgerId:l.id,at:nowISO()});recomputeAccount(d);
 })){render();showToast('已撤销；决策票据保留')}
}

const REVIEW_TEXT=[
 ['buyReason','买入理由是什么？'],['withoutCost','如果没有成本价，现在会怎么看？'],
 ['logicStatus','买入逻辑是否仍然成立？'],['failureCause','市场概率还是执行错误？（可同时存在）'],
 ['reusableEntry','是否产生新的可复用买点？']
];
const REVIEW_BOOL=[
 ['planPosition','是否按计划仓位'],['planExit','是否按计划卖出'],['changedPlan','是否临盘改变计划'],
 ['pnlAffectedNext','是否因盈亏影响下一笔'],['shortToLong','是否短线变长线'],
 ['fomo','是否出现FOMO'],['revenge','是否想回本'],['wantWin','是否因太想赢而提高风险']
];
function getTicket(id){return state.days.flatMap(d=>d.executionDecisions||[]).find(t=>t.id===id)}
function caseCategory(c){
 if(c.classification==='legacy_unclassified')return '历史未分类';
 if(c.classification==='experiment')return 'E 实验单'+(c.closedAt?'':' · 未清仓');
 if(!c.closedAt)return '持仓中 · 盈亏未定';
 if(nullable(c.realizedPnl)===null)return '结果待核对';
 if(c.realizedPnl===0)return (c.classification==='system_in'?'系统内':'系统外')+'持平';
 return c.classification==='system_in'?(c.realizedPnl>0?'A 系统内盈利':'B 系统内亏损'):(c.realizedPnl>0?'C 系统外盈利':'D 系统外亏损');
}
function executionScore(c){
 const r=c.review||{};
 if(c.classification==='legacy_unclassified'||!c.closedAt||!r.completedAt)return null;
 const entry=c.entryClassification==='system_in',allBuys=state.days.flatMap(d=>d.ledger).filter(l=>c.ledgerIds.includes(l.id)&&['买入','加仓'].includes(l.type));
 const pos=r.planPosition===true&&allBuys.every(l=>l.executionAssessment?.positionCompliant===true);
 const items=[entry,pos,r.planExit===true,r.changedPlan===false,r.pnlAffectedNext===false];
 return items.filter(Boolean).length*20;
}
function fullyExecuted(c){return c.classification==='system_in'&&executionScore(c)===100}
function reviewResearchPage(){
 const cases=state.tradeCases.filter(c=>!c.voidedAt).slice().reverse(),c=cases.find(x=>x.id===selectedReviewId)||cases[0];
 if(!c)return wrap('逐笔交易研究','<p>真实成交记账后生成案例。旧卖出复盘仍保留，不强行推断下单前条件。</p>');
 selectedReviewId=c.id;const t=getTicket(c.decisionId),r=c.review||{};
 return wrap('逐笔交易研究 · 先过程，后盈亏',`
 ${select4('rv_case','选择交易案例',cases.map(x=>[x.id,(x.name||x.code)+' · '+caseCategory(x)]),c.id,'onchange="selectReview(this.value)"')}
 <div class="reviewHero"><h3>${esc(caseCategory(c))}</h3>${classificationPill(c.classification)}
 <p>Setup：${esc(c.setupName||'历史无可验证Setup')} · 初始分类：${classificationPill(c.entryClassification)}</p>
 <p>净已实现盈亏 ${yuan(c.realizedPnl)} · R ${c.rMultiple==null?'—':n(c.rMultiple).toFixed(2)} · 执行评分 ${executionScore(c)??'待复盘'}</p>
 <p>${c.classification==='system_in'?'系统内失败用于研究概率；卖出执行仍需单独评价。':c.classification==='experiment'?'实验单用于研究新买点，超仓等执行偏差仍保留。':'系统外失败用于改进执行纪律；事后长分析不能改写入场。'}</p></div>
 <details><summary>查看入场事实与原始快照</summary><p>原始理由：${esc(t?.reason||'未记录')}</p><p>原始Setup触发：${esc((t?.setupSnapshot?.rules?.entryTriggers||[]).join('；'))}</p><p>动机标记：${esc((t?.motivationFlags||[]).join('、')||'未标记，不等于不存在')}</p><p>数据截至：${esc(t?.marketSnapshot?.dataAsOf||'未记录')}</p><p>${esc((c.executionWarnings||[]).map(x=>x.text).join('；'))}</p></details>
 <form onsubmit="event.preventDefault();saveCaseReview()">
 <div class="twoCol">${REVIEW_BOOL.map(([k,l])=>select4('rv_'+k,l,[['','待确认'],['true','是'],['false','否']],r[k]===true?'true':r[k]===false?'false':'')).join('')}</div>
 ${REVIEW_TEXT.map(([k,l])=>text4('rv_'+k,l,r[k]??(k==='buyReason'?t?.reason||'':''))).join('')}
 <button class="btn" type="submit">保存并完成本次复盘</button><button class="btn alt" type="button" onclick="saveCaseReview(true)">保存草稿</button>
 </form><p class="hint">复盘修订保留旧版本；完成实验复盘不会自动将案例改为系统内。</p>`);
}
function selectReview(id){selectedReviewId=id;render()}
function saveCaseReview(draft=false){
 const c=state.tradeCases.find(x=>x.id===selectedReviewId);if(!c)return;
 const r={};REVIEW_BOOL.forEach(([k])=>r[k]=valueOf('rv_'+k)===''?null:valueOf('rv_'+k)==='true');REVIEW_TEXT.forEach(([k])=>r[k]=valueOf('rv_'+k));
 if(!draft&&(!c.closedAt||REVIEW_BOOL.some(([k])=>r[k]===null)||REVIEW_TEXT.some(([k])=>!r[k].trim()))){showToast('完成复盘需已清仓，并确认所有问题；暂未完成可以保存草稿');return}
 if(commitV4(()=>{c.reviewHistory=c.reviewHistory||[];if(Object.keys(c.review||{}).length)c.reviewHistory.push(clone(c.review));c.review={...r,updatedAt:nowISO(),completedAt:draft?null:nowISO()}})){showToast(draft?'草稿已保存':'逐笔复盘完成');render()}
}
function startChallenge(){
 if(state.disciplineChallenges.some(x=>x.status==='active')){showToast('已有进行中的挑战');return}
 if(commitV4(()=>{const c={id:id(),startedAt:nowISO(),status:'active',target:20,caseIds:[]};state.disciplineChallenges.push(c);selectedChallengeId=c.id}))render();
}
function finishChallenge(id){
 const ch=state.disciplineChallenges.find(x=>x.id===id);if(!ch)return;
 const cases=[...new Set(ch.caseIds)].map(id=>state.tradeCases.find(x=>x.id===id)).filter(Boolean);
 if(cases.length!==20||cases.some(x=>!x.closedAt||!x.review?.completedAt)){showToast('完成挑战需要20个已清仓且已复盘案例；不按盈亏判断完成');return}
 if(commitV4(()=>{ch.status='completed';ch.completedAt=nowISO()}))render();
}
function challengeMetrics(cases){
 const closed=cases.filter(c=>c.closedAt&&nullable(c.realizedPnl)!==null).sort((a,b)=>a.closedAt.localeCompare(b.closedAt));
 const rs=closed.filter(c=>nullable(c.rMultiple)!==null),wins=rs.filter(c=>c.rMultiple>0),losses=rs.filter(c=>c.rMultiple<0);
 const avg=a=>a.length?a.reduce((s,c)=>s+c.rMultiple,0)/a.length:null;
 let peak=0,cumulative=0,maxDrawdown=0;closed.forEach(c=>{cumulative+=c.realizedPnl;peak=Math.max(peak,cumulative);maxDrawdown=Math.max(maxDrawdown,peak-cumulative)});
 return {closed:closed.length,complete:cases.filter(fullyExecuted).length,systemOut:cases.filter(c=>c.classification==='system_out').length,
  expectancy:avg(rs),rSamples:rs.length,payoff:wins.length&&losses.length?avg(wins)/Math.abs(avg(losses)):null,
  maxDrawdown:closed.length?maxDrawdown:null,
  systemPnl:closed.filter(c=>c.classification==='system_in').reduce((s,c)=>s+c.realizedPnl,0),
  outsidePnl:closed.filter(c=>c.classification==='system_out').reduce((s,c)=>s+c.realizedPnl,0)};
}
function disciplineChallengePage(){
 const ch=state.disciplineChallenges.find(c=>c.id===selectedChallengeId)||state.disciplineChallenges.find(c=>c.status==='active')||state.disciplineChallenges.at(-1);
 if(!ch)return wrap('20笔系统执行挑战','<p>连续记录接下来的20次从建仓到清仓的案例；实验和系统外同样计入，不能挑选盈利样本。</p><button class="btn" onclick="startChallenge()">开始挑战</button>');
 selectedChallengeId=ch.id;const cases=ch.caseIds.map(id=>state.tradeCases.find(x=>x.id===id)).filter(Boolean),m=challengeMetrics(cases);
 const num=v=>v===null?'—':v.toFixed(2);
 const metrics=[['案例进度',cases.length+'/20'],['已清仓',m.closed],['完整执行',m.complete+'/20'],['系统外次数',m.systemOut],['Expectancy',num(m.expectancy)+' R'],['平均盈亏比',num(m.payoff)],['已实现曲线回撤',m.maxDrawdown===null?'—':yuan(m.maxDrawdown)],['系统内净盈亏',yuan(m.systemPnl)],['系统外净盈亏',yuan(m.outsidePnl)]];
 const groups=new Map();cases.forEach(c=>{const key=c.setupId||'unclassified';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)});
 return wrap('20笔系统执行挑战 · 执行优先',`
 ${select4('ch_pick','挑战记录',state.disciplineChallenges.map(c=>[c.id,c.startedAt+' · '+c.status]),ch.id,'onchange="selectedChallengeId=this.value;render()"')}
 <p class="philosophy">符合系统但亏钱可以是合格交易；违反系统但赚钱不能抵消执行问题。</p>
 <div class="metrics4">${metrics.map(([l,v])=>`<div class="dashMetric"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>
 <p class="hint">Expectancy = 已清仓且R已知案例的平均R（${m.rSamples}个样本）；盈亏比 = 平均正R / 平均负R绝对值。无样本显示—。回撤为按清仓时间排序的累计已实现净盈亏回撤（元），不是账户净值回撤。</p>
 <div class="tableWrap"><table><tr><th># / 股票</th><th>战法</th><th>分类</th><th>过程评分</th><th>净盈亏</th><th>R</th><th>研究</th></tr>
 ${cases.map((c,i)=>`<tr><td>${i+1} · ${esc(c.name)}</td><td>${esc(c.setupName||'—')}</td><td>${esc(caseCategory(c))}</td><td>${executionScore(c)??'待完成'}</td><td>${yuan(c.realizedPnl)}</td><td>${num(nullable(c.rMultiple))}</td><td><button class="btn alt small" onclick="selectedReviewId=${arg(c.id)};goStep(12)">复盘</button></td></tr>`).join('')}</table></div>
 <h3>战法样本（含版本变化，查看案例可见入场版本）</h3><div class="tableWrap"><table><tr><th>战法</th><th>已清仓样本</th><th>胜率</th><th>平均R</th></tr>
 ${[...groups.values()].map(g=>{const a=g.filter(c=>c.closedAt&&nullable(c.realizedPnl)!==null);const mm=challengeMetrics(g);return `<tr><td>${esc(g[0].setupName||'未定义')}</td><td>${a.length}</td><td>${a.length?(a.filter(c=>c.realizedPnl>0).length/a.length*100).toFixed(1)+'%':'—'}</td><td>${num(mm.expectancy)}</td></tr>`}).join('')}</table></div>
 <p class="hint">评分：事先系统内入场、实际及自评仓位合规、按计划卖出、无临盘改计划、盈亏不影响下一笔，各20分。未复盘不评分；100分且最终系统内才计完整执行。</p>
 ${ch.status==='active'?`<button class="btn" onclick="finishChallenge(${arg(ch.id)})">完成本轮挑战</button>`:'<button class="btn" onclick="startChallenge()">开始下一轮</button>'}`);
}

function enrichAI(snapshot,d){
 snapshot.meta.schemaVersion='2.0';snapshot.meta.appVersion='4.0';
 snapshot.candidatePool=clean(d.candidatePool);
 snapshot.executionDecisions=clean(d.executionDecisions);
 const ids=new Set([...d.candidatePool.map(c=>c.setupId),...d.executionDecisions.map(c=>c.setupId),...d.stocks.map(s=>s.setupId)]);
 snapshot.setupLibrary=clean(state.setupLibrary.filter(s=>ids.has(s.id)));
 const caseIds=new Set(d.ledger.map(l=>l.tradeCaseId));
 snapshot.tradeCases=clean(state.tradeCases.filter(c=>caseIds.has(c.id)||!c.closedAt));
 snapshot.disciplineChallenges=clean(state.disciplineChallenges);
 snapshot.riskPolicy={experimentMaxPositionPct:5,experimentPromotionCases:5};
 snapshot.dataQuality.notes.push('行情条件是用户声明，未接入实时行情；本地时间戳不是券商或可信服务器证明。','R以首次建仓冻结的初始风险金额为分母，加仓不会重写；缺失初始止损时保持null。');
 return snapshot;
}
function radarMode(){try{return localStorage.getItem('tradeos_radar_mode')||'compact'}catch{return 'compact'}}
function setRadarMode(mode){try{localStorage.setItem('tradeos_radar_mode',mode)}catch{}renderDisciplineRadar(day())}
function renderDisciplineRadar(d){
 let el=document.getElementById('disciplineRadar');if(!el){el=document.createElement('aside');el.id='disciplineRadar';document.body.appendChild(el)}
 if(!d){el.hidden=true;return}el.hidden=false;
 const mode=radarMode(),alerts=dashboardWarnings(d,recomputeAccount(d)),motto=V4_PHILOSOPHY[(Number(d.date.replaceAll('-',''))||0)%V4_PHILOSOPHY.length];
 el.className='radar4 '+mode;
 if(mode==='hidden'){el.innerHTML='<button class="btn alt" aria-label="重新打开纪律提醒" onclick="setRadarMode(\'compact\')">♧ 提醒 '+alerts.length+'</button>';return}
 el.innerHTML=`<div class="radarControls"><button onclick="setRadarMode('expanded')" aria-expanded="${mode==='expanded'}">纪律提醒 · ${alerts.length}条</button><button onclick="setRadarMode('compact')" aria-label="收起提醒">收起</button><button onclick="setRadarMode('hidden')" aria-label="关闭提醒">×</button></div><p>${esc(motto)}</p>${mode==='expanded'?`<ol>${alerts.map(x=>`<li>${esc(x.text)}</li>`).join('')||'<li>暂无提醒；不代表没有风险。</li>'}</ol>`:`<small>${esc(alerts[0]?.text||'暂无记录触发的提醒')}</small>`}`;
}
function mountV4(d){
 document.body.classList.toggle('fast-mode',currentStep===17);
 const main=document.getElementById('app');
 if(currentStep===0||currentStep===1){
  main.insertAdjacentHTML('afterbegin',`<section class="journey4"><div><p class="eyebrow">TRADEOS / V4.0</p><h2>盘前想慢，盘中动快，盘后想透。</h2></div><div class="journeyButtons"><button onclick="goStep(16)">盘前计划<span>候选与预案</span></button><button onclick="goStep(17)">⚡ 盘中执行<span>下单前检查</span></button><button onclick="goStep(12)">盘后研究<span>案例与纪律</span></button></div></section>`);
 }
 if(currentStep===1){
  main.insertAdjacentHTML('beforeend',wrap('今日预期与行动',text(d.aiPlan,'expectation','市场预期')+text(d.aiPlan,'actions','账户待执行计划')));
  bind();
 }
 if(currentStep===10){
  const stock=document.getElementById('lg_stock');stock?.closest('.grid')?.insertAdjacentHTML('beforebegin',ledgerResearchControls(d));
  const t=d.executionDecisions.find(t=>t.id===d.pendingDecisionId);if(t&&stock)stock.value=t.stockId;
 }
 if(currentStep===12)main.insertAdjacentHTML('afterbegin',reviewResearchPage());
 if(currentStep===13)main.insertAdjacentHTML('afterbegin','<div class="card"><button class="btn" onclick="goStep(18)">20笔系统执行挑战</button><p>旧卖出复盘与V4案例分开统计，不将同一成交重复计数。</p></div>');
 if(currentStep===7){
  const picker=main.querySelector('select[data-key="model"]');
  if(picker){const current=currentStock(d);const names=[...new Set([...models,...state.setupLibrary.map(s=>s.name),current?.model].filter(Boolean))];picker.innerHTML='<option value="">请选择</option>'+names.map(x=>option4(x,x,current?.model)).join('');picker.value=current?.model||'';
   picker.addEventListener('change',()=>{if(current){current.setupId=state.setupLibrary.find(x=>x.name===picker.value)?.id||null;save()}})}
 }
 let quick=document.getElementById('quick4');if(!quick){quick=document.createElement('button');quick.id='quick4';quick.className='quick4';quick.textContent='⚡ 极速';quick.onclick=()=>goStep(17);document.body.appendChild(quick)}quick.hidden=currentStep===17;
 const label=document.querySelector('#app>section.card>h2');if(label?.textContent.includes('V3.1'))label.textContent=label.textContent.replace('V3.1','V4.0');
 const edit=main.querySelector('button[onclick="goStep(0)"]');if(currentStep===1&&edit)edit.setAttribute('onclick','goStep(1)');
}
