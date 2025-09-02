

/*

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let container = document.querySelector('.canvas-container');

let maskCanvas = document.createElement('canvas');
let maskCtx = maskCanvas.getContext('2d');

let img = new Image();
let points = [];
let isClosed = false;

let polygonPoints = [];  // pontos da seleção
  // controle do polígono

// Zoom/pan
let scale = 1, offsetX = 0, offsetY = 0;
let isDragging = false, lastX = 0, lastY = 0;
const MAX_SCALE = 5;

// Upload da imagem
document.getElementById('upload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { img.src = reader.result; };
  reader.readAsDataURL(file);
});

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  maskCanvas.width = img.width;
  maskCanvas.height = img.height;

  clampOffsets();
  drawPolygon();
};

// Mouse pos com compensação de zoom/pan
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  return { x: (mouseX - offsetX) / scale, y: (mouseY - offsetY) / scale };
}

// Clique para adicionar ponto
canvas.addEventListener('click', e => {
  if (isClosed) return;
  const pos = getMousePos(e);
  points.push(pos);
  drawPolygon();
});

// Teclado
document.addEventListener('keydown', e => {
  // Ctrl+Z desfaz ponto
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (points.length > 0 && !isClosed) {
      points.pop();
      drawPolygon();
    }
  }

  // Enter fecha polígono
  if (e.key === 'Enter' && points.length > 2) {
    isClosed = true;
    drawPolygon(true);
    createMask();
  }

  // F11 para fullscreen
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
});



// Botão de reset
document.getElementById("resetBtn").addEventListener("click", () => {
  polygonPoints = [];   // limpa seleção
  isClosed = false;
  drawImageOnCanvas();  // redesenha apenas a imagem, sem polígono
});

function drawImageOnCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Se existir seleção, desenha
  if (polygonPoints.length > 0) {
    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}



// Desenho do polígono
function drawPolygon(close = false) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.drawImage(img, 0, 0);

  if (points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (close) ctx.closePath();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 / scale, 0, 2 * Math.PI);
      ctx.fillStyle = "blue";
      ctx.fill();
    });
  }
}

// Cria máscara
function createMask() {
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.beginPath();
  maskCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) maskCtx.lineTo(points[i].x, points[i].y);
  maskCtx.closePath();
  maskCtx.fillStyle = "white";
  maskCtx.fill();
}

// Envio
document.getElementById('send').addEventListener('click', async () => {
  if (!isClosed) { alert("Clique em Enter para fechar polígono"); return; }
  const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const maskBlob = await new Promise(resolve => maskCanvas.toBlob(resolve, 'image/png'));
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  formData.append('mask', maskBlob, 'mask.png');

  try {
    const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Erro no envio");
    const blobRes = await res.blob();
    const url = URL.createObjectURL(blobRes);
    const resultImg = new Image();
    resultImg.src = url;
    document.body.appendChild(resultImg);
  } catch (err) { console.error(err); }
});

// Zoom com scroll
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const mouse = getMousePos(e);

  let factor = Math.pow(1.1, e.deltaY < 0 ? 1 : -1);
  let newScale = scale * factor;
  const minScale = getMinScale();

  if (newScale < minScale) factor = minScale / scale;
  if (newScale > MAX_SCALE) factor = MAX_SCALE / scale;

  offsetX = mouse.x - factor * (mouse.x - offsetX);
  offsetY = mouse.y - factor * (mouse.y - offsetY);
  scale *= factor;

  clampOffsets();
  drawPolygon(isClosed);
});

// Pan com botão do meio
canvas.addEventListener('mousedown', e => {
  if (e.button !== 1) return;
  isDragging = true;
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  offsetX += e.clientX - lastX;
  offsetY += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  clampOffsets();
  drawPolygon(isClosed);
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// Limita offsets para não mostrar fundo branco
function clampOffsets() {
  const w = img.width * scale, h = img.height * scale;

  if (w < canvas.width) offsetX = (canvas.width - w) / 2;
  else offsetX = Math.min(0, Math.max(offsetX, canvas.width - w));

  if (h < canvas.height) offsetY = (canvas.height - h) / 2;
  else offsetY = Math.min(0, Math.max(offsetY, canvas.height - h));
}

// Calcula zoom mínimo
function getMinScale() {
  return Math.max(canvas.width / img.width, canvas.height / img.height);
}

// Tela cheia
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      alert(`Erro ao entrar em tela cheia: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}



document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);



*/

// Abrir/fechar menu hamburger
const hamburgerIcon = document.getElementById('hamburgerIcon');
const menuContent = document.getElementById('menuContent');

hamburgerIcon.addEventListener('click', () => {
  menuContent.style.display = menuContent.style.display === 'block' ? 'none' : 'block';
});

// Alterar plano de fundo
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.style.background = btn.dataset.color;
  });
});


let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let container = document.querySelector('.canvas-container');

let maskCanvas = document.createElement('canvas');
let maskCtx = maskCanvas.getContext('2d');

let img = new Image();
let points = [];
let isClosed = false;

let polygonPoints = [];  // pontos da seleção
  // controle do polígono

// Zoom/pan
let scale = 1, offsetX = 0, offsetY = 0;
let isDragging = false, lastX = 0, lastY = 0;
const MAX_SCALE = 5;



