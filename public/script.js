let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let drawing = false;

let maskCanvas = document.createElement('canvas');
let maskCtx = maskCanvas.getContext('2d');

let img = new Image();

// Upload da imagem
document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => { img.src = reader.result; };
  reader.readAsDataURL(file);
});

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  maskCanvas.width = img.width;
  maskCanvas.height = img.height;

  maskCtx.fillStyle = 'black';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  ctx.drawImage(img, 0, 0);
};

// Função para corrigir coordenadas do mouse
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Desenho à mão livre
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  const pos = getMousePos(e);

  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);

  maskCtx.beginPath();
  maskCtx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const pos = getMousePos(e);

  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.stroke();

  maskCtx.lineTo(pos.x, pos.y);
  maskCtx.strokeStyle = 'white';
  maskCtx.lineWidth = 2;
  maskCtx.stroke();
});

// Evento único de mouseup
canvas.addEventListener('mouseup', () => {
  drawing = false;

  maskCtx.closePath();
  maskCtx.fillStyle = 'white';
  maskCtx.fill();

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = 'transparent';
  ctx.fill();
  ctx.globalAlpha = 1.0;
});



// Envio para backend
document.getElementById('send').addEventListener('click', async () => {
  const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const maskBlob = await new Promise(resolve => maskCanvas.toBlob(resolve, 'image/png'));

  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  formData.append('mask', maskBlob, 'mask.png');

  const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
  const blobRes = await res.blob();
  const url = URL.createObjectURL(blobRes);

  const resultImg = new Image();
  resultImg.src = url;
  document.body.appendChild(resultImg);
});