const HUD = (() => {
  const apps = new Map();
  const $ = id => document.getElementById(id);
  const riel = $('riel'), vistas = $('vistas'), tarjetas = $('tarjetas'), esc = document.querySelector('.escenario');
  const inicio = { id: 'inicio', nombre: 'Bienvenido, Dungeon Master', desc: 'Todo lo que necesitas para la sesión, en un solo sitio.', color: '#d8bb8c' };
  function registrar(a) {
    apps.set(a.id, a);

    const b = document.createElement('button');
    b.className = 'item'; b.dataset.id = a.id; b.style.setProperty('--color', a.color);
    b.innerHTML = `<img src="assets/${a.id}_128.png" alt=""><span>${a.nombre}</span>${a.tecla ? `<i class="tecla">${a.tecla}</i>` : ''}`;
    b.addEventListener('click', () => ir(a.id));
    riel.appendChild(b);

    const t = document.createElement('button');
    t.className = 'tarjeta'; t.style.setProperty('--color', a.color);
    t.innerHTML = `<img src="assets/${a.id}_256.png" alt=""><h3>${a.nombre}</h3><p>${a.desc}</p>${a.tecla ? `<i class="tecla">${a.tecla}</i>` : ''}`;
    t.addEventListener('click', () => ir(a.id));
    tarjetas.appendChild(t);

    const v = document.createElement('section');
    v.className = 'vista'; v.id = 'v-' + a.id; v.hidden = true;
    const tpl = $('tpl-' + a.id);
    if (a.contenido) v.append(a.contenido);
    else if (tpl) v.append(tpl.content.cloneNode(true));
    vistas.appendChild(v);
  }

  function ir(id) {
    const a = id === 'inicio' ? inicio : apps.get(id);
    if (!a) return;
    document.querySelectorAll('.vista').forEach(v => v.hidden = v.id !== 'v-' + id);
    document.querySelectorAll('.item').forEach(i => i.classList.toggle('on', i.dataset.id === id));
    esc.style.setProperty('--color', a.color);
    $('cab-t').textContent = a.nombre;
    $('cab-d').textContent = a.desc;
    const ico = $('cab-ico');
    ico.hidden = id === 'inicio';
    if (id !== 'inicio') ico.src = `assets/${id}_128.png`;
    const vista = $('v-' + id);
    if (vista) vista.querySelectorAll('iframe[data-src]').forEach(frame => {
      if (!frame.hasAttribute('src')) frame.src = frame.dataset.src;
    });
    $('sub').textContent = id === 'inicio' ? 'Elige una herramienta para empezar' : a.nombre;
  }

  document.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '0' || e.key === 'Escape') return ir('inicio');
    const a = [...apps.values()].find(x => x.tecla === e.key);
    if (a) ir(a.id);
  });

  return { registrar, ir };
})();

/* Dados */
(() => {
  const cont = document.getElementById('dados');
  const res = document.createElement('div');
  res.className = 'res'; res.setAttribute('aria-live', 'polite');
  res.innerHTML = '<span>Tira</span><b>–</b>';
  [4, 6, 8, 10, 12, 20].forEach(n => {
    const b = document.createElement('button');
    b.textContent = 'd' + n; b.setAttribute('aria-label', 'Tirar d' + n);
    b.addEventListener('click', () => {
      const r = 1 + Math.floor(Math.random() * n);
      res.className = 'res tira' + (n === 20 && r === 20 ? ' crit' : n === 20 && r === 1 ? ' pifia' : '');
      res.innerHTML = `<span>d${n}</span><b>${r}</b>`;
      void res.offsetWidth; res.classList.add('tira');
    });
    cont.appendChild(b);
  });
  cont.appendChild(res);
})();

/* Para añadir otra app: HUD.registrar({ id, nombre, desc, color, tecla })
   con assets/<id>_128.png y assets/<id>_256.png */
HUD.registrar({ id: 'combate', nombre: 'Combate', desc: 'Iniciativa, vida y turnos de cada encuentro.', color: '#c04a4a', tecla: '1' });
HUD.registrar({ id: 'mapa', nombre: 'Mapa', desc: 'Explora el mundo y marca tus lugares.', color: '#5a9a5a', tecla: '2' });
HUD.registrar({ id: 'libreta', nombre: 'Libreta', desc: 'Notas de sesión, PNJ y tramas.', color: '#5a74c8', tecla: '3' });

document.querySelector('.item[data-id="inicio"]').addEventListener('click', () => HUD.ir('inicio'));
