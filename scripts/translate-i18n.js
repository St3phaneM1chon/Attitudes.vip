#!/usr/bin/env node
/**
 * AI-POWERED TRANSLATION SCRIPT
 * ===============================
 * Translates i18n JSON files using Claude API (or OpenAI fallback).
 * Preserves existing translations, only fills missing keys.
 * Supports nested JSON, interpolation variables {{name}}, and plurals.
 *
 * Features:
 * - Detects missing keys automatically
 * - Preserves existing translations (never overwrites)
 * - Handles nested JSON structures
 * - Respects i18next interpolation {{variables}}
 * - Cultural context for wedding-specific terminology
 * - Batch processing for efficiency
 * - Dry-run mode for preview
 *
 * Usage:
 *   node translate-i18n.js --source fr --targets en,ar,es --locales-dir ./src/i18n/locales
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = {};
for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
        const key = process.argv[i].slice(2);
        const val = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
        args[key] = val;
    }
}

const SOURCE_LANG = args.source || 'fr';
const TARGET_LANGS = (args.targets || 'en,ar,es,he,hi,zh,de').split(',');
const LOCALES_DIR = args['locales-dir'] || path.join(__dirname, '..', 'src', 'i18n', 'locales');
const NAMESPACE = args.namespace || null;
const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true';

// Language names for context
const LANG_NAMES = {
    fr: 'French', en: 'English', ar: 'Arabic', es: 'Spanish',
    he: 'Hebrew', hi: 'Hindi', zh: 'Chinese (Simplified)',
    de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
    ja: 'Japanese', ko: 'Korean', ru: 'Russian', tr: 'Turkish',
    sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish',
    pl: 'Polish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian',
};

/**
 * Read a JSON file, return {} if not found
 */
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return {};
    }
}

/**
 * Write JSON file with pretty formatting
 */
function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Flatten nested object to dot-notation paths
 */
function flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, fullKey));
        } else {
            result[fullKey] = value;
        }
    }
    return result;
}

/**
 * Unflatten dot-notation paths back to nested object
 */
function unflattenObject(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
    return result;
}

/**
 * Find missing keys in target compared to source
 */
function findMissingKeys(source, target) {
    const flatSource = flattenObject(source);
    const flatTarget = flattenObject(target);
    const missing = {};

    for (const [key, value] of Object.entries(flatSource)) {
        if (!(key in flatTarget) && typeof value === 'string') {
            missing[key] = value;
        }
    }

    return missing;
}

/**
 * Translate texts using Claude API
 */
async function translateWithClaude(texts, sourceLang, targetLang) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.warn('  ANTHROPIC_API_KEY not set, trying OpenAI...');
        return translateWithOpenAI(texts, sourceLang, targetLang);
    }

    const sourceName = LANG_NAMES[sourceLang] || sourceLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    const prompt = `Translate the following JSON key-value pairs from ${sourceName} to ${targetName}.

IMPORTANT RULES:
1. This is for a WEDDING PLANNING platform (Attitudes.vip)
2. Preserve ALL {{variables}} exactly as-is (e.g., {{name}}, {{count}})
3. Preserve ALL HTML tags if present
4. Use culturally appropriate wedding terminology for the target language
5. Keep translations concise and natural
6. Return ONLY valid JSON, no extra text

Input JSON (${sourceName}):
${JSON.stringify(texts, null, 2)}

Output JSON (${targetName}):`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content[0].text.trim();

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (error) {
        console.error(`  Translation error (Claude): ${error.message}`);
        return null;
    }
}

/**
 * Translate texts using OpenAI API (fallback)
 */
async function translateWithOpenAI(texts, sourceLang, targetLang) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('  No API key available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
        return null;
    }

    const sourceName = LANG_NAMES[sourceLang] || sourceLang;
    const targetName = LANG_NAMES[targetLang] || targetLang;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `Translate from ${sourceName} to ${targetName} for a wedding platform. Preserve {{variables}} and HTML. Return ONLY JSON:\n${JSON.stringify(texts, null, 2)}`
                }],
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        console.error(`  Translation error (OpenAI): ${error.message}`);
        return null;
    }
}

/**
 * Process a single namespace file
 */
