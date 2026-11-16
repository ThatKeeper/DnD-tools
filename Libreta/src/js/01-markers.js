// Marcadores de cera que se pueden colocar y mover sobre las páginas.

const MK = [
    {
        n: 'Combate',
        w: '#8e1b12',
        g: '<path d="M25 10l2.6 4.5V30h-5.2V14.5z"/><path d="M17 30h16v3.4H17z"/><path d="M23.4 33.4h3.2V40h-3.2z"/>'
    },
    {
        n: 'Peligro',
        w: '#2e2a28',
        g: '<path d="M25 11c-6.5 0-10 4-10 9.5 0 3.5 1.6 5.5 3.5 7V34h13v-6.5c1.9-1.5 3.5-3.5 3.5-7C35 15 31.5 11 25 11z"/><circle cx="20.8" cy="22" r="2.9" style="fill:var(--w);stroke:none"/><circle cx="29.2" cy="22" r="2.9" style="fill:var(--w);stroke:none"/>'
    },
    {
        n: 'Importante',
        w: '#9a7420',
        g: '<polygon points="25,10 29.4,19.8 40,21 32,28.2 34.3,38.7 25,33.3 15.7,38.7 18,28.2 10,21 20.6,19.8"/>'
    },
    {
        n: 'Misterio',
        w: '#4a2268',
        g: '<text x="25" y="35" text-anchor="middle" font-family="IM Fell English,serif" font-weight="700" font-size="28">?</text>'
    }
];

const mkSvg = type =>
    `<svg viewBox="0 0 50 50"><use href="#wax"/><g class="g">${MK[type].g}</g></svg>`;

const marksOf = pageIndex => {
    if (!pages[pageIndex].marks) pages[pageIndex].marks = [];
    return pages[pageIndex].marks;
};

const count = () => {
    const total =
        marksOf(idx(0)).length +
        marksOf(idx(1)).length;

    $('#mcap').textContent = `Marcadores ${total}/4`;
    $('#mks').classList.toggle('full', total >= 4);

    return total;
};

const mkHTML = (mark, index) =>
    `<div class="mk" data-k="${index}" ` +
    `style="left:${mark.x}%;top:${mark.y}%;--w:${MK[mark.t].w};` +
    `--r:${(Math.round(mark.x * 3) % 13) - 6}deg">` +
    `${mkSvg(mark.t)}</div>`;

const marksHTML = pageIndex =>
    (pages[pageIndex].marks || [])
        .map((mark, index) => mkHTML(mark, index))
        .join('');

// Volver a dibujar los marcadores de una página.
function renderMarks(pageIndex, pageNumber) {
    const element = P[pageIndex].el;

    element.querySelectorAll('.mk').forEach(mark => mark.remove());
    element.insertAdjacentHTML('beforeend', marksHTML(pageNumber));

    element.querySelectorAll('.mk').forEach(markElement => {
        const index = +markElement.dataset.k;

        markElement.onpointerdown = event =>
            drag(event, pages[pageNumber].marks[index].t, {
                p: pageNumber,
                k: index
            });

        markElement.ondblclick = () => {
            pages[pageNumber].marks.splice(index, 1);
            render();
        };
    });
}

const full = () => {
    const caption = $('#mcap');

    caption.textContent = 'Máximo 4 por doble página';
    caption.style.color = '#ff9a7a';

    setTimeout(() => {
        caption.style.color = '';
        count();
    }, 1700);
};

// Colocar un marcador en una página.
function put(pageSide, type, event, exact) {
    let x = 30 + Math.random() * 40;
    let y = 15 + Math.random() * 60;

    if (exact) {
        const rect = P[pageSide].el.getBoundingClientRect();

        x = Math.min(93, Math.max(7,
            (event.clientX - rect.left) / rect.width * 100));

        y = Math.min(94, Math.max(6,
            (event.clientY - rect.top) / rect.height * 100));
    }

    marksOf(idx(pageSide)).push({
        t: type,
        x: +x.toFixed(1),
        y: +y.toFixed(1)
    });
}

// Arrastrar un marcador desde la barra o mover uno ya colocado.
function drag(event, type, from) {
    if (busy) return;

    event.preventDefault();

    const original = event.currentTarget;
    const ghost = document.createElement('div');

    ghost.className = 'mk ghost';
    ghost.style.display = 'none';
    ghost.style.setProperty('--w', MK[type].w);
    ghost.innerHTML = mkSvg(type);

    document.body.append(ghost);

    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;

    const move = currentEvent => {
        ghost.style.left = currentEvent.clientX + 'px';
        ghost.style.top = currentEvent.clientY + 'px';

        if (!moved &&
            Math.hypot(
                currentEvent.clientX - startX,
                currentEvent.clientY - startY
            ) > 6) {
            moved = true;
            ghost.style.display = '';

            if (from) original.style.opacity = '.2';
        }
    };

    const up = currentEvent => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', up);
        ghost.remove();

        const target = P.findIndex(page => {
            const rect = page.el.getBoundingClientRect();

            return currentEvent.clientX >= rect.left &&
                currentEvent.clientX <= rect.right &&
                currentEvent.clientY >= rect.top &&
                currentEvent.clientY <= rect.bottom;
        });

        if (from) {
            if (!moved) return;

            const mark = pages[from.p].marks.splice(from.k, 1)[0];

            if (target >= 0) put(target, mark.t, currentEvent, true);

            render();
            return;
        }

        const destination = moved ? target : 1;

        if (destination < 0) return;
        if (count() >= 4) {
            full();
            return;
        }

        put(destination, type, currentEvent, moved);
        render();
    };

    move(event);

    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
}

// Crear los botones de marcadores en la barra.
$('#mks').innerHTML = MK.map((mark, type) =>
    `<button class="seal mkb" title="${mark.n}: arrástralo a la hoja" ` +
    `style="--w:${mark.w}">${mkSvg(type)}</button>`
).join('');

$('#mks').querySelectorAll('.mkb').forEach((button, type) => {
    button.onpointerdown = event => drag(event, type, null);
});
