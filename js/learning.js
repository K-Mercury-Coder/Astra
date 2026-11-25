/* ASTRA Learning — Formula and Model views. No dependencies. */
window.ASTRA_LEARNING = (() => {
  const html = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = url => /^https:\/\//i.test(url || '') ? url : '';
  const app = () => document.getElementById('app');
  let formulaData,modelData;
  async function getData(which) {
    if(which==='formula' && formulaData) return formulaData;
    if(which==='model' && modelData) return modelData;
    const r=await fetch('content/'+(which==='formula'?'formula-index.json':'model-index.json'));
    if(!r.ok) throw new Error('Cannot load '+which+' index');
    const data=await r.json(); if(!Array.isArray(data))throw new Error('Invalid data');
    if(which==='formula')formulaData=data;else modelData=data;
    return data;
  }
  const related = arr => (arr||[]).map(t=>`<a class="chip" href="#term/${encodeURIComponent(t)}">${html(t)} ↗</a>`).join('');
  async function render(page,slug) {
    try {
      if(page==='formulas') {
        const list=await getData('formula');
        app().innerHTML=`<div class="section-label">ASTRA / FORMULA GUIDE</div><h1>Formula Guide</h1><p class="lede">What each relationship means, when it applies, and what to avoid.</p><div class="term-list">${list.map(f=>`<a class="term" href="#formula/${encodeURIComponent(f.slug)}"><strong>${html(f.title)}</strong><small>Unit ${html(f.unit)} · ${html(f.category)}</small><div class="astro-formula">${html(f.expression)}</div></a>`).join('')}</div>`;
      } else if(page==='formula') {
        const list=await getData('formula'),f=list.find(x=>x.slug===slug);
        if(!f) throw new Error('Formula not found: '+slug);
        const modelLink=f.model?`<a class="chip" href="#model/${encodeURIComponent(f.model)}">Open interactive model ↗</a>`:'';
        app().innerHTML=`<article class="detail"><a class="back" href="#formulas">← All formulas</a><div class="section-label">UNIT ${html(f.unit)} · ${html(f.category)}</div><h1>${html(f.title)}</h1><div class="astro-formula astro-big">${html(f.expression)}</div><section><h3>Physical Meaning</h3><p>${html(f.meaning)}</p></section><section><h3>Variables</h3><p>${html(f.variables)}</p></section><section><h3>When Can I Use It?</h3><p>${html(f.conditions)}</p></section><section><h3>Common Mistake</h3><p>${html(f.commonMistake)}</p></section><section><h3>Related Concepts</h3><div class="chips">${related(f.related)}</div></section>${f.model?`<section><h3>Explore</h3>${modelLink}</section>`:''}<section><h3>Course Source</h3><p>${html(f.source)}</p></section></article>`;
      } else if(page==='visual') {
        const list=await getData('model');
        app().innerHTML=`<div class="section-label">ASTRA / VISUAL UNIVERSE</div><h1>Interactive Models</h1><p class="lede">Change a parameter. Predict what will happen. Test your idea.</p><div class="cards">${list.map(m=>`<a class="card" href="#model/${encodeURIComponent(m.slug)}"><div class="glyph">◎</div><h2>${html(m.title)}</h2><p>Unit ${html(m.unit)} · ${html(m.description)}</p></a>`).join('')}</div>`;
      } else if(page==='model') {
        const list=await getData('model'),m=list.find(x=>x.slug===slug);
        if(!m) throw new Error('Model not found: '+slug);
        const resource=(m.resources||[]).filter(r=>safeURL(r.url)).map(r=>`<p><a class="further" href="${html(r.url)}" target="_blank" rel="noopener noreferrer">${html(r.title)} ↗</a></p>`).join('');
        app().innerHTML=`<article class="detail"><a class="back" href="#visual">← All interactive models</a><div class="section-label">UNIT ${html(m.unit)} · ${html(m.category)}</div><h1>${html(m.title)}</h1><p class="lead">${html(m.description)}</p><div class="lab"><iframe title="${html(m.title)} interactive model" src="${html(m.file)}" loading="lazy" style="min-height:740px;width:100%;border:0"></iframe></div><section><h3>Related Concepts</h3><div class="chips">${related(m.related)}</div></section>${m.formulas?.length?`<section><h3>Related Formulas</h3><div class="chips">${m.formulas.map(s=>`<a class="chip" href="#formula/${encodeURIComponent(s)}">${html(s)} ↗</a>`).join('')}</div></section>`:''}<section><h3>More Resources</h3>${resource||'<p>Coming soon.</p>'}</section><p class="muted">${html(m.source)}</p></article>`;
      }
    } catch(ex) {app().innerHTML=`<p>Unable to load learning content: ${html(ex.message)}</p>`;console.error(ex)}
  }
  return {render};
})();
