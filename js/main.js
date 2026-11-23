// ASTRA: each glossary entry is a separate editable JSON file.
// manifest.json lists their filenames; add a new filename when adding a term.

const app = document.querySelector('#app');
let entries = [];

const escapeHTML = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const safeExternal = u => /^https:\/\//.test(u || '') ? u : '';

const heroVisual = `
<svg viewBox="0 0 420 300" role="img" aria-label="Stylized orbital paths">
  <g transform="translate(210 150) rotate(-21)" fill="none" stroke="#526a8c" stroke-width="1.5">
    <ellipse rx="61" ry="28"/>
    <ellipse rx="107" ry="49"/>
    <ellipse rx="157" ry="77"/>
    <ellipse rx="198" ry="104"/>
    <circle r="18" fill="#f0cc91" stroke="none"/>
    <circle cx="58" cy="-12" r="7" fill="#83b7d8" stroke="none"/>
    <circle cx="-103" cy="5" r="8" fill="#c4d2de" stroke="none"/>
    <circle cx="145" cy="-36" r="11" fill="#d4a88f" stroke="none"/>
  </g>
  <g fill="#a0b8d1">
    ${Array.from({length: 30}, (_, i) =>
      `<circle cx="${(i * 67 + 31) % 420}" cy="${(i * 43 + 17) % 300}" r="${i % 5 ? 0.8 : 1.5}" opacity=".65"/>`
    ).join('')}
  </g>
</svg>`;

function home() {
  app.innerHTML = `
  <div class="hero">
    <div>
      <div class="section-label">Introductory Astronomy · Learning Companion</div>
      <h1>Explore the universe, one concept at a time.</h1>
      <p class="lede">Clear explanations, connected concepts, and interactive scientific models — built to complement the course notes.</p>
      <a class="chip" href="#glossary">Explore glossary →</a>
    </div>
    <div class="starfield">${heroVisual}</div>
  </div>
  <div class="cards">
    <a class="card" href="#glossary">
      <div class="glyph">▤</div>
      <h2>Glossary</h2>
      <p>Understand the language of astronomy.</p>
    </a>
    <a class="card" href="#visual">
      <div class="glyph">◎</div>
      <h2>Visual Universe</h2>
      <p>Explore physical relationships through interaction.</p>
    </a>
    <a class="card" href="#roadmap">
      <div class="glyph">✧</div>
      <h2>Course Roadmap</h2>
      <p>See how ideas connect across units.</p>
    </a>
    <div class="card">
      <div class="glyph">∑</div>
      <h2>Formula Guide</h2>
      <p>Planned: key relationships and when they apply.</p>
    </div>
  </div>`;
}

function glossary() {
  app.innerHTML = `
  <div class="section-label">ASTRA / KNOWLEDGE BASE</div>
  <h1>Glossary</h1>
  <p class="lede">Search the terminology behind the sky. Entries marked Draft are not instructor-reviewed.</p>
  <input class="search" id="search" placeholder="Search a concept or unit..." aria-label="Search glossary">
  <div class="term-list" id="terms"></div>`;

  const input = document.querySelector('#search');
  input.addEventListener('input', () => renderTerms(input.value));
  renderTerms('');
}

