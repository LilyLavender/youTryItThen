(function () {
  var R = 65;
  var BORDER = 14;
  var LIGHT = '#ffffff';
  var MEDLIGHT = '#fcfcfc';
  var MEDDARK  = '#f4f4f4';
  var DARK  = '#efefef';

  function hashData(row, col) {
    var n = (((row * 2654435761) ^ (col * 40503)) >>> 0);
    return {
      rot:  n & 3,
      type: (n >> 2) & 1,
      j:    ((n >> 3) & 255) / 255 * 0.2 - 0.1
    };
  }

  // Draw the background pattern into ctx, where (offX, offY) is the CSS-pixel
  // viewport coordinate that should appear at context pixel (0, 0).
  // W and H are the target dimensions in the context's current coordinate space.
  function drawOffset(ctx, W, H, offX, offY) {
    offX = offX || 0;
    offY = offY || 0;
    var ir = R - BORDER;
    var firstRow = Math.floor(offY / R) - 1;
    var lastRow  = Math.ceil((H + offY) / R) + 1;

    for (var row = firstRow; row <= lastRow; row++) {
      var cy = row * R - offY;
      var xOff = (((row % 2) + 2) % 2) * R;
      var firstCol = Math.floor((offX - xOff) / (2 * R)) - 1;
      var lastCol  = Math.ceil((W + offX - xOff) / (2 * R)) + 1;

      for (var col = firstCol; col <= lastCol; col++) {
        var cx = col * 2 * R + xOff - offX;
        var h   = hashData(row, col);
        var rot = h.rot;
        var typ = h.type;
        var j   = h.j;

        var x0, y0, x1, y1;
        if      (rot === 0) { x0=cx;   y0=cy-R; x1=cx;   y1=cy+R; }
        else if (rot === 1) { x0=cx-R; y0=cy;   x1=cx+R; y1=cy;   }
        else if (rot === 2) { x0=cx;   y0=cy+R; x1=cx;   y1=cy-R; }
        else                { x0=cx+R; y0=cy;   x1=cx-R; y1=cy;   }

        var borderStop = Math.max(0.1, Math.min(0.9, 0.6 + j));
        var fillStop   = Math.max(0.1, Math.min(0.8, (typ === 0 ? 0.5 : 0.4) + j));

        var bg = ctx.createLinearGradient(x0, y0, x1, y1);
        bg.addColorStop(0,          DARK);
        bg.addColorStop(borderStop, LIGHT);
        bg.addColorStop(1,          LIGHT);
        ctx.beginPath();
        ctx.moveTo(cx,     cy - R);
        ctx.lineTo(cx + R, cy    );
        ctx.lineTo(cx,     cy + R);
        ctx.lineTo(cx - R, cy    );
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();

        var fg = ctx.createLinearGradient(x0, y0, x1, y1);
        if (typ === 0) {
          fg.addColorStop(0,        LIGHT);
          fg.addColorStop(fillStop, LIGHT);
          fg.addColorStop(1,        MEDDARK);
        } else {
          fg.addColorStop(0,        MEDDARK);
          fg.addColorStop(0.4,      MEDLIGHT);
          fg.addColorStop(0.6,      MEDLIGHT);
          fg.addColorStop(1,        MEDDARK);
        }
        ctx.beginPath();
        ctx.moveTo(cx,      cy - ir);
        ctx.lineTo(cx + ir, cy     );
        ctx.lineTo(cx,      cy + ir);
        ctx.lineTo(cx - ir, cy     );
        ctx.closePath();
        ctx.fillStyle = fg;
        ctx.fill();
      }
    }
  }

  function draw(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawOffset(ctx, canvas.width, canvas.height, 0, 0);
  }

  function resize(canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    draw(canvas);
  }

  // Exposed for PNG export: draw the background pattern into any ctx at any offset.
  window._bgDraw = drawOffset;

  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);
    window.addEventListener('resize', function () { resize(canvas); });
    resize(canvas);
  });
}());
