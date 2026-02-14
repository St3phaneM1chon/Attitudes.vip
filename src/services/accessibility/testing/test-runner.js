/**
 * Accessibility Test Runner
 * CLI tool for running accessibility tests
 */

const { AccessibilityTester } = require('./index');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class AccessibilityTestRunner {
  constructor() {
    this.tester = new AccessibilityTester();
    this.results = [];
  }

  /**
   * Run tests on multiple URLs
   * @param {Array<string>} urls - URLs to test
   * @param {Object} options - Test options
   */
  async runTests(urls, options = {}) {
    console.log(chalk.blue('\n🔍 Starting Accessibility Tests...\n'));

    for (const url of urls) {
      console.log(chalk.yellow(`Testing: ${url}`));
      
      try {
        const result = await this.tester.testUrl(url, options);
        this.results.push(result);
        
        this.printSummary(result);
        
      } catch (error) {
        console.error(chalk.red(`Error testing ${url}: ${error.message}`));
        this.results.push({
          url,
          error: error.message,
          summary: { errors: 1, warnings: 0, notices: 0, passed: 0 }
        });
      }
    }

    await this.tester.cleanup();
    
    return this.results;
  }

  /**
   * Print result summary
   * @param {Object} result - Test result
   */
  printSummary(result) {
    const { summary } = result;
    
    console.log(chalk.white('\nSummary:'));
    console.log(chalk.red(`  Errors: ${summary.errors}`));
    console.log(chalk.yellow(`  Warnings: ${summary.warnings}`));
    console.log(chalk.blue(`  Notices: ${summary.notices}`));
    console.log(chalk.green(`  Passed: ${summary.passed}`));
    
    // Print critical violations
    if (result.axe && result.axe.violations.length > 0) {
      console.log(chalk.red('\nCritical Violations:'));
      result.axe.violations.slice(0, 5).forEach(violation => {
        console.log(chalk.red(`  • ${violation.help} (${violation.impact})`));
      });
      
      if (result.axe.violations.length > 5) {
        console.log(chalk.gray(`  ... and ${result.axe.violations.length - 5} more`));
      }
    }
    
    console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');
  }

  /**
   * Generate reports
   * @param {string} outputDir - Output directory
   */
  async generateReports(outputDir) {
    console.log(chalk.blue('\n📄 Generating Reports...\n'));

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Generate individual reports
    for (const result of this.results) {
      const urlSlug = this.urlToSlug(result.url);
      
      // JSON report
      const jsonPath = path.join(outputDir, `${urlSlug}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));
      console.log(chalk.green(`✓ JSON report: ${jsonPath}`));
      
      // HTML report
      const htmlPath = path.join(outputDir, `${urlSlug}.html`);
      const htmlContent = this.tester.generateHTMLReport(result);
      await fs.writeFile(htmlPath, htmlContent);
      console.log(chalk.green(`✓ HTML report: ${htmlPath}`));
    }

    // Generate summary report
    await this.generateSummaryReport(outputDir);
  }

  /**
   * Generate summary report
   * @param {string} outputDir - Output directory
   */
  async generateSummaryReport(outputDir) {
    const summary = {
      timestamp: new Date().toISOString(),
      totalUrls: this.results.length,
      totalErrors: 0,
      totalWarnings: 0,
      totalNotices: 0,
      totalPassed: 0,
      urlResults: []
    };

    this.results.forEach(result => {
      summary.totalErrors += result.summary.errors;
      summary.totalWarnings += result.summary.warnings;
      summary.totalNotices += result.summary.notices;
      summary.totalPassed += result.summary.passed;
      
      summary.urlResults.push({
        url: result.url,
        errors: result.summary.errors,
        warnings: result.summary.warnings,
        score: this.calculateScore(result.summary)
      });
    });

    // Sort by score
    summary.urlResults.sort((a, b) => a.score - b.score);

    // Generate HTML summary
    const html = this.generateSummaryHTML(summary);
    const summaryPath = path.join(outputDir, 'summary.html');
    await fs.writeFile(summaryPath, html);
    console.log(chalk.green(`\n✓ Summary report: ${summaryPath}`));

    // Generate JSON summary
    const jsonPath = path.join(outputDir, 'summary.json');
    await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));
    console.log(chalk.green(`✓ Summary JSON: ${jsonPath}`));
  }

  /**
   * Calculate accessibility score
   * @param {Object} summary - Result summary
   * @returns {number} Score (0-100)
   */
  calculateScore(summary) {
    const total = summary.errors + summary.warnings + summary.passed;
    if (total === 0) return 100;
    
    // Weighted scoring: errors = -10, warnings = -2, passed = +1
    const score = Math.max(0, Math.min(100, 
      100 - (summary.errors * 10) - (summary.warnings * 2)
    ));
    
    return Math.round(score);
  }

  /**
   * Convert URL to filename-safe slug
   * @param {string} url - URL
   * @returns {string} Slug
   */
  urlToSlug(url) {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Generate summary HTML
   * @param {Object} summary - Summary data
   * @returns {string} HTML content
   */
  generateSummaryHTML(summary) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Accessibility Test Summary</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .stat { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
          .stat h2 { margin: 0; font-size: 2em; }
          .errors { color: #d32f2f; }
          .warnings { color: #f57c00; }
          .notices { color: #1976d2; }
          .passed { color: #388e3c; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f4f4f4; font-weight: bold; }
          .score { font-weight: bold; }
          .score.good { color: #388e3c; }
          .score.medium { color: #f57c00; }
          .score.poor { color: #d32f2f; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Accessibility Test Summary</h1>
          <p><strong>Tested:</strong> ${new Date(summary.timestamp).toLocaleString()}</p>
          <p><strong>URLs Tested:</strong> ${summary.totalUrls}</p>
        </div>

        <div class="stats">
          <div class="stat">
            <h2 class="errors">${summary.totalErrors}</h2>
            <p>Total Errors</p>
          </div>
          <div class="stat">
            <h2 class="warnings">${summary.totalWarnings}</h2>
            <p>Total Warnings</p>
          </div>
          <div class="stat">
            <h2 class="notices">${summary.totalNotices}</h2>
            <p>Total Notices</p>
          </div>
          <div class="stat">
            <h2 class="passed">${summary.totalPassed}</h2>
            <p>Total Passed</p>
          </div>
        </div>

        <h2>Results by URL</h2>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Errors</th>
              <th>Warnings</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${summary.urlResults.map(result => `
              <tr>
                <td>${result.url}</td>
                <td class="errors">${result.errors}</td>
                <td class="warnings">${result.warnings}</td>
                <td class="score ${this.getScoreClass(result.score)}">${result.score}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Recommendations</h2>
        ${this.generateRecommendations(summary)}
      </body>
      </html>
    `;
  }

  /**
   * Get score class for styling
   * @param {number} score - Score value
   * @returns {string} CSS class
   */
  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 70) return 'medium';
    return 'poor';
  }

  /**
   * Generate recommendations based on results
   * @param {Object} summary - Summary data
   * @returns {string} HTML recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.totalErrors > 0) {
      recommendations.push(`
        <div class="recommendation">
          <h3>🔴 Critical Issues Found</h3>
          <p>Address the ${summary.totalErrors} errors immediately as they prevent users from accessing content.</p>
          <ul>
            <li>Fix missing alt text on images</li>
            <li>Ensure all form fields have labels</li>
            <li>Add proper heading structure</li>
            <li>Fix color contrast issues</li>
          </ul>
        </div>
      `);
    }

    if (summary.totalWarnings > 20) {
      recommendations.push(`
        <div class="recommendation">
          <h3>⚠️ Many Warnings Detected</h3>
          <p>While not critical, the ${summary.totalWarnings} warnings should be addressed to improve accessibility.</p>
          <ul>
            <li>Add ARIA labels to interactive elements</li>
            <li>Improve keyboard navigation</li>
            <li>Ensure proper focus management</li>
          </ul>
        </div>
      `);
    }

    const avgScore = Math.round(
      summary.urlResults.reduce((sum, r) => sum + r.score, 0) / summary.urlResults.length
    );

    if (avgScore < 70) {
      recommendations.push(`
        <div class="recommendation">
          <h3>📊 Low Overall Score</h3>
          <p>Average accessibility score is ${avgScore}%. Consider:</p>
          <ul>
            <li>Conducting a comprehensive accessibility audit</li>
            <li>Training developers on WCAG 2.1 guidelines</li>
            <li>Implementing automated testing in CI/CD pipeline</li>
            <li>Getting feedback from users with disabilities</li>
          </ul>
        </div>
      `);
    }

    if (recommendations.length === 0) {
      recommendations.push(`
        <div class="recommendation">
          <h3>✅ Good Accessibility</h3>
          <p>Your pages have good accessibility scores. Continue to:</p>
          <ul>
            <li>Test with real users</li>
            <li>Monitor accessibility in new features</li>
            <li>Stay updated with WCAG guidelines</li>
          </ul>
        </div>
      `);
    }

    return recommendations.join('\n');
  }
}

// CLI interface
if (require.main === module) {
  const { program } = require('commander');
  
  program
    .name('a11y-test')
    .description('Run accessibility tests on URLs')
    .version('1.0.0');

  program
    .command('test <urls...>')
    .description('Test one or more URLs')
    .option('-o, --output <dir>', 'Output directory', './a11y-reports')
    .option('-s, --standard <standard>', 'WCAG standard', 'WCAG2AA')
    .option('--no-warnings', 'Exclude warnings from report')
    .option('--timeout <ms>', 'Page load timeout', '30000')
    .action(async (urls, options) => {
      const runner = new AccessibilityTestRunner();
      
      try {
        await runner.runTests(urls, {
          standard: options.standard,
          includeWarnings: options.warnings,
          timeout: parseInt(options.timeout)
        });
        
        await runner.generateReports(options.output);
        
        console.log(chalk.green('\n✨ Testing complete!'));
        
        // Exit with error code if critical issues found
        const hasErrors = runner.results.some(r => r.summary.errors > 0);
        process.exit(hasErrors ? 1 : 0);
        
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
        process.exit(1);
      }
    });

  program.parse();
}

module.exports = AccessibilityTestRunner;