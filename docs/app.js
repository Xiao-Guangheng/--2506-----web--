'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const gate = $('#gate'), home = $('#home'), character = $('#character');
  home.inert = true;
  home.setAttribute('aria-hidden', 'true');
  let opening = false, generation = 0, homeVisible = false, paused = reduce.matches;
  let toastTimer;
  const toast = (text) => { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3200); };
  const observe = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => observe.observe(el));
  const navLinks = [...document.querySelectorAll('.topbar nav a')];
  const navSections = navLinks.map(link => $(link.hash));
  function updateNavigation() {
    const position = window.scrollY + window.innerHeight * .25;
    const current = navSections.filter(section => section.getBoundingClientRect().top + window.scrollY <= position).pop() || navSections[0];
    navLinks.forEach(link => {
      const active = link.hash === '#' + current.id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let navigationPending = false;
  window.addEventListener('scroll', () => {
    if (navigationPending) return;
    navigationPending = true;
    requestAnimationFrame(() => { updateNavigation(); navigationPending = false; });
  }, { passive: true });
  window.addEventListener('resize', updateNavigation);

  // 方向切换支持鼠标、左右方向键与 Home / End；阶段计划始终可见。
  const directionTabs = [...document.querySelectorAll('[role="tab"]')];
  function selectDirection(selected) {
    directionTabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
  }
  directionTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDirection(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % directionTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + directionTabs.length) % directionTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = directionTabs.length - 1;
      else return;
      event.preventDefault();
      selectDirection(directionTabs[next]);
      directionTabs[next].focus();
    });
  });
  function finish(focus = true) {
    generation++; opening = false; homeVisible = true;
    home.inert = false; home.removeAttribute('aria-hidden');
    document.body.classList.remove('at-gate'); document.body.classList.add('home-ready');
    gate.classList.add('hidden'); gate.inert = true; gate.setAttribute('aria-hidden', 'true');
    $('#about').classList.add('visible');
    updateNavigation();
    try { sessionStorage.setItem('oc-entered', '1'); } catch (_) {}
    if (focus) { const first = $('.topbar nav a'); first.focus({ preventScroll: true }); }
  }
  const poses = [$('.pose-a'), $('.pose-b')];
  const scene = $('#scene'), leaf = $('#door'), shadow = $('.door-shadow');
  const clamp = v => Math.max(0, Math.min(1, v));
  const smoothstep = v => { const p = clamp(v); return p * p * (3 - 2 * p); };
  const smootherstep = v => { const p = clamp(v); return p * p * p * (p * (p * 6 - 15) + 10); };
  function pose(layer, index) {
    layer.style.backgroundPosition = `${(index % 6) * 20}% ${Math.floor(index / 6) * 100}%`;
    layer.style.transform = index < 5 ? 'scaleX(-1)' : 'scaleX(1)';
  }
  function frame(from, to, mix, x, bob = 0, lean = 0) {
    // Blend only at pose boundaries; movement itself remains continuous at display refresh rate.
    pose(poses[0], from); pose(poses[1], to);
    poses[0].style.opacity = String(1 - mix); poses[1].style.opacity = String(mix);
    character.style.left = x + '%';
    character.style.transform = `translateY(${bob}px) rotate(${lean}deg)`;
    $('.character-shadow').style.left = (x + .5) + '%';
    $('.character-shadow').style.transform = `scale(${1 - Math.abs(bob) * .015})`;
  }
  const timeline = [
    [0, 0], [340, 1], [600, 2], [860, 3], [1120, 1], [1380, 2],
    [1620, 4], [1950, 5], [2220, 6], [2480, 7], [2860, 8],
    [3450, 9], [4070, 10], [4610, 11]
  ];
  function samplePose(t) {
    let k = 0;
    while (k + 1 < timeline.length && timeline[k + 1][0] <= t) k++;
    if (k === 0) return [0, 0, 0];
    const elapsed = t - timeline[k][0];
    // Short overlap avoids the previous instantaneous sprite replacement.
    const blend = smoothstep(elapsed / (k < 7 ? 125 : 180));
    return [timeline[k - 1][1], timeline[k][1], blend];
  }
  function resetScene() {
    frame(0, 0, 0, 38.4);
    for (const element of [scene, leaf, shadow, $('.door-handle'), $('.door-reflection'), $('.portal-inside')]) element.removeAttribute('style');
    character.style.removeProperty('animation');
  }
  resetScene();
  function enter() {
    if (opening || homeVisible) return;
    if (reduce.matches) return finish();
    opening = true; const token = ++generation;
    gate.classList.add('opening'); leaf.disabled = true;
    const start = performance.now();
    function step(now) {
      if (token !== generation) return;
      const t = now - start;
      const walking = smoothstep((t - 180) / 1550);
      const pressing = smoothstep((t - 2700) / 1000);
      const retreat = smoothstep((t - 3900) / 900);
      const x = 38.4 + walking * 2.55 + pressing * .32 - retreat * 1.12;
      const gaitEnvelope = Math.sin(Math.PI * walking);
      const bob = -Math.abs(Math.sin(t / 165)) * 1.4 * gaitEnvelope;
      const lean = pressing * 1.3 * (1 - retreat);
      frame(...samplePose(t), x, bob, lean);
      // One clock coordinates the hand, hinge, light, projection and camera.
      const doorProgress = smootherstep((t - 2630) / 1950);
      if (doorProgress > 0) gate.classList.add('door-opening');
      leaf.style.transform = `rotateY(${doorProgress * 103}deg)`;
      leaf.style.filter = `brightness(${1 - doorProgress * .18})`;
      $('.door-handle').style.transform = `rotate(${-12 + smoothstep((t - 2420) / 320) * 26}deg)`;
      shadow.style.transform = `translateX(${doorProgress * 22}%) rotate(${-5 + doorProgress * 22}deg) scaleX(${1 - doorProgress * .22})`;
      shadow.style.opacity = String(1 - doorProgress * .35);
      $('.door-reflection').style.opacity = String(1 - doorProgress * .75);
      $('.portal-inside').style.boxShadow = `0 0 ${20 + doorProgress * 45}px #a7faff66`;
      const camera = smootherstep((t - 4350) / 1900);
      if (camera > 0) {
        gate.classList.add('journey');
        scene.style.transform = `translate(-50%,-50%) scale(${1 + camera * 1.85})`;
      }
      if (t >= 6100) { finish(); return; }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  $('#door').addEventListener('click', enter);
  character.addEventListener('click', enter);
  $('#skip').addEventListener('click', () => finish());
  $('#replay').addEventListener('click', () => {
    generation++; opening = false; homeVisible = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    gate.inert = false; gate.removeAttribute('aria-hidden');
    gate.classList.remove('hidden','opening','door-opening','journey');
    document.body.classList.add('at-gate'); document.body.classList.remove('home-ready');
    home.inert = true; home.setAttribute('aria-hidden', 'true');
    leaf.disabled = false;
    resetScene(); leaf.focus({ preventScroll: true });
  });
  // Session storage is deliberately session-scoped: new visits retain the introduction.
  try { if (sessionStorage.getItem('oc-entered') === '1') finish(false); } catch (_) {}
  $('#year').textContent = new Date().getFullYear();
  $('#copy-email').addEventListener('click', async () => {
    const email = $('#email-address').getAttribute('href').slice('mailto:'.length);
    const copyButton = $('#copy-email');
    copyButton.disabled = true;
    toast('正在复制邮箱…');
    let clipboardTimer;
    try {
      // 某些内嵌浏览器的剪贴板请求可能一直等待，超时后给出降级反馈。
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await Promise.race([
        navigator.clipboard.writeText(email),
        new Promise((_, reject) => { clipboardTimer = setTimeout(() => reject(new Error('Clipboard timeout')), 1500); })
      ]);
      toast('邮箱已复制，期待你的来信。');
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = email;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      let copied = false;
      try { input.select(); copied = document.execCommand('copy'); } catch (_) {}
      finally { input.remove(); copyButton.focus({ preventScroll: true }); }
      toast(copied ? '邮箱已复制，期待你的来信。' : '请选中邮箱地址复制，或点击邮箱发送邮件。');
    } finally {
      clearTimeout(clipboardTimer);
      copyButton.disabled = false;
    }
  });
  const jokes = ['生活没有撤销键，代码幸好有。','今天的报错，也可能是明天的经验。','这个页面正常运行。至于我，偶尔需要重启。','Hello World 之后，还有一整个世界。'];
  let jokeIndex = 0; $('#egg').addEventListener('click', () => toast(jokes[jokeIndex++ % jokes.length]));
  const motionButton = $('#motion');
  function motionLabel() { motionButton.textContent = paused ? '继续海洋 ▷' : '暂停海洋 Ⅱ'; motionButton.setAttribute('aria-pressed', String(paused)); }
  motionButton.addEventListener('click', () => { paused = !paused; motionLabel(); if (!paused) startSea(); });
  reduce.addEventListener('change', () => { paused = reduce.matches; motionLabel(); if (!paused) startSea(); }); motionLabel();
  const canvas = $('#sea'), ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ocean = new OCOcean(canvas);
  let running = false, lastTime = 0, seaTime = 0;
  function tick(now) {
    if (paused || document.hidden) { running=false;lastTime=0;return; }
    if (!lastTime) lastTime=now;
    seaTime += Math.min(now-lastTime,50)/1000;lastTime=now;
    if (homeVisible) ocean.draw(seaTime);
    requestAnimationFrame(tick);
  }
  function startSea(){if(!running&&!paused&&!document.hidden){running=true;lastTime=0;requestAnimationFrame(tick);}}
  document.addEventListener('visibilitychange', () => { if(!document.hidden)startSea(); });
  startSea();
})();
