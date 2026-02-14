#!/bin/bash

# Configuration du Mode 100% Autonome pour Claude
# Permet l'exécution sans intervention humaine

echo "🤖 Configuration du Mode Autonome Claude"

# Créer le fichier de configuration Claude
mkdir -p ~/.config/claude-desktop

# Configuration pour auto-accepter toutes les modifications
cat > ~/.config/claude-desktop/settings.json << 'EOF'
{
  "autoApproveFileEdits": true,
  "autoApproveCommands": true,
  "requireConfirmation": false,
  "autonomousMode": true,
  "permissions": {
    "fileSystem": {
      "read": true,
      "write": true,
      "execute": true
    },
    "commands": {
      "bash": true,
      "git": true,
      "docker": true,
      "npm": true,
      "node": true
    },
    "network": {
      "fetch": true,
      "apiCalls": true
    }
  },
  "trustedDirectories": [
    "$(pwd)",
    "$(pwd)/scripts",
    "$(pwd)/src",
    "$(pwd)/docs"
  ],
  "weeklyUpdates": {
    "autoApprove": true,
    "silentMode": true,
    "notifyOnCompletion": true
  }
}
EOF

# Créer un script de démarrage autonome
cat > start-autonomous-claude.sh << 'EOF'
#!/bin/bash

# Démarrage de Claude en mode 100% autonome
echo "🚀 Démarrage de Claude en mode autonome"

# Variables d'environnement pour mode autonome
export CLAUDE_AUTO_APPROVE=true
export CLAUDE_SILENT_MODE=true
export CLAUDE_BATCH_MODE=true

# Démarrer les services nécessaires
docker-compose up -d

# Lancer le monitor de session
node scripts/teams-session-monitor.js &

# Lancer le scheduler de mises à jour
node scripts/weekly-update-scheduler.js start &

echo "✅ Claude est maintenant en mode 100% autonome"
echo "📊 Aucune intervention humaine requise"
EOF

chmod +x start-autonomous-claude.sh

# Créer un service de démarrage automatique
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Service launchd pour démarrage automatique
    cat > ~/Library/LaunchAgents/com.attitudes.autonomous-claude.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.attitudes.autonomous-claude</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$(pwd)/start-autonomous-claude.sh</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/autonomous-claude.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/autonomous-claude-error.log</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>CLAUDE_AUTO_APPROVE</key>
        <string>true</string>
        <key>CLAUDE_SILENT_MODE</key>
        <string>true</string>
    </dict>
</dict>
</plist>
EOF

    # Charger le service
    launchctl load ~/Library/LaunchAgents/com.attitudes.autonomous-claude.plist
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - Service systemd
    sudo tee /etc/systemd/system/claude-autonomous.service << EOF
[Unit]
Description=Claude Autonomous Mode
After=network.target docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/start-autonomous-claude.sh
Restart=always
RestartSec=10
Environment="CLAUDE_AUTO_APPROVE=true"
Environment="CLAUDE_SILENT_MODE=true"

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable claude-autonomous.service
    sudo systemctl start claude-autonomous.service
fi

echo "✅ Configuration terminée!"
echo ""
echo "🤖 Mode Autonome Activé:"
echo "  • Auto-acceptation des modifications de fichiers"
echo "  • Auto-acceptation des commandes"
echo "  • Démarrage automatique au boot"
echo "  • Mises à jour sans intervention"
echo ""
echo "⚡ Claude peut maintenant travailler 24/7 sans vous!"