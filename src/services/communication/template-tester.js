/**
 * Template Tester pour Email/SMS Service
 * Permet de tester et prévisualiser les templates
 */

const EmailSMSService = require('./email-sms-service')
const fs = require('fs').promises
const path = require('path')

class TemplateTester {
  constructor () {
    this.emailService = new EmailSMSService({
      // Configuration de test
      smtp: {
        host: 'localhost',
        port: 1025, // MailHog port
        secure: false,
        auth: {
          user: 'test',
          pass: 'test'
        }
      },
      templatesPath: path.join(__dirname, 'templates'),
      enableTemplates: true
    })

    // Données de test
    this.testData = {
      wedding: {
        id: 'wedding_123',
        coupleName: 'Marie & Jean',
        eventDate: new Date('2024-08-15T15:00:00Z'),
        venue: 'Château de Versailles',
        rsvpDeadline: new Date('2024-07-15T23:59:59Z')
      },
      guest: {
        userId: 'user_456',
        name: 'Sophie Martin',
        email: 'sophie@example.com',
        invitationToken: 'token_789'
      },
      vendor: {
        vendorId: 'vendor_123',
        vendorName: 'Fleurs & Co',
        email: 'contact@fleurs-co.fr',
        contractAmount: 150000, // 1500€ en centimes
        contractId: 'contract_456'
      },
      payment: {
        amount: 75000, // 750€
        transactionId: 'txn_789',
        paymentDate: new Date()
      },
      task: {
        title: 'Choisir le menu du mariage',
        description: 'Rencontrer le traiteur et finaliser le menu pour 80 personnes',
        dueDate: new Date('2024-06-01T10:00:00Z'),
        priority: 'high',
        category: 'Traiteur',
        estimatedDuration: 120
      },
      user: {
        userName: 'Marie Dupont',
        email: 'marie@example.com'
      }
    }
  }

  /**
   * Tester tous les templates
   */
  async testAllTemplates () {
    console.log('[TemplateTester] Testing all templates...\n')

    const tests = [
      {
        name: 'Wedding Invitation (FR)',
        template: 'wedding_invitation',
        language: 'fr',
        data: {
          type: 'invitation',
          category: 'wedding',
          recipients: [this.testData.guest.userId],
          channels: ['email'],
          weddingId: this.testData.wedding.id,
          variables: {
            coupleName: this.testData.wedding.coupleName,
            weddingDate: this.testData.wedding.eventDate,
            venue: this.testData.wedding.venue,
            guestName: this.testData.guest.name,
            rsvpLink: `https://attitudes.vip/rsvp/${this.testData.guest.invitationToken}`,
            rsvpDeadline: this.testData.wedding.rsvpDeadline
          }
        }
      },
      {
        name: 'RSVP Reminder (FR)',
        template: 'rsvp_reminder',
        language: 'fr',
        data: {
          type: 'rsvp_reminder',
          category: 'wedding',
          recipients: [this.testData.guest.userId],
          channels: ['email'],
          weddingId: this.testData.wedding.id,
          variables: {
            coupleName: this.testData.wedding.coupleName,
            weddingDate: this.testData.wedding.eventDate,
            guestName: this.testData.guest.name,
            rsvpLink: `https://attitudes.vip/rsvp/${this.testData.guest.invitationToken}`,
            rsvpDeadline: this.testData.wedding.rsvpDeadline
          }
        }
      },
      {
        name: 'Vendor Contract (FR)',
        template: 'vendor_contract',
        language: 'fr',
        data: {
          type: 'contract_sent',
          category: 'vendor',
          recipients: [this.testData.vendor.vendorId],
          channels: ['email'],
          weddingId: this.testData.wedding.id,
          variables: {
            vendorName: this.testData.vendor.vendorName,
            coupleName: this.testData.wedding.coupleName,
            contractAmount: this.testData.vendor.contractAmount,
            contractLink: `https://attitudes.vip/contract/${this.testData.vendor.contractId}`,
            weddingDate: this.testData.wedding.eventDate,
            serviceType: 'Décoration florale'
          }
        }
      },
      {
        name: 'Payment Confirmation (FR)',
        template: 'payment_confirmation',
        language: 'fr',
        data: {
          type: 'payment_received',
          category: 'vendor',
          recipients: [this.testData.vendor.vendorId],
          channels: ['email'],
          weddingId: this.testData.wedding.id,
          variables: {
            vendorName: this.testData.vendor.vendorName,
            coupleName: this.testData.wedding.coupleName,
            amount: this.testData.payment.amount,
            paymentDate: this.testData.payment.paymentDate,
            transactionId: this.testData.payment.transactionId,
            serviceDescription: 'Décoration florale premium'
          }
        }
      },
      {
        name: 'Welcome Email (FR)',
        template: 'welcome',
        language: 'fr',
        data: {
          type: 'welcome',
          category: 'system',
          recipients: [this.testData.user.userName],
          channels: ['email'],
          variables: {
            userName: this.testData.user.userName,
            dashboardUrl: 'https://attitudes.vip/dashboard'
          }
        }
      },
      {
        name: 'Task Reminder (FR)',
        template: 'task_reminder',
        language: 'fr',
        data: {
          type: 'task_reminder',
          category: 'system',
          recipients: [this.testData.user.userName],
          channels: ['email'],
          variables: {
            taskTitle: this.testData.task.title,
            description: this.testData.task.description,
            dueDate: this.testData.task.dueDate,
            priority: this.testData.task.priority,
            category: this.testData.task.category,
            estimatedDuration: this.testData.task.estimatedDuration,
            weddingName: this.testData.wedding.coupleName,
            taskUrl: 'https://attitudes.vip/tasks/123'
          }
        }
      }
    ]

    for (const test of tests) {
      await this.runSingleTest(test)
    }

    console.log('[TemplateTester] All tests completed!\n')
  }

