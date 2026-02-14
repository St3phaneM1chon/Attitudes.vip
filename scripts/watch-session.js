#!/usr/bin/env node
const chokidar = require('chokidar');
const { EnhancedSessionSaver } = require('./save-session-v2');

const watcher = chokidar.watch(['src/**/*.js', 'docs/**/*.md'], {
  ignored: /node_modules/,
  persistent: true
});

let saveTimeout;
const saver = new EnhancedSessionSaver();

watcher.on('change', (path) => {
  console.log(`File changed: ${path}`);
  
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saver.saveSession({ 
      category: 'auto-save',
      tags: ['watch'],
      runTests: false 
    });
  }, 5000);
});

console.log('👁️  Watching for changes...');