function renderTerms(q) {
  const el = document.querySelector('#terms');
  if (!el) return;

  const filtered = entries.filter(x =>
    [x.term, x.category, x.definition, `Unit ${x.unit}`]
      .join(' ')
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  el.innerHTML = filtered.length
    ? filtered.map(x => `
      <a class="term"
         href="#term/${encodeURIComponent(x.term)}">

        <strong>${escapeHTML(x.term)}</strong>

        <small>
          ${escapeHTML(x.category)} · Unit ${x.unit}
        </small>

        <div>
          <span class="pill ${x.level === 'core' ? 'core' : ''}">
            ${escapeHTML(x.level)}
          </span>
        </div>

      </a>
    `).join('')
    : '<div class="empty">No matching concepts yet.</div>';
}



// Format simple Markdown in definitions.
// Supports **bold**, paragraphs, and line breaks.

function formatDefinition(text) {

  const safeText = escapeHTML(
    Array.isArray(text) ? text.join('\n\n') : (text || '')
  );

  const boldText = safeText.replace(
    /\*\*(.+?)\*\*/g,
    '<strong>$1</strong>'
  );

  return boldText
    .split(/\n\s*\n/)
    .map(paragraph =>
      `<p>${paragraph.replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}

// Normalize names for case-insensitive matching.
function normalizeTerm(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Find a concept by its name.
function findConcept(name) {
  return entries.find(
    entry => normalizeTerm(entry.term) === normalizeTerm(name)
  );
}

// Find both direct and reverse relationships.
function getRelatedConcepts(current) {

  const result = new Map();

  // 1. Concepts explicitly linked by this entry.
  for (const name of current.related || []) {

    const concept = findConcept(name);

    if (concept && concept.term !== current.term) {
      result.set(normalizeTerm(concept.term), concept);
    }
  }

  // 2. Concepts that link back to this entry.
  for (const entry of entries) {

    if (entry.term === current.term) continue;

    const linksBack = (entry.related || []).some(
      name => normalizeTerm(name) === normalizeTerm(current.term)
    );

    if (linksBack) {
      result.set(normalizeTerm(entry.term), entry);
    }
  }

  return [...result.values()].sort(
    (a, b) => a.term.localeCompare(b.term)
  );
}


// Display one glossary entry.

function detail(term) {

  const entry = entries.find(x => x.term === term);

  if (!entry) {
    app.innerHTML = `
      <p>Concept not found.</p>
      <a href="#glossary">Back to glossary</a>
    `;
    return;
  }

  // Accept both old IDs and new term names
  // while we migrate existing entries.

  const relatedEntries = getRelatedConcepts(entry);

  // Support old and new resource formats during migration.

  const resources = entry.moreResources
    || (entry.furtherReading ? [entry.furtherReading] : []);

  const resourceList = Array.isArray(resources)
    ? resources
    : [resources];

  const relatedHTML = relatedEntries.map(x => `
    <a class="chip"
       href="#term/${encodeURIComponent(x.term)}">
      ${escapeHTML(x.term)} →
    </a>
  `).join('');

  const resourcesHTML = resourceList
    .filter(r => safeExternal(r.url))
    .map(r => `
      <p>
        <a class="further"
           href="${escapeHTML(r.url)}"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHTML(r.title || 'Read more')} ↗
        </a>
      </p>
    `).join('');

  app.innerHTML = `
    <article class="detail">

      <a class="back" href="#glossary">
        ← All concepts
      </a>

      <div class="section-label">
        ${escapeHTML(entry.category)}
        · UNIT ${escapeHTML(entry.unit)}
      </div>

      <h1>${escapeHTML(entry.term)}</h1>

      <span class="pill ${entry.level === 'core' ? 'core' : ''}">
        ${escapeHTML(entry.level)} concept
      </span>

      <section>
        <h3>Definition</h3>
        ${formatDefinition(entry.definition)}
      </section>

      <section>
        <h3>Related Concepts</h3>
        <div class="chips">
          ${relatedHTML ||
            '<span class="muted">Coming soon</span>'}
        </div>
      </section>

      <section>
        <h3>More Resources</h3>
        ${resourcesHTML ||
          '<p class="muted">Coming soon</p>'}
      </section>

    </article>
  `;
}

function visual() {
  app.innerHTML = `
  <div class="section-label">ASTRA / INTERACTIVE LEARNING</div>
  <h1>Visual Universe</h1>
  <p class="lede">The first demonstration explores Earth’s rotation and the apparent motion of the sky.</p>
  <div class="lab">
    <iframe src="models/rotating-earth.html" title="Rotating Earth interactive model"></iframe>
  </div>
  <p class="muted">Simplified scientific demonstration, not to scale.</p>`;
}

function roadmap() {
  const units = [
    ['01', 'Coordinates and the Spinning Sky', 'Celestial sphere, coordinates, sidereal time, small-angle approximation.'],
    ['02', 'Things that Move', 'Sun and Moon cycles, seasons, eclipses, planetary motion.'],
    ['03', 'Newton and Gravity', 'Motion, forces, conservation laws, gravitation.']
  ];

  app.innerHTML = `
  <div class="section-label">ASTRA / COURSE MAP</div>
  <h1>Course Roadmap</h1>
  <p class="lede">A conceptual journey from observing the sky to explaining motion.</p>
  ${units.map(a => `
    <div class="roadmap-item">
      <div class="section-label">UNIT ${a[0]}</div>
      <strong>${a[1]}</strong>
      <p class="muted">${a[2]}</p>
    </div>`).join('')}`;
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1) || 'home');
  const [page, ...idParts] = hash.split('/');

  document.querySelectorAll('[data-nav]').forEach(a =>
    a.classList.toggle('active', a.dataset.nav === (page === 'term' ? 'glossary' : page))
  );

  if (page === 'glossary') glossary();
  else if (page === 'term') detail(idParts.join('/'));
  else if (page === 'visual') visual();
  else if (page === 'roadmap') roadmap();
  else home();

  window.scrollTo(0, 0);
}

async function init() {
  try {
    // Load the automatically generated glossary index.
    const response = await fetch(
      'content/glossary-index.json'
    );

    if (!response.ok) {
      throw new Error(
        'Could not load generated glossary index'
      );
    }

    entries = await response.json();

    if (!Array.isArray(entries)) {
      throw new Error('Unexpected glossary format');
    }

  } catch (error) {

    console.error(error);

    app.innerHTML = `
      <div class="empty">
        Unable to load ASTRA Glossary:
        ${escapeHTML(error.message)}
      </div>
    `;

    return;
  }

  route();
  window.addEventListener('hashchange', route);
}

init();