// Upload da imagem
document.getElementById('upload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { img.src = reader.result; };
  reader.readAsDataURL(file);
});

img.onload = () => {
  canvas.width = img.width;
  canvas.height = img.height;
  maskCanvas.width = img.width;
  maskCanvas.height = img.height;

  clampOffsets();
  drawPolygon();
};



// Mouse pos com compensação de zoom/pan
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  return { x: (mouseX - offsetX) / scale, y: (mouseY - offsetY) / scale };
}

// Clique para adicionar ponto
canvas.addEventListener('click', e => {
  if (isClosed) return;
  const pos = getMousePos(e);
  points.push(pos);
  drawPolygon();
});

// Teclado
document.addEventListener('keydown', e => {
  // Ctrl+Z desfaz ponto
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (points.length > 0 && !isClosed) {
      points.pop();
      drawPolygon();
    }
  }

  // Enter fecha polígono
  if (e.key === 'Enter' && points.length > 2) {
    isClosed = true;
    drawPolygon(true);
    createMask();
  }

  // F11 para fullscreen
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
});




// Botão de reset
document.getElementById("resetBtn").addEventListener("click", () => {
  polygonPoints = [];   // limpa seleção
  isClosed = false;
  drawImageOnCanvas();  // redesenha apenas a imagem, sem polígono
});

function drawImageOnCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Se existir seleção, desenha
  if (polygonPoints.length > 0) {
    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}



// Desenho do polígono
function drawPolygon(close = false) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.drawImage(img, 0, 0);

  if (points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (close) ctx.closePath();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 / scale, 0, 2 * Math.PI);
      ctx.fillStyle = "blue";
      ctx.fill();
    });
  }
}

// Cria máscara
function createMask() {
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  maskCtx.beginPath();
  maskCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) maskCtx.lineTo(points[i].x, points[i].y);
  maskCtx.closePath();
  maskCtx.fillStyle = "white";
  maskCtx.fill();
}

// Envio
document.getElementById('send').addEventListener('click', async () => {
  if (!isClosed) { alert("Clique em Enter para fechar polígono"); return; }
  const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const maskBlob = await new Promise(resolve => maskCanvas.toBlob(resolve, 'image/png'));
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  formData.append('mask', maskBlob, 'mask.png');

  try {
  const res = await fetch('/api/remove-bg', { method: 'POST', body: formData });
  if (!res.ok) throw new Error("Erro no envio");
  const blobRes = await res.blob();
  const url = URL.createObjectURL(blobRes);

  const resultImg = new Image();
  resultImg.src = url;

  // 🔽 controla exibição da imagem cortada
  resultImg.style.maxWidth = "250px";  // largura máxima
  resultImg.style.height = "auto";     // mantém proporção
  resultImg.style.display = "block";
  resultImg.style.margin = "20px auto";
  resultImg.style.border = "2px solid #ccc";
  resultImg.style.borderRadius = "8px";

   // Botão de download
  const downloadBtn = document.createElement("a");
  downloadBtn.href = url;
  downloadBtn.download = `corte-${Date.now()}.png`; // nome do arquivo
  downloadBtn.innerText = "⬇️ Baixar imagem";
  downloadBtn.style.display = "block";
  downloadBtn.style.textAlign = "center";
  downloadBtn.style.margin = "10px auto";
  downloadBtn.style.padding = "10px 20px";
  downloadBtn.style.background = "#4CAF50";
  downloadBtn.style.color = "white";
  downloadBtn.style.borderRadius = "6px";
  downloadBtn.style.textDecoration = "none";
  downloadBtn.style.fontWeight = "bold";

  // Adiciona no body (ou em uma div específica se preferir)
  const container = document.createElement("div");
  container.style.textAlign = "center";
  container.appendChild(resultImg);
  container.appendChild(downloadBtn);


document.body.appendChild(container);
  
  } catch (err) { console.error(err); }
});

// Zoom com scroll
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const mouse = getMousePos(e);

  let factor = Math.pow(1.1, e.deltaY < 0 ? 1 : -1);
  let newScale = scale * factor;
  const minScale = getMinScale();

  if (newScale < minScale) factor = minScale / scale;
  if (newScale > MAX_SCALE) factor = MAX_SCALE / scale;

  offsetX = mouse.x - factor * (mouse.x - offsetX);
  offsetY = mouse.y - factor * (mouse.y - offsetY);
  scale *= factor;

  clampOffsets();
  drawPolygon(isClosed);
});

// Pan com botão do meio
canvas.addEventListener('mousedown', e => {
  if (e.button !== 1) return;
  isDragging = true;
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  offsetX += e.clientX - lastX;
  offsetY += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  clampOffsets();
  drawPolygon(isClosed);
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// Limita offsets para não mostrar fundo branco
function clampOffsets() {
  const w = img.width * scale, h = img.height * scale;

  if (w < canvas.width) offsetX = (canvas.width - w) / 2;
  else offsetX = Math.min(0, Math.max(offsetX, canvas.width - w));

  if (h < canvas.height) offsetY = (canvas.height - h) / 2;
  else offsetY = Math.min(0, Math.max(offsetY, canvas.height - h));
}

// Calcula zoom mínimo
function getMinScale() {
  return Math.max(canvas.width / img.width, canvas.height / img.height);
}

// Tela cheia
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      alert(`Erro ao entrar em tela cheia: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}



document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
