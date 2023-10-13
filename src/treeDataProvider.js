const vscode = require('vscode');
const path = require("path");
const fs = require("fs");


class ApiTreeDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  // Refresh Function for the TreeView (has to refresh after deleting or adding Webhooks)
  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(
        `${element.botName} - ${element.channelName}`, // Display botName and channelName
        vscode.TreeItemCollapsibleState.None
    );
    treeItem.iconPath = {
        light: vscode.Uri.parse(element.pictureImageURL),
        dark: vscode.Uri.parse(element.pictureImageURL),
    };
    treeItem.contextValue = "webhook";
    treeItem.command = {
        command: 'extension.sendToDiscord',
        title: 'Send to Discord',
        arguments: [element]
    };
    
    return treeItem;
}


  async getChildren(element) {
    if (element) {
      return Promise.resolve([]);
    } else {
      
    const webhooks = await fetchDataFromJson();
    return webhooks.map(webhook => {
      return {
        ...webhook,
        children: [{
          label: "Delete",
          command: 'DiscodeMulti.deleteWebhook',
          arguments: [webhook]
        }]
      };
    });
    
    }
  }
}

let discordWebhooks = [];


// Tried to import it in extension.js, but I receive errors which I can't find atm. Still works tho
async function fetchDataFromJson() {
	try {
	  const filePath = path.join(__dirname, "webhooks.json");
	  const rawData = fs.readFileSync(filePath, "utf8");
	  discordWebhooks = JSON.parse(rawData).discordWebhooks;
      return discordWebhooks;
	} catch (error) {
	  vscode.window.showErrorMessage(
		"Error fetching Discord webhooks: " + error.message
	  );
	}
}

module.exports = ApiTreeDataProvider;