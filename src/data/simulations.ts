// Built-in interactive HTML simulations for educational science resources
// Completely sandboxed, self-contained HTML/CSS/JS

export const SIMULATION_RUTHERFORD = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Cairo', sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; text-align: center; }
  h2 { color: #38bdf8; margin-bottom: 8px; font-size: 22px; }
  p { color: #94a3b8; font-size: 14px; margin-bottom: 16px; }
  .canvas-container { position: relative; display: inline-block; border: 2px solid #334155; border-radius: 12px; overflow: hidden; background: #020617; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  canvas { display: block; }
  .controls { margin-top: 16px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; align-items: center; }
  button { background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  button:hover { background: #0ea5e9; }
  .stat-badge { background: #1e293b; padding: 6px 14px; border-radius: 8px; border: 1px solid #334155; font-size: 13px; color: #cbd5e1; }
  .stat-badge span { color: #38bdf8; font-weight: bold; }
  .legend { display: flex; justify-content: center; gap: 16px; margin-top: 12px; font-size: 12px; color: #94a3b8; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-left: 6px; }
</style>
</head>
<body>
  <h2>تجربة رذرفورد على صفيحة الذهب (1911)</h2>
  <p>أطلق جسيمات ألفا (نواة الهيليوم) باتجاه شريحة رقيقة من ذرات الذهب وراقب مسارها</p>
  
  <div class="canvas-container">
    <canvas id="simCanvas" width="700" height="380"></canvas>
  </div>

  <div class="controls">
    <button onclick="toggleGun()" id="gunBtn">إيقاف / تشغيل القاذف</button>
    <button onclick="clearTrails()">مسح المسارات</button>
    <div class="stat-badge">الجسيمات النافذة مباشرة: <span id="straightCount">0</span></div>
    <div class="stat-badge">المنحرفة بزاوية: <span id="deflectedCount">0</span></div>
    <div class="stat-badge">المرتدة للخلف: <span id="bouncedCount">0</span></div>
  </div>

  <div class="legend">
    <div><span class="dot" style="background:#eab308"></span> نواة الذهب الموجبة الثقيلة</div>
    <div><span class="dot" style="background:#ef4444"></span> جسيم ألفا (+)</div>
    <div><span class="dot" style="background:#38bdf8"></span> ذرة الذهب (فراغ هائل)</div>
  </div>

<script>
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  let running = true;
  let straight = 0, deflected = 0, bounced = 0;

  const nuclei = [
    { x: 350, y: 100, r: 8 },
    { x: 350, y: 190, r: 8 },
    { x: 350, y: 280, r: 8 }
  ];

  let particles = [];

  function spawnParticle() {
    if (!running) return;
    particles.push({
      x: 20,
      y: 40 + Math.random() * 300,
      vx: 4.5,
      vy: (Math.random() - 0.5) * 0.4,
      trail: [],
      state: 'straight'
    });
  }

  function update() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Gold Atoms boundary
    nuclei.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Nucleus
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#facc15';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 25) p.trail.shift();

      nuclei.forEach(n => {
        let dx = p.x - n.x;
        let dy = p.y - n.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Electrostatic repulsion (Coulomb force)
        if (dist < 45) {
          let force = 180 / (dist * dist + 1);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;

          if (p.vx < 0 && p.state !== 'bounced') {
            p.state = 'bounced';
            bounced++;
            document.getElementById('bouncedCount').innerText = bounced;
          } else if (Math.abs(p.vy) > 1.2 && p.state === 'straight') {
            p.state = 'deflected';
            deflected++;
            document.getElementById('deflectedCount').innerText = deflected;
          }
        }
      });

      p.x += p.vx;
      p.y += p.vy;

      // Draw Trail
      ctx.beginPath();
      ctx.strokeStyle = p.state === 'bounced' ? 'rgba(239, 68, 68, 0.7)' : (p.state === 'deflected' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(56, 189, 248, 0.5)');
      ctx.lineWidth = 2;
      for (let t = 0; t < p.trail.length; t++) {
        if (t === 0) ctx.moveTo(p.trail[t].x, p.trail[t].y);
        else ctx.lineTo(p.trail[t].x, p.trail[t].y);
      }
      ctx.stroke();

      // Draw particle head
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Check boundary
      if (p.x > canvas.width || p.x < 0 || p.y < 0 || p.y > canvas.height) {
        if (p.state === 'straight') {
          straight++;
          document.getElementById('straightCount').innerText = straight;
        }
        particles.splice(i, 1);
      }
    }

    requestAnimationFrame(update);
  }

  setInterval(spawnParticle, 120);
  requestAnimationFrame(update);

  function toggleGun() {
    running = !running;
    document.getElementById('gunBtn').innerText = running ? 'إيقاف القاذف' : 'تشغيل القاذف';
  }

  function clearTrails() {
    particles = [];
    straight = 0; deflected = 0; bounced = 0;
    document.getElementById('straightCount').innerText = '0';
    document.getElementById('deflectedCount').innerText = '0';
    document.getElementById('bouncedCount').innerText = '0';
  }
</script>
</body>
</html>`;

export const SIMULATION_METALS = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Cairo', sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
  h2 { color: #0284c7; text-align: center; margin-bottom: 6px; font-size: 20px; }
  p.subtitle { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 900px; margin: 0 auto; }
  .tube-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .tube-title { font-weight: bold; font-size: 15px; margin-bottom: 8px; color: #0f172a; }
  .tube-container { height: 160px; width: 50px; margin: 0 auto 12px; border: 3px solid #94a3b8; border-top: none; border-radius: 0 0 25px 25px; position: relative; background: #f1f5f9; overflow: hidden; }
  .liquid { position: absolute; bottom: 0; left: 0; right: 0; height: 110px; background: rgba(56, 189, 248, 0.4); transition: background 0.4s; }
  .metal-piece { position: absolute; bottom: 8px; left: 15px; width: 14px; height: 14px; border-radius: 3px; background: #64748b; }
  .bubble { position: absolute; background: white; border-radius: 50%; opacity: 0.8; animation: rise 1.2s infinite ease-in; }
  @keyframes rise {
    0% { transform: translateY(0) scale(0.6); opacity: 0.8; }
    100% { transform: translateY(-90px) scale(1.2); opacity: 0; }
  }
  .info-box { font-size: 12px; color: #475569; min-height: 48px; line-height: 1.4; margin-top: 8px; }
  .btn-react { background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: bold; margin-top: 6px; }
  .btn-react:hover { background: #0369a1; }
  .active-flame { position: absolute; bottom: 12px; left: 10px; width: 24px; height: 24px; border-radius: 50%; filter: blur(2px); animation: pulse 0.6s infinite alternate; }
  @keyframes pulse { from { opacity: 0.6; transform: scale(0.9); } to { opacity: 1; transform: scale(1.2); } }
  .summary { max-width: 900px; margin: 24px auto 0; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #0369a1; }
</style>
</head>
<body>
  <h2>محاكاة سلسلة النشاط الكيميائي للفلزات (مع حمض HCl)</h2>
  <p class="subtitle">اضغط على زر التفاعل لمشاهدة سرعة انطلاق غاز الهيدروجين وشكل التفاعل في الأنبوب</p>

  <div class="grid">
    <!-- Potassium -->
    <div class="tube-card">
      <div class="tube-title">البوتاسيوم (K)</div>
      <div class="tube-container">
        <div class="liquid" id="liq-k"></div>
        <div class="metal-piece" style="background:#a855f7;"></div>
        <div id="flame-k"></div>
        <div id="bubbles-k"></div>
      </div>
      <button class="btn-react" onclick="react('k', 40, 'تفاعل انفجاري عنيف مع لهب بنفسجي وانطلاق كثيف لغاز الهيدروجين!', '#fed7aa', true)">بدء التفاعل</button>
      <div class="info-box" id="info-k">أنشط الفلزات وأشدها تفاعلاً.</div>
    </div>

    <!-- Magnesium -->
    <div class="tube-card">
      <div class="tube-title">المغنيسيوم (Mg)</div>
      <div class="tube-container">
        <div class="liquid" id="liq-mg"></div>
        <div class="metal-piece" style="background:#cbd5e1;"></div>
        <div id="bubbles-mg"></div>
      </div>
      <button class="btn-react" onclick="react('mg', 20, 'تفاعل سريع جداً وفقاعات هيدروجين وفيرة مع ارتفاع حرارة الأنبوب.', '#e0f2fe', false)">بدء التفاعل</button>
      <div class="info-box" id="info-mg">تفاعل نشط وسريع مع إطلاق فقاعات.</div>
    </div>

    <!-- Zinc -->
    <div class="tube-card">
      <div class="tube-title">الخارصين (Zn)</div>
      <div class="tube-container">
        <div class="liquid" id="liq-zn"></div>
        <div class="metal-piece" style="background:#94a3b8;"></div>
        <div id="bubbles-zn"></div>
      </div>
      <button class="btn-react" onclick="react('zn', 10, 'تفاعل معتدل تصاعد منتظم لفقاعات غاز الهيدروجين.', '#f1f5f9', false)">بدء التفاعل</button>
      <div class="info-box" id="info-zn">نشاط متوسط، فقاعات مستمرة بمعدل منتظم.</div>
    </div>

    <!-- Copper -->
    <div class="tube-card">
      <div class="tube-title">النحاس (Cu)</div>
      <div class="tube-container">
        <div class="liquid" id="liq-cu"></div>
        <div class="metal-piece" style="background:#d97706;"></div>
        <div id="bubbles-cu"></div>
      </div>
      <button class="btn-react" onclick="react('cu', 0, 'لا يحدث تفاعل لأن النحاس يلي الهيدروجين في سلسلة النشاط.', '#e2e8f0', false)">بدء التفاعل</button>
      <div class="info-box" id="info-cu">خامل مع الأحماض المخففة، لا تنطلق أي فقاعات.</div>
    </div>
  </div>

  <div class="summary">
    <strong>قاعدة علمية:</strong> ترتب الفلزات تنازلياً حسب نشاطها الكيميائي: K > Na > Ca > Mg > Al > Zn > Fe > Pb > (H) > Cu > Ag > Au. الفلزات التي تسبق الهيدروجين تحل محله في محاليل الأحماض المخففة.
  </div>

<script>
  function react(id, count, text, color, flame) {
    const box = document.getElementById('bubbles-' + id);
    const info = document.getElementById('info-' + id);
    const liq = document.getElementById('liq-' + id);
    const flm = document.getElementById('flame-' + id);
    
    box.innerHTML = '';
    info.innerText = text;
    liq.style.background = color;

    if (flame && flm) {
      flm.className = 'active-flame';
      flm.style.background = '#c084fc';
    }

    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.style.left = (8 + Math.random() * 30) + 'px';
      b.style.bottom = (8 + Math.random() * 20) + 'px';
      b.style.width = (4 + Math.random() * 6) + 'px';
      b.style.height = b.style.width;
      b.style.animationDuration = (0.6 + Math.random() * 0.8) + 's';
      b.style.animationDelay = (Math.random() * 0.5) + 's';
      box.appendChild(b);
    }
  }
</script>
</body>
</html>`;

export const SIMULATION_CELL = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Cairo', sans-serif; background: #f0fdf4; color: #166534; padding: 20px; }
  h2 { text-align: center; color: #15803d; font-size: 22px; margin-bottom: 6px; }
  p.desc { text-align: center; color: #4ade80; color: #15803d; font-size: 14px; margin-bottom: 16px; }
  .cell-wrapper { display: flex; flex-direction: column; align-items: center; max-width: 800px; margin: 0 auto; gap: 20px; }
  svg { max-width: 100%; height: auto; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.08)); cursor: pointer; }
  .organelle { transition: all 0.25s; }
  .organelle:hover { filter: brightness(1.2) drop-shadow(0 0 8px #22c55e); transform: scale(1.02); }
  .info-panel { width: 100%; background: white; border: 2px solid #86efac; border-radius: 16px; padding: 18px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .info-title { font-size: 18px; font-weight: bold; color: #15803d; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .info-text { font-size: 14px; color: #374151; line-height: 1.6; }
</style>
</head>
<body>
  <h2>المستكشف التفاعلي: تركيب الخلية الحيوانية</h2>
  <p class="desc">انقر على أي جزء من أجزاء الخلية للتعرف على تركيبه ووظيفته الحيوية</p>

  <div class="cell-wrapper">
    <svg viewBox="0 0 600 360" width="550" height="330">
      <!-- Cytoplasm & Membrane -->
      <path class="organelle" onclick="selectOrganelle('cytoplasm')" d="M120,60 C260,20 460,40 520,120 C570,190 530,300 420,330 C300,360 160,330 80,260 C20,180 40,90 120,60 Z" fill="#dcfce7" stroke="#22c55e" stroke-width="6"/>

      <!-- Nucleus -->
      <g class="organelle" onclick="selectOrganelle('nucleus')">
        <circle cx="280" cy="180" r="65" fill="#f43f5e" opacity="0.85" stroke="#be123c" stroke-width="4"/>
        <circle cx="280" cy="180" r="26" fill="#881337"/>
        <text x="280" y="225" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">النواة</text>
      </g>

      <!-- Mitochondria 1 -->
      <g class="organelle" onclick="selectOrganelle('mitochondria')">
        <ellipse cx="140" cy="130" rx="35" ry="18" fill="#f97316" stroke="#c2410c" stroke-width="3" transform="rotate(-25 140 130)"/>
        <path d="M120,130 Q140,115 160,130" stroke="#fff" stroke-width="2" fill="none" transform="rotate(-25 140 130)"/>
        <text x="140" y="155" text-anchor="middle" fill="#7c2d12" font-size="11" font-weight="bold">ميتوكندريا</text>
      </g>

      <!-- Mitochondria 2 -->
      <g class="organelle" onclick="selectOrganelle('mitochondria')">
        <ellipse cx="440" cy="230" rx="35" ry="18" fill="#f97316" stroke="#c2410c" stroke-width="3" transform="rotate(30 440 230)"/>
        <path d="M420,230 Q440,215 460,230" stroke="#fff" stroke-width="2" fill="none" transform="rotate(30 440 230)"/>
      </g>

      <!-- Endoplasmic Reticulum -->
      <g class="organelle" onclick="selectOrganelle('er')">
        <path d="M210,140 C190,120 200,90 230,100 C250,80 280,100 290,110" fill="none" stroke="#a855f7" stroke-width="8" stroke-linecap="round"/>
        <text x="230" y="80" text-anchor="middle" fill="#6b21a8" font-size="11" font-weight="bold">الشبكة الإندوبلازمية</text>
      </g>

      <!-- Golgi Apparatus -->
      <g class="organelle" onclick="selectOrganelle('golgi')">
        <path d="M390,120 Q420,100 450,130 M395,135 Q425,115 455,145 M400,150 Q430,130 460,160" fill="none" stroke="#3b82f6" stroke-width="6" stroke-linecap="round"/>
        <text x="440" y="100" text-anchor="middle" fill="#1d4ed8" font-size="11" font-weight="bold">جهاز جولجي</text>
      </g>
    </svg>

    <div class="info-panel" id="panel">
      <div class="info-title" id="panel-title">🔬 اضغط على أي عضية لاستكشافها</div>
      <div class="info-text" id="panel-text">الخلية الحيوانية هي الوحدة البنائية الأساسية في أجسام الحيوانات، وهي محاطة بغشاء بلازمي مرن ولا تحتوي على جدار خلوي أو بلاستيدات خضراء.</div>
    </div>
  </div>

<script>
  const data = {
    nucleus: {
      title: '🔴 النواة (Nucleus) والنوية',
      text: 'مركز التحكم والقيادة في الخلية. تحتوي على المادة الوراثية (DNA) المنظمة في صورة كروموسومات، وتشرف على بناء البروتينات وانقسام الخلية وتكاثرها.'
    },
    mitochondria: {
      title: '⚡ الميتوكندريا (Mitochondria) - محطات الطاقة',
      text: 'مسؤولة عن التنفس الخلوي الهوائي وتحويل الجلوكوز إلى جزيئات الطاقة الكيميائية (ATP) التي تحتاجها الخلية للقيام بجميع وظائفها الحيوية.'
    },
    er: {
      title: '🧬 الشبكة الإندوبلازمية (Endoplasmic Reticulum)',
      text: 'شبكة من الأغشية تنقسم إلى خشنة (مغطاة بالريبوسومات لتصنيع البروتينات) وملساء (لبناء الدهون والتخلص من السموم).'
    },
    golgi: {
      title: '📦 جهاز جولجي (Golgi Apparatus)',
      text: 'يعمل كمركز التعديل والتعبئة والشحن؛ يستقبل البروتينات والدهون ويعدلها ثم يغلفها في حويصلات لنقلها داخل الخلية أو إفرازها خارجها.'
    },
    cytoplasm: {
      title: '💧 السيتوبلازم والغشاء البلازمي (Cytoplasm & Membrane)',
      text: 'سائل هلامي يملأ الفراغ داخل الخلية وتسبح فيه العضيات. الغشاء البلازمي يتميز بخاصية النفاذية الاختيارية لتنظيم دخول المواد وخروجها.'
    }
  };

  function selectOrganelle(key) {
    const item = data[key];
    if (item) {
      document.getElementById('panel-title').innerText = item.title;
      document.getElementById('panel-text').innerText = item.text;
    }
  }
</script>
</body>
</html>`;

export const SIMULATION_PUNNETT = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Cairo', sans-serif; background: #faf5ff; color: #581c87; padding: 20px; text-align: center; }
  h2 { color: #7e22ce; font-size: 22px; margin-bottom: 6px; }
  p { color: #6b21a8; font-size: 13px; margin-bottom: 20px; }
  .setup { display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
  .parent-box { background: white; padding: 12px 20px; border-radius: 12px; border: 1px solid #d8b4fe; box-shadow: 0 4px 10px rgba(0,0,0,0.04); }
  label { font-weight: bold; font-size: 13px; display: block; margin-bottom: 6px; }
  select { padding: 6px 12px; border-radius: 8px; border: 1px solid #a855f7; font-size: 14px; font-weight: bold; }
  .table-container { display: inline-block; background: white; padding: 20px; border-radius: 16px; border: 2px solid #c084fc; box-shadow: 0 10px 25px rgba(126,34,206,0.1); }
  table { border-collapse: collapse; margin: 0 auto; }
  td, th { width: 90px; height: 75px; text-align: center; border: 2px solid #e9d5ff; font-size: 18px; font-weight: bold; }
  th { background: #f3e8ff; color: #6b21a8; }
  .gene-cell { background: #faf5ff; transition: 0.3s; }
  .gene-cell:hover { background: #e9d5ff; }
  .dominant { color: #9333ea; font-size: 20px; }
  .sub-ratio { font-size: 11px; color: #7e22ce; margin-top: 4px; }
  .results { max-width: 500px; margin: 20px auto 0; background: white; border-radius: 12px; padding: 14px; border: 1px solid #d8b4fe; text-align: right; font-size: 13px; line-height: 1.8; }
</style>
</head>
<body>
  <h2>مربع بانيت التفاعلي: الوراثة المندلية والتنوع البيولوجي</h2>
  <p>اختر الطراز الجيني للأبوين لمشاهدة النسب الوراثية المتوقعة للأبناء (B: صفة سائدة، b: صفة متنحية)</p>

  <div class="setup">
    <div class="parent-box">
      <label>الأب (الجاميت 1):</label>
      <select id="p1" onchange="calculate()">
        <option value="Bb">Bb (هجين سائد)</option>
        <option value="BB">BB (نقي سائد)</option>
        <option value="bb">bb (نقي متنحٍ)</option>
      </select>
    </div>
    <div class="parent-box">
      <label>الأم (الجاميت 2):</label>
      <select id="p2" onchange="calculate()">
        <option value="Bb">Bb (هجين سائد)</option>
        <option value="BB">BB (نقي سائد)</option>
        <option value="bb">bb (نقي متنحٍ)</option>
      </select>
    </div>
  </div>

  <div class="table-container">
    <table>
      <tr>
        <th style="background:#e9d5ff;">♂ / ♀</th>
        <th id="a1">B</th>
        <th id="a2">b</th>
      </tr>
      <tr>
        <th id="b1">B</th>
        <td class="gene-cell" id="c11"><span class="dominant">BB</span><div class="sub-ratio">سائد</div></td>
        <td class="gene-cell" id="c12"><span class="dominant">Bb</span><div class="sub-ratio">سائد</div></td>
      </tr>
      <tr>
        <th id="b2">b</th>
        <td class="gene-cell" id="c21"><span class="dominant">Bb</span><div class="sub-ratio">سائد</div></td>
        <td class="gene-cell" id="c22"><span class="dominant">bb</span><div class="sub-ratio">متنحٍ</div></td>
      </tr>
    </table>
  </div>

  <div class="results" id="analysis">
    <strong>📊 التحليل الوراثي المتوقع:</strong><br>
    • الطراز المظهري: 75% سائد (3 أفراد) مقابل 25% متنحٍ (فرد واحد)<br>
    • النسبة الجينية: 1 BB : 2 Bb : 1 bb<br>
    • يعزز هذا الانعزال الوراثي التنوع الحيوي والتكيف البيئي للأجيال القادمة.
  </div>

<script>
  function calculate() {
    const p1 = document.getElementById('p1').value;
    const p2 = document.getElementById('p2').value;

    const g1 = [p1[0], p1[1]];
    const g2 = [p2[0], p2[1]];

    document.getElementById('a1').innerText = g1[0];
    document.getElementById('a2').innerText = g1[1];
    document.getElementById('b1').innerText = g2[0];
    document.getElementById('b2').innerText = g2[1];

    function makeGene(a, b) {
      if (a === 'b' && b === 'B') return 'Bb';
      return a + b;
    }

    const c11 = makeGene(g1[0], g2[0]);
    const c12 = makeGene(g1[1], g2[0]);
    const c21 = makeGene(g1[0], g2[1]);
    const c22 = makeGene(g1[1], g2[1]);

    const cells = [c11, c12, c21, c22];
    const ids = ['c11', 'c12', 'c21', 'c22'];

    let domCount = 0;
    let counts = { BB: 0, Bb: 0, bb: 0 };

    cells.forEach((g, idx) => {
      counts[g] = (counts[g] || 0) + 1;
      const isDom = g.includes('B');
      if (isDom) domCount++;
      document.getElementById(ids[idx]).innerHTML = '<span class="dominant">' + g + '</span><div class="sub-ratio">' + (isDom ? 'سائد' : 'متنحٍ') + '</div>';
    });

    const domPct = (domCount / 4) * 100;
    const recPct = 100 - domPct;

    document.getElementById('analysis').innerHTML =
      '<strong>📊 التحليل الوراثي المتوقع:</strong><br>' +
      '• الطراز المظهري: ' + domPct + '% سائد (' + domCount + '/4) مقابل ' + recPct + '% متنحٍ (' + (4 - domCount) + '/4)<br>' +
      '• النسبة الجينية: ' + (counts.BB || 0) + ' BB : ' + (counts.Bb || 0) + ' Bb : ' + (counts.bb || 0) + ' bb<br>' +
      '• أهمية التنوع الوراثي: يتيح للأفراد المقاومة للأمراض والتكيف مع التغيرات البيئية والمناخية.';
  }
</script>
</body>
</html>`;

export const SIMULATION_NEWTON = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Cairo', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; text-align: center; }
  h2 { color: #38bdf8; font-size: 22px; margin-bottom: 4px; }
  p { color: #94a3b8; font-size: 13px; margin-bottom: 16px; }
  .sim-box { max-width: 720px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
  canvas { display: block; background: #090d16; border-radius: 8px; border: 1px solid #334155; margin: 0 auto 16px; }
  .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .slider-item { background: #0f172a; padding: 12px; border-radius: 10px; border: 1px solid #334155; }
  label { display: block; font-size: 13px; color: #38bdf8; margin-bottom: 6px; font-weight: bold; }
  input[type=range] { width: 100%; accent-color: #38bdf8; }
  .formula-box { background: #0284c7; color: white; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 15px; margin-bottom: 12px; }
  button { background: #0284c7; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; }
  button:hover { background: #0ea5e9; }
</style>
</head>
<body>
  <h2>قانون نيوتن الثاني: القوة والحركة (F = m × a)</h2>
  <p>غيّر القوة المؤثرة وكتلة العربة ولاحظ كيف يتغير التسارع وسرعة الحركة</p>

  <div class="sim-box">
    <div class="formula-box" id="formulaDisplay">التسارع a = F / m = 20 / 5 = 4.00 m/s²</div>
    
    <canvas id="motionCanvas" width="680" height="220"></canvas>

    <div class="sliders">
      <div class="slider-item">
        <label>القوة المؤثرة (F): <span id="fVal">20</span> نيوتن</label>
        <input type="range" id="forceInput" min="0" max="100" value="20" oninput="updateValues()">
      </div>
      <div class="slider-item">
        <label>كتلة العربة (m): <span id="mVal">5</span> كجم</label>
        <input type="range" id="massInput" min="1" max="25" value="5" oninput="updateValues()">
      </div>
    </div>

    <button onclick="resetCart()">إعادة العربة لنقطة البداية</button>
  </div>

<script>
  const canvas = document.getElementById('motionCanvas');
  const ctx = canvas.getContext('2d');

  let cartX = 30;
  let velocity = 0;
  let force = 20;
  let mass = 5;
  let acc = force / mass;

  function updateValues() {
    force = parseFloat(document.getElementById('forceInput').value);
    mass = parseFloat(document.getElementById('massInput').value);
    acc = mass > 0 ? force / mass : 0;
    document.getElementById('fVal').innerText = force;
    document.getElementById('mVal').innerText = mass;
    document.getElementById('formulaDisplay').innerText =
      'التسارع a = F / m = ' + force + ' N / ' + mass + ' kg = ' + acc.toFixed(2) + ' m/s²';
  }

  function resetCart() {
    cartX = 30;
    velocity = 0;
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Track line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(canvas.width, 160);
    ctx.stroke();

    // Distance markers
    ctx.fillStyle = '#475569';
    ctx.font = '10px Cairo';
    for (let x = 0; x < canvas.width; x += 60) {
      ctx.fillRect(x, 155, 2, 10);
      ctx.fillText(Math.round(x / 5) + 'm', x - 8, 180);
    }

    // Physics
    velocity += (acc * 0.016);
    cartX += velocity;
    if (cartX > canvas.width - 70) {
      cartX = canvas.width - 70;
      velocity = 0;
    }

    // Draw Cart
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cartX, 100, 60, 40);

    // Cart details
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cartX + 8, 108, 44, 20);

    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cartX + 15, 145, 10, 0, Math.PI * 2);
    ctx.arc(cartX + 45, 145, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Force arrow
    if (force > 0) {
      let arrowLen = Math.min(80, force * 1.2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cartX + 60, 120);
      ctx.lineTo(cartX + 60 + arrowLen, 120);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cartX + 60 + arrowLen + 8, 120);
      ctx.lineTo(cartX + 60 + arrowLen - 2, 114);
      ctx.lineTo(cartX + 60 + arrowLen - 2, 126);
      ctx.fill();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px Cairo';
      ctx.fillText(force + ' N', cartX + 65, 110);
    }

    // Velocity readout
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px Cairo';
    ctx.fillText('السرعة: ' + velocity.toFixed(1) + ' m/s', 30, 30);
    ctx.fillText('التسارع: ' + acc.toFixed(2) + ' m/s²', 30, 50);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
</script>
</body>
</html>`;