async function processNamespace(ns, sourceLang, targetLang) {
    // Check both flat file and namespace directory
    const sourceFlat = path.join(LOCALES_DIR, `${sourceLang}.json`);
    const sourceNs = path.join(LOCALES_DIR, sourceLang, `${ns}.json`);
    const targetFlat = path.join(LOCALES_DIR, `${targetLang}.json`);
    const targetNs = path.join(LOCALES_DIR, targetLang, `${ns}.json`);

    let sourceData, targetData, targetPath;

    // Determine which file format is used
    if (fs.existsSync(sourceNs)) {
        sourceData = readJsonFile(sourceNs);
        targetData = readJsonFile(targetNs);
        targetPath = targetNs;
    } else if (ns === 'translation' && fs.existsSync(sourceFlat)) {
        sourceData = readJsonFile(sourceFlat);
        targetData = readJsonFile(targetFlat);
        targetPath = targetFlat;
    } else {
        return { ns, missing: 0, translated: 0, skipped: true };
    }

    // Find missing keys
    const missing = findMissingKeys(sourceData, targetData);
    const missingCount = Object.keys(missing).length;

    if (missingCount === 0) {
        return { ns, missing: 0, translated: 0, skipped: false };
    }

    console.log(`  [${ns}] ${missingCount} missing keys`);

    if (DRY_RUN) {
        for (const [key, value] of Object.entries(missing)) {
            console.log(`    - ${key}: "${value}"`);
        }
        return { ns, missing: missingCount, translated: 0, dryRun: true };
    }

    // Translate in batches of 50 keys
    const BATCH_SIZE = 50;
    const keys = Object.keys(missing);
    let translatedCount = 0;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batchKeys = keys.slice(i, i + BATCH_SIZE);
        const batchTexts = {};
        for (const k of batchKeys) {
            batchTexts[k] = missing[k];
        }

        const translations = await translateWithClaude(batchTexts, sourceLang, targetLang);

        if (translations) {
            // Merge translations into target
            const flatTarget = flattenObject(targetData);
            for (const [key, value] of Object.entries(translations)) {
                if (typeof value === 'string' && value.trim()) {
                    flatTarget[key] = value;
                    translatedCount++;
                }
            }
            targetData = unflattenObject(flatTarget);
        }

        // Rate limiting
        if (i + BATCH_SIZE < keys.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Write updated target file
    if (translatedCount > 0) {
        writeJsonFile(targetPath, targetData);
        console.log(`  [${ns}] Wrote ${translatedCount} translations to ${path.relative(process.cwd(), targetPath)}`);
    }

    return { ns, missing: missingCount, translated: translatedCount };
}

/**
 * Main entry point
 */
async function main() {
    console.log(`\nSource language: ${SOURCE_LANG}`);
    console.log(`Target languages: ${TARGET_LANGS.join(', ')}`);
    console.log(`Locales directory: ${LOCALES_DIR}`);
    console.log(`Dry run: ${DRY_RUN}\n`);

    // Discover namespaces from source language directory
    let namespaces = [];
    const sourceLangDir = path.join(LOCALES_DIR, SOURCE_LANG);

    if (NAMESPACE) {
        namespaces = [NAMESPACE];
    } else if (fs.existsSync(sourceLangDir)) {
        const entries = fs.readdirSync(sourceLangDir);
        for (const entry of entries) {
            if (entry.endsWith('.json')) {
                namespaces.push(entry.replace('.json', ''));
            } else if (fs.statSync(path.join(sourceLangDir, entry)).isDirectory()) {
                // Check for nested namespace directories
                const subEntries = fs.readdirSync(path.join(sourceLangDir, entry));
                for (const sub of subEntries) {
                    if (sub.endsWith('.json')) {
                        namespaces.push(`${entry}/${sub.replace('.json', '')}`);
                    }
                }
            }
        }
        // Also add the flat file if it exists
        const flatFile = path.join(LOCALES_DIR, `${SOURCE_LANG}.json`);
        if (fs.existsSync(flatFile)) {
            namespaces.unshift('translation');
        }
    }

    if (namespaces.length === 0) {
        console.log('No namespaces found to translate.');
        return;
    }

    console.log(`Namespaces: ${namespaces.join(', ')}\n`);

    const totalStats = { totalMissing: 0, totalTranslated: 0 };

    for (const targetLang of TARGET_LANGS) {
        console.log(`\n--- ${LANG_NAMES[targetLang] || targetLang} (${targetLang}) ---`);

        for (const ns of namespaces) {
            const result = await processNamespace(ns, SOURCE_LANG, targetLang);

            if (result.skipped) continue;
            if (result.missing === 0) {
                console.log(`  [${ns}] Up to date`);
                continue;
            }

            totalStats.totalMissing += result.missing;
            totalStats.totalTranslated += result.translated || 0;
        }
    }

    console.log('\n============================================');
    console.log(`Total missing keys found: ${totalStats.totalMissing}`);
    console.log(`Total translations added: ${totalStats.totalTranslated}`);
    if (DRY_RUN) {
        console.log('(Dry run - no files modified)');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
