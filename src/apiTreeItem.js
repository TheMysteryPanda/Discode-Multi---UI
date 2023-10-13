const vscode = require('vscode');

class ApiTreeItem extends vscode.TreeItem {
    constructor(label, webhookURL, iconPath) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.webhookURL = webhookURL;
        this.iconPath = iconPath;
        this.command = {
            command: 'extension.sendToWebhook',
            title: 'Send To Webhook',
            arguments: [this]
        };
    }
}

module.exports = ApiTreeItem;
