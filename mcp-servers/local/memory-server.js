const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Stockage en mémoire
const memory = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'memory-mcp', items: memory.size });
});

app.post('/mcp', (req, res) => {
  const { method, params, id } = req.body;
  let result;

  switch(method) {
    case 'store':
      memory.set(params.key, params.value);
      result = { success: true, key: params.key };
      break;
    case 'retrieve':
      result = { value: memory.get(params.key) || null };
      break;
    case 'list':
      result = { keys: Array.from(memory.keys()) };
      break;
    case 'clear':
      memory.clear();
      result = { success: true };
      break;
    default:
      result = { error: 'Unknown method' };
  }

  res.json({ jsonrpc: '2.0', result, id: id || 1 });
});

app.listen(port, () => {
  console.log(`Memory MCP Server listening on port ${port}`);
});
