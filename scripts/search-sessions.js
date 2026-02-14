#!/usr/bin/env node

/**
 * Script de recherche dans les sessions
 * 
 * Permet de rechercher rapidement dans l'historique des sessions par:
 * - Mots-clés
 * - Fichiers
 * - Tags
 * - Catégories
 * - Dates
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class SessionSearcher {
  constructor() {
    this.config = {
      baseDir: path.join(__dirname, '../Derniere-Session'),
      indexFile: path.join(__dirname, '../Derniere-Session/search-index.json'),
      maxResults: 10,
      contextLines: 3
    };
    
    this.index = null;
  }
  
  /**
   * Rechercher dans les sessions
   */
  async search(query, options = {}) {
    const {
      type = 'keyword', // keyword, file, tag, category, date
      limit = this.config.maxResults,
      showContext = true
    } = options;
    
    console.log(`🔍 Recherche: "${query}" (type: ${type})\n`);
    
    // Charger l'index
    await this.loadIndex();
    
    let results = [];
    
    switch (type) {
      case 'keyword':
        results = await this.searchByKeyword(query);
        break;
      case 'file':
        results = await this.searchByFile(query);
        break;
      case 'tag':
        results = await this.searchByTag(query);
        break;
      case 'category':
        results = await this.searchByCategory(query);
        break;
      case 'date':
        results = await this.searchByDate(query);
        break;
      default:
        results = await this.searchAll(query);
    }
    
    // Limiter les résultats
    results = results.slice(0, limit);
    
    // Afficher les résultats
    await this.displayResults(results, query, showContext);
    
    return results;
  }
  
  /**
   * Charger l'index de recherche
   */
  async loadIndex() {
    try {
      const indexContent = await fs.readFile(this.config.indexFile, 'utf8');
      this.index = JSON.parse(indexContent);
    } catch (error) {
      console.warn('⚠️  Index non trouvé, recherche dans les fichiers...');
      await this.buildIndex();
    }
  }
  
  /**
   * Construire l'index à partir des fichiers
   */
  async buildIndex() {
    this.index = { sessions: [], keywords: {}, files: {} };
    
    const files = await fs.readdir(this.config.baseDir);
    const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.md'));
    
    for (const file of sessionFiles) {
      const content = await fs.readFile(path.join(this.config.baseDir, file), 'utf8');
      const metadata = this.extractMetadata(content);
      
      const session = {
        id: file,
        file: file,
        ...metadata,
        content: content
      };
      
      this.index.sessions.push(session);
    }
  }
  
  /**
   * Extraire les métadonnées d'une session
   */
  extractMetadata(content) {
    const metadata = {
      number: 0,
      date: '',
      category: 'general',
      tags: [],
      topics: [],
      filesCreated: [],
      filesModified: []
    };
    
    // Extraire le numéro
    const numberMatch = content.match(/Session de Développement #(\d+)/);
    if (numberMatch) metadata.number = parseInt(numberMatch[1]);
    
    // Extraire la date
    const dateMatch = content.match(/\*\*Date\*\* : ([\d-]+)/);
    if (dateMatch) metadata.date = dateMatch[1];
    
    // Extraire la catégorie
    const categoryMatch = content.match(/\*\*Catégorie\*\* : ([^\n]+)/);
    if (categoryMatch) metadata.category = categoryMatch[1];
    
    // Extraire les tags
    const tagsMatch = content.match(/\*\*Tags\*\* : ([^\n]+)/);
    if (tagsMatch) {
      metadata.tags = tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
    }
    
    // Extraire les topics
    const topicsSection = content.match(/### Topics abordés\n([\s\S]*?)###/);
    if (topicsSection) {
      metadata.topics = topicsSection[1]
        .split('\n')
        .filter(l => l.startsWith('-'))
        .map(l => l.substring(2).trim());
    }
    
    // Extraire les fichiers
    const filesCreatedSection = content.match(/### Fichiers créés[^\n]*\n([\s\S]*?)###/);
    if (filesCreatedSection) {
      metadata.filesCreated = filesCreatedSection[1]
        .split('\n')
        .filter(l => l.includes('`'))
        .map(l => l.match(/`([^`]+)`/)?.[1])
        .filter(Boolean);
    }
    
    return metadata;
  }
  
  /**
   * Rechercher par mot-clé
   */
  async searchByKeyword(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();
    
    for (const session of this.index.sessions) {
      let score = 0;
      const matches = [];
      
      // Rechercher dans le contenu
      if (session.content) {
        const contentLower = session.content.toLowerCase();
        const keywordCount = (contentLower.match(new RegExp(searchTerm, 'g')) || []).length;
        score += keywordCount * 1;
        
        if (keywordCount > 0) {
          // Extraire le contexte
          const lines = session.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(searchTerm)) {
              matches.push({
                line: i + 1,
                text: lines[i],
                context: lines.slice(
                  Math.max(0, i - this.config.contextLines),
                  i + this.config.contextLines + 1
                ).join('\n')
              });
            }
          }
        }
      }
      
      // Bonus pour les métadonnées
      if (session.topics.some(t => t.toLowerCase().includes(searchTerm))) score += 5;
      if (session.tags.some(t => t.toLowerCase().includes(searchTerm))) score += 3;
      if (session.filesCreated.some(f => f.toLowerCase().includes(searchTerm))) score += 2;
      if (session.filesModified.some(f => f.toLowerCase().includes(searchTerm))) score += 2;
      
      if (score > 0) {
        results.push({
          session,
          score,
          matches
        });
      }
    }
    
    // Trier par score
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Rechercher par fichier
   */
  async searchByFile(filename) {
    const results = [];
    const searchFile = filename.toLowerCase();
    
    for (const session of this.index.sessions) {
      const matchingFiles = [
        ...session.filesCreated.filter(f => f.toLowerCase().includes(searchFile)),
        ...session.filesModified.filter(f => f.toLowerCase().includes(searchFile))
      ];
      
      if (matchingFiles.length > 0) {
        results.push({
          session,
          score: matchingFiles.length,
          matches: matchingFiles.map(f => ({
            file: f,
            type: session.filesCreated.includes(f) ? 'created' : 'modified'
          }))
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Rechercher par tag
   */
  async searchByTag(tag) {
    const results = [];
    const searchTag = tag.toLowerCase();
    
    for (const session of this.index.sessions) {
      if (session.tags.some(t => t.toLowerCase() === searchTag)) {
        results.push({
          session,
          score: 1,
          matches: [{ tag: searchTag }]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Rechercher par catégorie
   */
  async searchByCategory(category) {
    const results = [];
    const searchCategory = category.toLowerCase();
    
    for (const session of this.index.sessions) {
      if (session.category.toLowerCase() === searchCategory) {
        results.push({
          session,
          score: 1,
          matches: [{ category: session.category }]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Rechercher par date
   */
  async searchByDate(date) {
    const results = [];
    
    for (const session of this.index.sessions) {
      if (session.date === date || session.date.includes(date)) {
        results.push({
          session,
          score: 1,
          matches: [{ date: session.date }]
        });
      }
    }
    
    return results.sort((a, b) => b.session.date.localeCompare(a.session.date));
  }
  
  /**
   * Recherche globale
   */
  async searchAll(query) {
    const keywordResults = await this.searchByKeyword(query);
    const fileResults = await this.searchByFile(query);
    const tagResults = await this.searchByTag(query);
    
    // Fusionner et dédupliquer
    const allResults = [...keywordResults, ...fileResults, ...tagResults];
    const uniqueResults = [];
    const seenIds = new Set();
    
    for (const result of allResults) {
      if (!seenIds.has(result.session.id)) {
        seenIds.add(result.session.id);
        uniqueResults.push(result);
      }
    }
    
    return uniqueResults.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Afficher les résultats
   */
  async displayResults(results, query, showContext) {
    if (results.length === 0) {
      console.log('❌ Aucun résultat trouvé\n');
      return;
    }
    
    console.log(`✅ ${results.length} résultat(s) trouvé(s)\n`);
    
    for (const [index, result] of results.entries()) {
      const { session, score, matches } = result;
      
      console.log(`${index + 1}. Session #${session.number} - ${session.date}`);
      console.log(`   📁 Fichier: ${session.file}`);
      console.log(`   📂 Catégorie: ${session.category}`);
      console.log(`   🏷️  Tags: ${session.tags.join(', ') || 'Aucun'}`);
      console.log(`   📊 Score: ${score}`);
      
      if (showContext && matches && matches.length > 0) {
        console.log('   📍 Correspondances:');
        
        for (const match of matches.slice(0, 3)) {
          if (match.text) {
            console.log(`      Ligne ${match.line}: ${this.highlightMatch(match.text, query)}`);
          } else if (match.file) {
            console.log(`      Fichier ${match.type}: ${match.file}`);
          } else if (match.tag) {
            console.log(`      Tag: ${match.tag}`);
          }
        }
        
        if (matches.length > 3) {
          console.log(`      ... et ${matches.length - 3} autre(s)`);
        }
      }
      
      console.log('');
    }
  }
  
  /**
   * Surligner les correspondances
   */
  highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '\x1b[33m$1\x1b[0m');
  }
  
  /**
   * Mode interactif
   */
  async interactiveMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'search> '
    });
    
    console.log('🔍 Mode de recherche interactif');
    console.log('Commandes: :help, :quit, :file <nom>, :tag <tag>, :date <YYYY-MM-DD>\n');
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input === ':quit' || input === ':q') {
        rl.close();
        return;
      }
      
      if (input === ':help' || input === ':h') {
        console.log(`
Commandes disponibles:
  :help          Afficher cette aide
  :quit          Quitter
  :file <nom>    Rechercher par fichier
  :tag <tag>     Rechercher par tag
  :cat <cat>     Rechercher par catégorie
  :date <date>   Rechercher par date
  <texte>        Recherche par mot-clé
        `);
        rl.prompt();
        return;
      }
      
      if (input.startsWith(':')) {
        const [cmd, ...args] = input.split(' ');
        const query = args.join(' ');
        
        switch (cmd) {
          case ':file':
            await this.search(query, { type: 'file' });
            break;
          case ':tag':
            await this.search(query, { type: 'tag' });
            break;
          case ':cat':
          case ':category':
            await this.search(query, { type: 'category' });
            break;
          case ':date':
            await this.search(query, { type: 'date' });
            break;
          default:
            console.log(`Commande inconnue: ${cmd}`);
        }
      } else if (input) {
        await this.search(input);
      }
      
      rl.prompt();
    });
    
    rl.on('close', () => {
      console.log('\n👋 Au revoir!');
      process.exit(0);
    });
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  const searcher = new SessionSearcher();
  
  if (args.length === 0) {
    // Mode interactif
    await searcher.interactiveMode();
    return;
  }
  
  // Mode ligne de commande
  let query = '';
  let options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.type = 'file';
        query = args[++i];
        break;
      case '--tag':
      case '-t':
        options.type = 'tag';
        query = args[++i];
        break;
      case '--category':
      case '-c':
        options.type = 'category';
        query = args[++i];
        break;
      case '--date':
      case '-d':
        options.type = 'date';
        query = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i]);
        break;
      case '--no-context':
        options.showContext = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node search-sessions.js [options] [query]

Options:
  -f, --file <name>      Rechercher par nom de fichier
  -t, --tag <tag>        Rechercher par tag
  -c, --category <cat>   Rechercher par catégorie
  -d, --date <date>      Rechercher par date (YYYY-MM-DD)
  -l, --limit <n>        Limiter le nombre de résultats (défaut: 10)
  --no-context           Ne pas afficher le contexte
  -h, --help             Afficher cette aide

Mode interactif:
  node search-sessions.js   (sans arguments)

Exemples:
  node search-sessions.js "MCP"
  node search-sessions.js --file "save-session"
  node search-sessions.js --tag "feature"
  node search-sessions.js --date "2025-06-27"
        `);
        process.exit(0);
      default:
        if (!query && !args[i].startsWith('-')) {
          query = args[i];
        }
    }
  }
  
  if (query) {
    await searcher.search(query, options);
  } else {
    console.error('❌ Aucune requête fournie');
    process.exit(1);
  }
}

// Exécuter
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SessionSearcher };