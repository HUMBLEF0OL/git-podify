#!/usr/bin/env node

const { program } = require("commander");
const { addHooks, removeHooks } = require("../lib/hooks");
const { restoreConfig } = require("../lib/restoreHooks");
const { removeTool, initializeConfig } = require("../lib/setupTools");
const { prompt } = require("enquirer");

program
    .name("gitpodify")
    .description("CLI utility to set up Git hooks and configurations")
    .version("1.0.0");

// hooks command

program
    .command("init")
    .description(
        "Initialize GitPodify with the selected hooks tool (Git, Husky, or Lefthook) and configure hooks path for the project",
    )
    .action(async () => {
        await initializeConfig();

        const response = await prompt({
            type: "confirm",
            name: "addHooks",
            message: "Would you like to add hooks now?",
            initial: true,
        });

        if (response.addHooks) {
            console.log("\n🔧 Adding hooks...");
            try {
                await addHooks(); // Call the hooks addition logic
                console.log("✅ Hooks added successfully!\n");
            } catch (err) {
                console.log("ERROR: ", err.message);
            }
        } else {
            console.log(
                "\n⚡ You can add hooks later using: gitpodify add hooks\n",
            );
        }

        console.log("🎉 GitPodify initialization complete!");
    });

program
    .command("add hooks")
    .description("Add Git hooks with predefined templates")
    .action(() => {
        addHooks();
    });

program
    .command("remove hooks")
    .description("Select and remove specific Git hooks managed by the current configuration.")
    .action(() => {
        removeHooks();
    });

program
    .command("restore")
    .description("Restore configuration to default")
    .action(async () => {
        await restoreConfig();
    });

program
    .command("uninstall")
    .description("Uninstalls Git hook tools and removes all related configurations and files.")
    .action(async () => {
        await removeTool();
    });



program.parse(process.argv);

// "setup:git-hooks": "git config core.hooksPath .git-hooks",
// git config --get core.hooksPath
// "postinstall": "yarn run setup:git-hooks",


// what if the user has installed more than one config
// how will different config interact with each other if user decide to
// use different tools for different hooks

// double check how lefthook actually works

// version management

// remove one hook only

// check init logic
