const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

exports.removeBackground = async (req, res) => {
  try {
    if (!req.files || !req.files.image || !req.files.mask) {
      return res.status(400).send('Imagem ou máscara não enviados');
    }

    const imageBuffer = fs.readFileSync(req.files.image[0].path);
    const maskBuffer = fs.readFileSync(req.files.mask[0].path);

    let imgTensor = tf.node.decodeImage(imageBuffer, 3); // RGB
    let maskTensor = tf.node.decodeImage(maskBuffer, 1); // Grayscale

    const maxDim = 512;
    const targetHeight = Math.min(imgTensor.shape[0], maxDim);
    const targetWidth = Math.min(imgTensor.shape[1], maxDim);

    imgTensor = tf.image.resizeBilinear(imgTensor, [targetHeight, targetWidth]);
    maskTensor = tf.image.resizeBilinear(maskTensor, [targetHeight, targetWidth]);

    const outputBuffer = await tf.tidy(() => {
      const maskBool = maskTensor.greater(tf.scalar(128));
      const alpha = maskBool.toFloat().mul(255);
      const finalTensor = tf.concat([imgTensor, alpha], 2).toInt();
      return tf.node.encodePng(finalTensor);
    });

    tf.dispose([imgTensor, maskTensor]);

    const outputDir = path.resolve(__dirname, '../../outputs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.resolve(outputDir, `no-bg-${Date.now()}.png`);
    fs.writeFileSync(outputPath, outputBuffer);

    res.sendFile(outputPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover fundo', details: err.message });
  }
};
