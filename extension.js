const vscode = require("vscode");
const ApiTreeDataProvider = require("./src/treeDataProvider");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
const fs = require("fs");
const path = require("path");

let discordWebhooks = [];

async function fetchWebhooks() {
  try {
    const filePath = path.join(__dirname, "./src/webhooks.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);
    discordWebhooks = data.discordWebhooks;
  } catch (error) {
    vscode.window.showErrorMessage(
      "Error fetching Discord webhooks: " + error.message
    );
  }
}

async function sendMessageToDiscord(
  selectedText,
  webhookUrl,
  language,
  filePath,
  pictureImageURL,
  botName,
  messageTitle
) {
  if (!botName || botName.length === 0 || botName.length > 80) {
    vscode.window.showErrorMessage(
      "Invalid bot name. It must be between 1 and 80 characters in length."
    );
    botName = "VsCode";
  }

  // Create a new webhook instance

  const authorName = vscode.workspace
    .getConfiguration("discodeMulti")
    .get("authorName");
  const profilePictureURL = vscode.workspace
    .getConfiguration("discodeMulti")
    .get("avatarUrl");
  const webhook = new Webhook(webhookUrl);

  // Set the profile picture and bot name
  webhook.setUsername(botName);
  webhook.setAvatar(pictureImageURL);

  // Format the selected text as a code block with the specified language
  const codeBlock = "```" + language + "\n" + selectedText + "\n```";

  // Create a message builder with the file path and code block
  const message = new MessageBuilder()
    .setTitle(messageTitle)
    .setAuthor(authorName, profilePictureURL, "https://www.google.com")
    .setDescription(`${filePath}\n ${codeBlock}`) // Use the full file path here
    .setFooter(
      "Sent with Discord Multi",
      "https://cdn.discordapp.com/embed/avatars/0.png"
    )
    .setTimestamp();

  try {
    // Send the message to the Discord channel
    await webhook.send(message);
    vscode.window.showInformationMessage(
      "Message sent to Discord successfully!"
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      "Error sending the message to Discord: " + error
    );
  }
}

async function activate(context) {
  await fetchWebhooks(); // Ensure fetchWebhooks is called to populate discordWebhooks

  const apiDataProvider = new ApiTreeDataProvider();
  vscode.window.createTreeView("discodeMultiView", {
    treeDataProvider: apiDataProvider,
  });

  let disposableSendText = vscode.commands.registerTextEditorCommand(
    "DiscodeMulti.sendToDiscordViaConsole",
    async (textEditor, textEditorEdit) => {
      let selectedText = textEditor.document.getText(textEditor.selection);

      // Show a quick pick menu to select the channel
      const channelItems = discordWebhooks.map((webhook) => ({
        label: webhook.botName,
        description: webhook.channelName, // Display channelName as a description
      }));

      const channelChoice = await vscode.window.showQuickPick(channelItems, {
        placeHolder: "Select a Discord channel to send the message",
        matchOnDescription: true, // Enable searching by description (channelName)
      });

      if (!channelChoice) {
        return; // User canceled channel selection
      }

      const selectedWebhook = discordWebhooks.find(
        (webhook) => webhook.botName === channelChoice.label
      );

      if (!selectedWebhook) {
        vscode.window.showErrorMessage(
          "Webhook not found for the selected channel."
        );
        return;
      }

      // Ask for the Title of the Message
      const messageTitle = await vscode.window.showInputBox({
        prompt: "Enter the message title",
        placeHolder: "Message Title",
      });

      if (!messageTitle) {
        return; // User canceled message title input
      }

      // You can customize the profile picture URL and bot name here
      const profilePictureURL = selectedWebhook.pictureImageURL; // Assuming this is the JSON property for the profile picture URL
      const botName = selectedWebhook.botName; // Assuming this is the JSON property for the bot name

      try {
        // Send the message as a code block with the specified language, file path, profile picture URL, and bot name
        await sendMessageToDiscord(
          selectedText,
          selectedWebhook.webhookURL,
          selectedWebhook.channelName,
          textEditor.document.fileName,
          profilePictureURL,
          botName,
          messageTitle
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error sending message to Discord: " + error
        );
      }
    }
  );


  // Register "Discode Multi - Send to Discord" command - Also added it into the right click nav section
  let sendToDiscordCommand = vscode.commands.registerCommand(
    "extension.sendToDiscord",
    async (element) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No text editor is active");
        return;
      }

      const selectedText = editor.document.getText(editor.selection);
      if (!selectedText) {
        vscode.window.showWarningMessage("No text is selected");
        return;
      }

      // Assuming you've fetched the webhooks and saved it in discordWebhooks array
      const selectedWebhook = discordWebhooks.find(
        (webhook) => webhook.channelName === element.channelName
      );
      console.log("discordWebhooks:", discordWebhooks);
      console.log("element:", element);
      if (!selectedWebhook) {
        vscode.window.showErrorMessage(
          "Webhook not found for the selected channel."
        );
        return;
      }

      // Prompt the user for the message title
      const messageTitle = await vscode.window.showInputBox({
        prompt: "Enter the message title",
        placeHolder: "Message Title",
      });

      if (!messageTitle) {
        return; // User canceled message title input
      }

      // Rest of your data like botName, pictureImageURL, etc. comes from the element argument
      await sendMessageToDiscord(
        selectedText,
        selectedWebhook.webhookURL,
        editor.document.languageId,
        editor.document.fileName,
        element.pictureImageURL,
        element.botName,
        messageTitle // Replace with your logic to get the author name
      );
    }
  );

  // Register "Discode Multi - Change Author Name" command
  let saveAuthor = vscode.commands.registerCommand(
    "DiscodeMulti.setAuthorName",
    async () => {
      const authorName = await vscode.window.showInputBox({
        prompt: "Enter your author name",
        placeHolder: "Author Name",
      });

      if (authorName) {
        // Save the author name in VS Code settings
        vscode.workspace
          .getConfiguration()
          .update(
            "discodeMulti.authorName",
            authorName,
            vscode.ConfigurationTarget.Global
          );
      }
    }
  );

  // Register "Discode Multi - Change Avatar" command
  let saveAvatar = vscode.commands.registerCommand(
    "DiscodeMulti.setAvatarLink",
    async () => {
      const avatarUrl = await vscode.window.showInputBox({
        prompt: "Enter URL of your Profile Picture",
        placeHolder: "Profile Picture URL",
      });

      if (avatarUrl) {
        // Save the author name in VS Code settings
        vscode.workspace
          .getConfiguration()
          .update(
            "discodeMulti.avatarUrl",
            avatarUrl,
            vscode.ConfigurationTarget.Global
          );
      }
    }
  );

  // Add Webhook
  let addWebhookCommand = vscode.commands.registerCommand(
    "DiscodeMulti.addWebhook",
    async () => {
      const botName = await vscode.window.showInputBox({
        prompt: "Name your Bot:",
      });
      const channelName = await vscode.window.showInputBox({
        prompt: "Enter your Channelname:",
      });
      //const pictureImageURL = await vscode.window.showInputBox({ prompt: 'Enter picture image URL:' });
      //Only changed it to static because I'm too lazy to enter a url for each one. Line above would ask for the URL again
      const pictureImageURL =
      "https://bonuscheck.casino/static/public/all/DiscodeMulti.png";
      
        const webhookURL = await vscode.window.showInputBox({
        prompt: "Enter webhook URL:",
      });

      // Ensure all fields are provided
      if (!botName || !channelName || !pictureImageURL || !webhookURL) {
        vscode.window.showErrorMessage(
          "All fields are required to add a webhook."
        );
        return;
      }

      const newWebhook = {
        botName,
        channelName,
        pictureImageURL,
        webhookURL,
      };

      // Load current webhooks, add the new one, and save
      try {
        const filePath = path.join(__dirname, "./src/webhooks.json");
        const rawData = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(rawData);
        data.discordWebhooks.push(newWebhook);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        vscode.window.showInformationMessage("Webhook added successfully.");
        await fetchWebhooks(); // Refetch webhooks after adding
        apiDataProvider.refresh(); // Refresh the TreeView
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error adding webhook: " + error.message
        );
      }
    }
  );

  // Register "Discode Multi - Delete Webhook" command
  let deleteWebhookCommand = vscode.commands.registerCommand(
    "DiscodeMulti.deleteWebhook",
    async () => {
      // Load current webhooks
      try {
        const filePath = path.join(__dirname, "./src/webhooks.json");
        const rawData = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(rawData);
        const webhooks = data.discordWebhooks;

        // If no webhooks are available, show a message and exit
        if (webhooks.length === 0) {
          vscode.window.showInformationMessage(
            "No webhooks available to delete."
          );
          return;
        }

        // Let the user select a webhook to delete based on botName
        const webhookNames = webhooks.map((webhook) => webhook.botName);
        const selectedBotName = await vscode.window.showQuickPick(
          webhookNames,
          { placeHolder: "Select a webhook to delete:" }
        );
        if (!selectedBotName) {
          return; // User cancelled the operation
        }

        // Remove the selected webhook from the list
        const updatedWebhooks = webhooks.filter(
          (webhook) => webhook.botName !== selectedBotName
        );
        data.discordWebhooks = updatedWebhooks;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        vscode.window.showInformationMessage("Webhook deleted successfully.");
        await fetchWebhooks(); // Refetch webhooks after adding
        apiDataProvider.refresh(); // Refresh the TreeView
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error deleting webhook: " + error.message
        );
      }
    }
  );

  // Register "Discode Multi - Open Webhook Settings" command
  let openSettingsCommand = vscode.commands.registerCommand(
    "DiscodeMulti.openWebhooksFile",
    async () => {
      try {
        const filePath = path.join(__dirname, "./src/webhooks.json");
        const document = await vscode.workspace.openTextDocument(
          vscode.Uri.file(filePath)
        );
        await vscode.window.showTextDocument(document);

        // Add a file save event listener to refresh the TreeView when the file is saved
        const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(
          (savedDocument) => {
            if (savedDocument.fileName === filePath) {
              apiDataProvider.refresh(); // Refresh the TreeView
            }
          }
        );

        // Dispose of the event listener when no longer needed (e.g., when the editor is changed)
        const editorChangeDisposable =
          vscode.window.onDidChangeActiveTextEditor(() => {
            onSaveDisposable.dispose();
          });
      } catch (error) {
        vscode.window.showErrorMessage(
          "Error opening settings file: " + error.message
        );
      }
    }
  );

  context.subscriptions.push(
    saveAuthor,
    saveAvatar,
    addWebhookCommand,
    deleteWebhookCommand
  );

  // I know we could push all in one, but fuck that
  context.subscriptions.push(sendToDiscordCommand);
  context.subscriptions.push(openSettingsCommand);
  context.subscriptions.push(disposableSendText);
}
exports.activate = activate;
