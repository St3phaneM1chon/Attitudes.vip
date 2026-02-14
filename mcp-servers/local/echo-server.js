const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'echo-mcp' });
});

// Echo endpoint
app.post('/echo', (req, res) => {
  res.json({ echo: req.body, timestamp: new Date().toISOString() });
});

// MCP protocol endpoint
app.post('/mcp', (req, res) => {
  const { method, params } = req.body;
  res.json({
    jsonrpc: '2.0',
    result: {
      method,
      params,
      service: 'echo-mcp',
      timestamp: new Date().toISOString()
    },
    id: req.body.id || 1
  });
});

app.listen(port, () => {
  console.log(`Echo MCP Server listening on port ${port}`);
});
