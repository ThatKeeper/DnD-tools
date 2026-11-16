// Escritura y dibujo sobre el canvas de cada página.

P.forEach((page, side) => {
    page.t.addEventListener('input', () => {
        pages[idx(side)].html = page.t.innerHTML;
        persist();
    });

    // Pegar solo texto plano para evitar estilos externos inesperados.
    page.t.addEventListener('paste', event => {
        event.preventDefault();

        document.execCommand(
            'insertText',
            false,
            event.clipboardData.getData('text/plain')
        );
    });

    let drawing = false;
    let lastPosition;

    const position = event => {
        const rect = page.cv.getBoundingClientRect();

        return [
            (event.clientX - rect.left) * 660 / rect.width,
            (event.clientY - rect.top) * 912 / rect.height
        ];
    };

    page.cv.addEventListener('pointerdown', event => {
        if (mode === 'write') return;

        drawing = true;
        page.cv.setPointerCapture(event.pointerId);

        undo.push({
            p: idx(side),
            d: pages[idx(side)].draw
        });

        if (undo.length > 25) undo.shift();

        const context = page.cx;

        context.lineCap = context.lineJoin = 'round';
        context.lineWidth =
            +$('#size').value * (mode === 'erase' ? 3 : 1.2);

        context.globalCompositeOperation =
            mode === 'erase' ? 'destination-out' : 'source-over';

        context.strokeStyle = col;

        lastPosition = position(event);

        context.beginPath();
        context.moveTo(...lastPosition);
        context.lineTo(lastPosition[0] + 0.1, lastPosition[1]);
        context.stroke();
    });

    page.cv.addEventListener('pointermove', event => {
        if (!drawing) return;

        const currentPosition = position(event);
        const context = page.cx;

        context.beginPath();
        context.moveTo(...lastPosition);
        context.lineTo(...currentPosition);
        context.stroke();

        lastPosition = currentPosition;
    });

    const endDrawing = () => {
        if (!drawing) return;

        drawing = false;
        pages[idx(side)].draw = page.cv.toDataURL();
        persist();
    };

    page.cv.addEventListener('pointerup', endDrawing);
    page.cv.addEventListener('pointercancel', endDrawing);
});