  /**
   * Exécuter un test unique
   */
  async runSingleTest (test) {
    try {
      console.log(`🧪 Testing: ${test.name}`)

      // Préparer le message avec template
      const message = this.emailService.processMessageData({
        ...test.data,
        template: test.template,
        language: test.language
      })

      // Appliquer le template
      this.emailService.applyTemplate(message, test.template)

      // Préparer le contenu email
      const emailContent = await this.emailService.prepareEmailContent(message)

      console.log(`  ✅ Subject: ${emailContent.subject}`)
      console.log(`  📝 Body length: ${emailContent.html.length} chars`)

      // Sauvegarder pour prévisualisation
      await this.savePreview(test.name, emailContent.html)

      console.log(`  💾 Preview saved to previews/${test.name.toLowerCase().replace(/\s+/g, '_')}.html\n`)
    } catch (error) {
      console.error(`  ❌ Error testing ${test.name}:`, error.message)
    }
  }

  /**
   * Sauvegarder un aperçu HTML
   */
  async savePreview (testName, htmlContent) {
    const previewsDir = path.join(__dirname, 'previews')

    try {
      await fs.access(previewsDir)
    } catch {
      await fs.mkdir(previewsDir, { recursive: true })
    }

    const fileName = testName.toLowerCase().replace(/\s+/g, '_') + '.html'
    const filePath = path.join(previewsDir, fileName)

    await fs.writeFile(filePath, htmlContent, 'utf8')
  }

