#!/bin/bash

# Script d'installation des mises à jour hebdomadaires automatiques
# Lundi 3h00 AM

echo "🔧 Configuration des mises à jour automatiques hebdomadaires"

# Détecter l'OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - utiliser launchd
    echo "📱 Système détecté: macOS"
    
    # Créer le plist pour launchd
    cat > ~/Library/LaunchAgents/com.attitudes.weekly-update.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.attitudes.weekly-update</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$(pwd)/scripts/weekly-update-scheduler.js</string>
        <string>run-now</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/weekly-updates/stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/weekly-updates/stderr.log</string>
    
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

    # Charger le service
    launchctl load ~/Library/LaunchAgents/com.attitudes.weekly-update.plist
    
    echo "✅ Service launchd configuré"
    echo "📅 Les mises à jour s'exécuteront tous les lundis à 3h00"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - utiliser systemd ou cron
    echo "🐧 Système détecté: Linux"
    
    # Option 1: Systemd timer
    if command -v systemctl &> /dev/null; then
        # Créer le service systemd
        sudo tee /etc/systemd/system/attitudes-weekly-update.service << EOF
[Unit]
Description=Attitudes Weekly Update Service
After=network.target

[Service]
Type=oneshot
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node $(pwd)/scripts/weekly-update-scheduler.js run-now
User=$USER
StandardOutput=append:$(pwd)/logs/weekly-updates/stdout.log
StandardError=append:$(pwd)/logs/weekly-updates/stderr.log
EOF

        # Créer le timer
        sudo tee /etc/systemd/system/attitudes-weekly-update.timer << EOF
[Unit]
Description=Run Attitudes Weekly Update every Monday at 3AM
Requires=attitudes-weekly-update.service

[Timer]
OnCalendar=Mon *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

        # Activer et démarrer le timer
        sudo systemctl daemon-reload
        sudo systemctl enable attitudes-weekly-update.timer
        sudo systemctl start attitudes-weekly-update.timer
        
        echo "✅ Systemd timer configuré"
        
    else
        # Option 2: Crontab
        echo "📋 Configuration via crontab"
        
        # Ajouter au crontab
        (crontab -l 2>/dev/null; echo "0 3 * * 1 cd $(pwd) && /usr/bin/node scripts/weekly-update-scheduler.js run-now >> logs/weekly-updates/cron.log 2>&1") | crontab -
        
        echo "✅ Crontab configuré"
    fi
    
    echo "📅 Les mises à jour s'exécuteront tous les lundis à 3h00"
fi

# Créer le répertoire de logs
mkdir -p logs/weekly-updates

# Créer un script de test
cat > test-weekly-update.sh << 'EOF'
#!/bin/bash
echo "🧪 Test de la mise à jour hebdomadaire..."
node scripts/weekly-update-scheduler.js run-now
EOF
chmod +x test-weekly-update.sh

echo ""
echo "✅ Installation terminée!"
echo ""
echo "📋 Commandes utiles:"
echo "  ./test-weekly-update.sh     - Tester la mise à jour maintenant"
echo "  node scripts/weekly-update-scheduler.js status - Voir la prochaine exécution"
echo ""

# Vérifier le statut
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📊 Statut du service:"
    launchctl list | grep attitudes
elif [[ "$OSTYPE" == "linux-gnu"* ]] && command -v systemctl &> /dev/null; then
    echo "📊 Statut du timer:"
    systemctl status attitudes-weekly-update.timer
else
    echo "📊 Crontab actuel:"
    crontab -l | grep attitudes
fi