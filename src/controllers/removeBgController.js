const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

exports.removeBackground = async (req, res) => {
  try {
    // 1️⃣ Verifica se os arquivos chegaram
    console.log("Arquivos recebidos:", req.files);
    if (!req.files || !req.files.image || !req.files.mask) {
      return res.status(400).send('Imagem ou máscara não enviados');
    }

    // 2️⃣ Lê arquivos
    const imageBuffer = fs.readFileSync(req.files.image[0].path);
    const maskBuffer = fs.readFileSync(req.files.mask[0].path);

    let imgTensor = tf.node.decodeImage(imageBuffer, 3); // RGB int32
    let maskTensor = tf.node.decodeImage(maskBuffer, 1); // Grayscale int32

    // 3️⃣ Ajusta resolução se for muito grande
    const maxDim = 2048;
    let [h, w] = imgTensor.shape.slice(0, 2);
    if (h > maxDim || w > maxDim) {
      const scale = maxDim / Math.max(h, w);
      imgTensor = tf.image.resizeBilinear(imgTensor, [Math.round(h * scale), Math.round(w * scale)]);
      maskTensor = tf.image.resizeBilinear(maskTensor, [Math.round(h * scale), Math.round(w * scale)]);
    }

    // 4️⃣ Garante que a máscara tenha o mesmo tamanho da imagem
    maskTensor = tf.image.resizeBilinear(maskTensor, [imgTensor.shape[0], imgTensor.shape[1]]);

    // 5️⃣ Concatena canais (RGBA) com tipos compatíveis
    const finalTensor = tf.tidy(() => {
      const alphaInt = maskTensor.toInt();           // int32
      return tf.concat([imgTensor, alphaInt], 2);   // int32 + int32 = int32
    });

    // 6️⃣ Gera PNG
    const outputBuffer = await tf.node.encodePng(finalTensor);

    // 7️⃣ Libera memória
    finalTensor.dispose();
    tf.dispose([imgTensor, maskTensor]);

    // 8️⃣ Opcional: salvar no disco para debug
    const outputDir = path.resolve(__dirname, '../../outputs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.resolve(outputDir, `no-bg-${Date.now()}.png`);
    fs.writeFileSync(outputPath, outputBuffer);
    console.log("Arquivo salvo em:", outputPath);

    // 9️⃣ Retorna para o navegador
    res.set('Content-Type', 'image/png');
    res.send(outputBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover fundo', details: err.message });
  }
};
