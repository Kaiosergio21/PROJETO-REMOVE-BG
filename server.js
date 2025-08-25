const express = require('express');
const path = require('path');
const routes = require('./src/routes');

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public','index.html'));
});


// Servir frontend se quiser (HTML simples ou React futuramente)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
