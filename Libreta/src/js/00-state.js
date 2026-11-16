// Estado general de la libreta y navegación entre páginas.

const $ = selector => document.querySelector(selector);
const pg = $('#pages');
const book = $('#book');

let pages = [];
let s = 0;
let mode = 'write';
let col = '#2b1a0e';
let busy = false;
let undo = [];
let tm;

// Recuperar la libreta guardada.
try {
    const data = JSON.parse(localStorage.getItem('libreta') || 'null');

    if (data && data.pages && data.pages.length) {
        pages = data.pages;
        s = Math.min(data.s || 0, Math.floor((pages.length - 1) / 2));
    }
} catch (e) {}

// Crear páginas iniciales si no hay datos guardados.
if (!pages.length) {
    pages = [
        {
            html: '<h2>Diario de Aventuras</h2><div>Aquí comienza la leyenda…</div>',
            draw: ''
        },
        { html: '', draw: '' },
        { html: '', draw: '' },
        { html: '', draw: '' }
    ];
}

// Referencias a las dos páginas visibles.
const P = [$('#L'), $('#R')].map(element => ({
    el: element,
    t: element.querySelector('.text'),
    cv: element.querySelector('canvas'),
    n: element.querySelector('.num'),
    cx: element.querySelector('canvas').getContext('2d')
}));

const idx = i => 2 * s + i;

// Guardar con un pequeño retraso para no escribir en cada pulsación.
function persist() {
    clearTimeout(tm);

    tm = setTimeout(() => {
        try {
            localStorage.setItem('libreta', JSON.stringify({ pages, s }));
        } catch (e) {}
    }, 400);
}

// Cargar el contenido de una página en su espacio visible.
function load(i, pageIndex) {
    const page = P[i];

    page.t.innerHTML = pages[pageIndex].html;
    page.n.textContent = pageIndex + 1;

    renderMarks(i, pageIndex);

    page.cx.clearRect(0, 0, 660, 912);

    if (pages[pageIndex].draw) {
        const image = new Image();

        image.onload = () => page.cx.drawImage(image, 0, 0);
        image.src = pages[pageIndex].draw;
    }
}

// Actualizar las dos páginas visibles y la información de navegación.
function render() {
    load(0, idx(0));
    load(1, idx(1));
    count();

    $('#pos').textContent =
        `Hojas ${idx(0) + 1}–${idx(1) + 1} de ${pages.length}`;

    persist();
}

// Crear una representación visual de una página para la animación.
function face(pageIndex, back) {
    const element = document.createElement('div');

    element.className =
        'page ' +
        (pageIndex % 2 ? 'pr' : 'pl') +
        (back ? ' bk' : '');

    element.innerHTML =
        `<div class="text">${pages[pageIndex].html}</div>` +
        (pages[pageIndex].draw
            ? `<img class="dr" src="${pages[pageIndex].draw}">`
            : '') +
        marksHTML(pageIndex) +
        `<span class="num">${pageIndex + 1}</span>`;

    return element;
}

// Pasar una hoja hacia delante o hacia atrás.
function flip(direction) {
    if (busy) return;
    if (direction < 0 && s === 0) return;

    if (direction > 0 && 2 * s + 2 >= pages.length) {
        for (let k = 0; k < 2; k++) {
            pages.push({ html: '', draw: '' });
        }
    }

    busy = true;

    const leaf = document.createElement('div');
    leaf.className = 'leaf ' + (direction > 0 ? 'r' : 'l');

    leaf.append(
        face(direction > 0 ? idx(1) : idx(0)),
        face(direction > 0 ? idx(2) : idx(0) - 1, true)
    );

    pg.append(leaf);

    if (direction > 0) {
        load(1, idx(3));
    } else {
        load(0, idx(0) - 2);
    }

    leaf.offsetWidth;
    leaf.classList.add('go');

    setTimeout(() => {
        s += direction;
        render();
        leaf.remove();
        busy = false;
    }, 920);
}

$('#next').onclick = () => flip(1);
$('#prev').onclick = () => flip(-1);

$('#add').onclick = () => {
    pages.push(
        { html: '', draw: '' },
        { html: '', draw: '' }
    );

    render();
};

// Mostrar u ocultar las líneas del papel.
const setLines = value => {
    document.body.classList.toggle('lines', value);
    $('#lines').classList.toggle('on', value);

    try {
        localStorage.setItem('libreta-lineas', value ? '1' : '0');
    } catch (e) {}
};

$('#lines').onclick = () =>
    setLines(!document.body.classList.contains('lines'));

try {
    setLines(localStorage.getItem('libreta-lineas') === '1');
} catch (e) {}

// Atajos de teclado.
document.addEventListener('keydown', event => {
    const editing = event.target.isContentEditable;
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.code;
    const query = selector => document.querySelector(selector);

    if (modifier && key === 'KeyS') {
        event.preventDefault();
        persist();

        const position = $('#pos');
        const previousText = position.textContent;

        position.textContent = 'Guardado ✓';
        setTimeout(() => position.textContent = previousText, 1200);
        return;
    }

    if (modifier && (key === 'KeyB' || key === 'KeyI') && editing) {
        event.preventDefault();
        query(key === 'KeyB' ? '[data-c=bold]' : '[data-c=italic]').click();
        return;
    }

    if (modifier && key === 'KeyZ' && !event.shiftKey &&
        (!editing || mode !== 'write')) {
        event.preventDefault();
        $('#undo').click();
        return;
    }

    if (event.altKey) {
        let handled = true;

        if (key === 'Digit1') query('[data-m=write]').click();
        else if (key === 'Digit2') query('[data-m=draw]').click();
        else if (key === 'Digit3') query('[data-m=erase]').click();
        else if (/^Digit[4-8]$/.test(key)) {
            document.querySelectorAll('.ink')[+key.slice(5) - 4].click();
        }
        else if (key === 'KeyL') $('#lines').click();
        else if (key === 'KeyT') query('[data-c=title]').click();
        else if (key === 'KeyN') $('#add').click();
        else if (key === 'ArrowRight') flip(1);
        else if (key === 'ArrowLeft') flip(-1);
        else if (key === 'ArrowUp' || key === 'ArrowDown') {
            const size = $('#size');

            size.value = +size.value + (key === 'ArrowUp' ? 1 : -1);
            size.dispatchEvent(new Event('input'));
        }
        else handled = false;

        if (handled) event.preventDefault();
        return;
    }

    if (key === 'Escape') {
        query('[data-m=write]').click();
        return;
    }

    if (editing) return;

    if (key === 'ArrowRight' || key === 'PageDown') flip(1);
    else if (key === 'ArrowLeft' || key === 'PageUp') flip(-1);
    else if (key === 'Digit1') query('[data-m=write]').click();
    else if (key === 'Digit2') query('[data-m=draw]').click();
    else if (key === 'Digit3') query('[data-m=erase]').click();
    else if (key === 'KeyG') $('#lines').click();
});
