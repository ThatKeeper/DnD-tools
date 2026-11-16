// Controles de formato, herramientas, tintas y tipografías.

// Actualizar el estado visual de los botones de formato según la selección.
document.addEventListener('selectionchange', () => {
    try {
        const anchor = getSelection().anchorNode;
        const element = anchor &&
            (anchor.nodeType === 3 ? anchor.parentElement : anchor);

        if (!element || !element.closest ||
            !element.closest('.text')) return;

        $('[data-c=bold]').classList.toggle(
            'on',
            document.queryCommandState('bold')
        );

        $('[data-c=italic]').classList.toggle(
            'on',
            document.queryCommandState('italic')
        );

        $('[data-c=title]').classList.toggle(
            'on',
            !!element.closest('h2')
        );
    } catch (e) {}
});

// Deshacer el último trazo realizado.
$('#undo').onclick = () => {
    const previous = undo.pop();

    if (!previous) return;

    pages[previous.p].draw = previous.d;
    render();
};

// Cambiar entre escritura, dibujo y borrado.
document.querySelectorAll('[data-m]').forEach(button => {
    button.onclick = () => {
        mode = button.dataset.m;
        $('#cap').textContent = button.dataset.n;

        document.querySelectorAll('[data-m]').forEach(item => {
            item.classList.toggle('on', item === button);
        });

        pg.className =
            'pages' + (mode === 'write' ? '' : ' ' + mode);
    };
});

// Evitar que al pulsar los controles se pierda la selección de texto.
document.querySelectorAll('#bar button').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
});

// Aplicar negrita, cursiva o formato de título.
document.querySelectorAll('[data-c]').forEach(button => {
    button.onclick = () => {
        const command = button.dataset.c;

        if (command === 'title') {
            const parent = (getSelection().anchorNode || {}).parentElement;

            document.execCommand(
                'formatBlock',
                false,
                parent && parent.closest('h2') ? 'div' : 'h2'
            );
        } else {
            document.execCommand(command);
        }

        P.forEach((page, side) => {
            pages[idx(side)].html = page.t.innerHTML;
        });

        persist();
    };
});

// Cambiar la tipografía del libro.
document.querySelectorAll('.type').forEach(button => {
    button.onclick = () => {
        document.documentElement.style.setProperty('--f', button.dataset.f);

        document.querySelectorAll('.type').forEach(item => {
            item.classList.toggle('on', item === button);
        });
    };
});

// Crear los botones de las tintas.
const INKS = [
    ['#2b1a0e', 'sepia'],
    ['#7a1c10', 'roja'],
    ['#1c3f7a', 'azul'],
    ['#2f5a22', 'verde'],
    ['#4a2268', 'violeta']
];

$('#inks').innerHTML = INKS.map(([color, name], index) =>
    `<button class="ink${index ? '' : ' on'}" ` +
    `data-col="${color}" title="Tinta ${name}" style="--c:${color}">` +
    `<svg viewBox="0 0 60 60">` +
    `<ellipse cx="33" cy="36" rx="25" ry="23" fill="#000" opacity=".35"/>` +
    `<rect x="6" y="6" width="48" height="48" rx="11" fill="#9fc4cf" fill-opacity=".35" stroke="#e6f4f7" stroke-opacity=".7" stroke-width="1.5"/>` +
    `<rect x="10" y="10" width="40" height="40" rx="8" fill="none" stroke="#fff" stroke-opacity=".25"/>` +
    `<circle cx="30" cy="30" r="17" fill="#d8eef2" fill-opacity=".3" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>` +
    `<circle cx="30" cy="30" r="13" style="fill:var(--c)"/>` +
    `<circle cx="30" cy="30" r="13" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>` +
    `<ellipse cx="25" cy="24" rx="5" ry="3" fill="#fff" opacity=".4" transform="rotate(-30 25 24)"/>` +
    `<circle class="rip" cx="30" cy="30" r="13" fill="none" stroke="#fff" stroke-opacity=".6"/>` +
    `<g class="cork">` +
    `<circle cx="30" cy="30" r="14.5" fill="#b88a52" stroke="#6b4a24" stroke-width="1.5"/>` +
    `<circle cx="25" cy="33" r="1.3" fill="#7a5530"/>` +
    `<circle cx="34" cy="26" r="1.1" fill="#7a5530"/>` +
    `<circle cx="31" cy="36" r="1" fill="#8f6a3a"/>` +
    `<circle cx="24" cy="26" r="1" fill="#8f6a3a"/>` +
    `<ellipse cx="26" cy="24" rx="5" ry="2.5" fill="#fff" opacity=".25" transform="rotate(-30 26 24)"/>` +
    `</g></svg></button>`
).join('');

// Cambiar el color de la tinta o del trazo.
document.querySelectorAll('[data-col]').forEach(button => {
    button.onclick = () => {
        col = button.dataset.col;

        document.querySelectorAll('[data-col]').forEach(item => {
            item.classList.toggle('on', item === button);
        });

        if (mode === 'write' && getSelection().toString()) {
            document.execCommand('foreColor', false, col);
        }
    };
});

// Ajustar el indicador del tamaño del trazo.
const dot = () => {
    const indicator = $('#dot');
    const size = (+$('#size').value * 1.3 + 3) + 'px';

    indicator.style.width = size;
    indicator.style.height = size;
    indicator.style.background = col;
};

$('#size').oninput = dot;

document.querySelectorAll('[data-col]').forEach(button => {
    button.addEventListener('click', dot);
});

dot();