  /**
   * Tester les templates SMS
   */
  async testSMSTemplates () {
    console.log('[TemplateTester] Testing SMS templates...\n')

    const smsTests = [
      {
        name: 'RSVP Reminder SMS (FR)',
        data: {
          type: 'rsvp_reminder',
          category: 'wedding',
          template: 'rsvp_reminder_sms',
          language: 'fr',
          channels: ['sms'],
          variables: {
            coupleName: this.testData.wedding.coupleName,
            weddingDate: this.testData.wedding.eventDate,
            rsvpDeadline: this.testData.wedding.rsvpDeadline,
            rsvpLink: 'https://attitudes.vip/rsvp/short'
          }
        }
      },
      {
        name: 'Payment Confirmation SMS (FR)',
        data: {
          type: 'payment_received',
          category: 'vendor',
          template: 'payment_confirmation_sms',
          language: 'fr',
          channels: ['sms'],
          variables: {
            amount: this.testData.payment.amount,
            coupleName: this.testData.wedding.coupleName
          }
        }
      }
    ]

    for (const test of smsTests) {
      try {
        console.log(`📱 Testing: ${test.name}`)

        const message = this.emailService.processMessageData(test.data)
        this.emailService.applyTemplate(message, test.data.template)

        const smsContent = await this.emailService.prepareSMSContent(message)

        console.log(`  ✅ SMS Text (${smsContent.text.length} chars): ${smsContent.text}\n`)
      } catch (error) {
        console.error(`  ❌ Error testing ${test.name}:`, error.message)
      }
    }
  }

  /**
   * Lister tous les templates disponibles
   */
  async listAvailableTemplates () {
    console.log('[TemplateTester] Available templates:\n')

    const templatesDir = path.join(__dirname, 'templates')
    const languages = await fs.readdir(templatesDir)

    for (const lang of languages) {
      const langDir = path.join(templatesDir, lang)
      const stat = await fs.stat(langDir)

      if (stat.isDirectory()) {
        const templates = await fs.readdir(langDir)
        console.log(`📂 ${lang.toUpperCase()}:`)

        templates.forEach(template => {
          if (template.endsWith('.hbs')) {
            console.log(`  - ${template.replace('.hbs', '')}`)
          }
        })
        console.log()
      }
    }
  }

  /**
   * Valider la syntaxe des templates
   */
  async validateTemplates () {
    console.log('[TemplateTester] Validating template syntax...\n')

    const templatesDir = path.join(__dirname, 'templates')
    const languages = await fs.readdir(templatesDir)
    let totalTemplates = 0
    let validTemplates = 0

    for (const lang of languages) {
      const langDir = path.join(templatesDir, lang)
      const stat = await fs.stat(langDir)

      if (stat.isDirectory()) {
        const templates = await fs.readdir(langDir)

        for (const template of templates) {
          if (template.endsWith('.hbs')) {
            totalTemplates++
            const templatePath = path.join(langDir, template)

            try {
              const content = await fs.readFile(templatePath, 'utf8')

              // Vérifications basiques
              const checks = [
                { name: 'HTML structure', test: content.includes('<!DOCTYPE html>') && content.includes('</html>') },
                { name: 'Subject line', test: content.includes('<!-- SUBJECT:') },
                { name: 'Tracking pixel', test: content.includes('{{trackingPixel}}') },
                { name: 'Valid charset', test: content.includes('charset="utf-8"') }
              ]

              const passed = checks.filter(check => check.test).length
              const status = passed === checks.length ? '✅' : '⚠️'

              console.log(`${status} ${lang}/${template}: ${passed}/${checks.length} checks passed`)

              if (passed === checks.length) {
                validTemplates++
              } else {
                const failed = checks.filter(check => !check.test)
                console.log(`    Failed: ${failed.map(c => c.name).join(', ')}`)
              }
            } catch (error) {
              console.log(`❌ ${lang}/${template}: Error reading file - ${error.message}`)
            }
          }
        }
      }
    }

    console.log(`\n📊 Validation Summary: ${validTemplates}/${totalTemplates} templates are fully valid\n`)
  }
}

// Fonction utilitaire pour exécuter les tests
async function runTests () {
  const tester = new TemplateTester()

  await tester.listAvailableTemplates()
  await tester.validateTemplates()
  await tester.testAllTemplates()
  await tester.testSMSTemplates()
}

// Exporter pour utilisation dans d'autres modules
module.exports = { TemplateTester, runTests }

// Exécuter si appelé directement
if (require.main === module) {
  runTests().catch(console.error)
}
