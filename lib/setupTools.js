const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { prompt } = require("enquirer");
const { TOOLS } = require("./constants/tools");
const { HUSKY_DIR, GIT_HOOKS_DIR, CONFIG_FILE } = require("./constants/directoryPaths");


const setupHusky = (context = "setup") => {
    const logPrefix =
        context === "restore" ? "🔄 Restoring Husky:" : "🔧 Setting up Husky:";

    console.log(`\n${logPrefix}\n`);

    try {
        if (!fs.existsSync(path.join(process.cwd(), "node_modules", "husky"))) {
            console.log(
                `${context === "restore" ? "Reinstalling" : "Installing"} Husky...`,
            );
            execSync("npm install husky --save-dev", { stdio: "inherit" });
        }

        if (!fs.existsSync(HUSKY_DIR)) {
            console.log(
                `${context === "restore" ? "Reinitializing" : "Initializing"} Husky...`,
            );
            execSync("npx husky init", { stdio: "inherit" });
        }

        console.log(
            `\n✅ Husky ${context === "restore" ? "restored" : "setup"} complete!`,
        );
    } catch (err) {
        console.error(
            `❌ Failed to ${context === "restore" ? "restore" : "set up"} Husky:`,
            err.message,
        );
    }
};

const setupLeftHook = (context = "setup") => {
    const logPrefix =
        context === "restore"
            ? "🔄 Restoring Lefthook:"
            : "🔧 Setting up Lefthook:";

    console.log(`\n${logPrefix}\n`);

    try {
        if (
            !fs.existsSync(
                path.join(process.cwd(), "node_modules", "@evilmartians", "lefthook"),
            )
        ) {
            console.log(
                `${context === "restore" ? "Reinstalling" : "Installing"} Lefthook...`,
            );
            execSync("npm install @evilmartians/lefthook --save-dev", {
                stdio: "inherit",
            });
        }

        const lefthookConfig = `pre-commit:
                                commands:
                                    lint:
                                        run: npm run lint
                                    tests:
                                        run: npm test
                                    `;

        const configPath = path.join(process.cwd(), "lefthook.yml");

        if (context === "restore" || !fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, lefthookConfig, "utf8");
            console.log("✅ Lefthook configuration file created: lefthook.yml");
        } else {
            console.log(
                "⚠️ Lefthook configuration already exists. Skipping creation.",
            );
        }

        console.log(
            `\n✅ Lefthook ${context === "restore" ? "restored" : "setup"} complete!`,
        );
    } catch (err) {
        console.error(
            `❌ Failed to ${context === "restore" ? "restore" : "set up"} Lefthook:`,
            err.message,
        );
    }
};

const uninstallHusky = () => {
    console.log("\n🧹 Removing Husky hooks...");
    const huskyDir = HUSKY_DIR;
    if (fs.existsSync(huskyDir)) {
        fs.rmSync(huskyDir, { recursive: true, force: true });
        console.log("✅ Husky hooks removed.");
    }
    console.log("Uninstalling Husky...");
    execSync("npm uninstall husky", { stdio: "inherit" });
};

const uninstallLefthook = () => {
    console.log("\n🧹 Removing Lefthook configuration...");
    const lefthookConfig = path.join(process.cwd(), "lefthook.yml");
    if (fs.existsSync(lefthookConfig)) {
        fs.unlinkSync(lefthookConfig);
        console.log("✅ Lefthook configuration removed.");
    }
    console.log("Uninstalling Lefthook...");
    execSync("npm uninstall @evilmartians/lefthook", { stdio: "inherit" });
};

const cleanGitHooks = () => {
    const hooks = JSON.parse(fs.readFileSync(CONFIG_FILE))?.hooks;
    console.log("\n🧹 Cleaning up Git hooks...");

    hooks.forEach((hook) => {
        const hookPath = path.join(GIT_HOOKS_DIR, hook);
        if (fs.existsSync(hookPath)) {
            fs.unlinkSync(hookPath);
        }
    });
    // console.log("✅ Git hooks cleaned.");
};

const generateConfigFile = async () => {
    const { tool } = await prompt({
        type: "select",
        name: "tool",
        message: "Select the tool to manage hooks:",
        choices: TOOLS,
    });

    const hooksConfig = {
        name: tool,
        hooks: [],
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(hooksConfig, null, 2));
    console.log(`✅ Configuration file generated: ${CONFIG_FILE}`);

    return hooksConfig;
};

const setupGitHooksPath = (tool) => {
    let hooksPath;

    switch (tool) {
        case "husky":
            hooksPath = ".husky";
            break;
        case "lefthook":
            hooksPath = "node_modules/@evilmartians/lefthook";
            break;
        case "git":
        default:
            hooksPath = ".git-hooks";
            const dirPath = path.join(process.cwd(), hooksPath);
            fs.mkdirSync(dirPath);
    }

    console.log(`🔧 Setting Git hooks path to: ${hooksPath}`);
    execSync(`git config core.hooksPath ${hooksPath}`, { stdio: "inherit" });
    console.log("✅ Git hooks path configured successfully.");
};

const injectPostInstallScript = (tool) => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    let hooksPathCommand;

    switch (tool) {
        case "husky":
            hooksPathCommand = "git config core.hooksPath .husky";
            break;
        case "lefthook":
            hooksPathCommand =
                "git config core.hooksPath node_modules/@evilmartians/lefthook";
            break;
        case "git":
        default:
            hooksPathCommand = "git config core.hooksPath .git-hooks";
            break;
    }

    packageJson.scripts["setup:git-hooks"] = hooksPathCommand;

    if (!packageJson.scripts.postinstall) {
        packageJson.scripts.postinstall = "npm run setup:git-hooks";
    } else if (!packageJson.scripts.postinstall.includes("setup:git-hooks")) {
        packageJson.scripts.postinstall += " && npm run setup:git-hooks";
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ 'postinstall' script added to package.json dynamically.");
};

const initializeConfig = async () => {
    if (fs.existsSync(CONFIG_FILE)) {
        console.log("\n🔧 Configuration already exists...");
        return;
    }
    console.log("\n🔧 Setting up hooks...");

    const hooksConfig = await generateConfigFile();

    if (hooksConfig.name === "husky") {
        setupHusky();
    } else if (hooksConfig.name === "lefthook") {
        setupLeftHook();
    }
    setupGitHooksPath(hooksConfig.name);

    injectPostInstallScript(hooksConfig.name);

    console.log("\n✅ Hooks setup complete!");
};

const removeTool = () => {
    const tool = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"))?.name;

    if (tool === 'husky') {
        uninstallHusky();
    } else if (tool === 'lefthook') {
        uninstallLefthook();
    } else {
        cleanGitHooks();
        fs.rmdirSync(GIT_HOOKS_DIR)
    }


    if (fs.existsSync('hooks-config.json')) {
        fs.unlinkSync('hooks-config.json');
        // console.log('✅ Removed hooks-config.json.');
    }

    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

        delete packageJson.scripts["setup:git-hooks"];
        if (packageJson.scripts && packageJson.scripts["postinstall"]) {
            const postinstallScript = packageJson.scripts["postinstall"];
            if (postinstallScript.includes("npm run setup:git-hooks")) {
                packageJson.scripts["postinstall"] = postinstallScript.replace(/npm run setup:git-hooks\s*/g, "").trim();
                if (!packageJson.scripts["postinstall"]) {
                    delete packageJson.scripts["postinstall"];
                }
            }
        }

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    console.log('✅ All configuration and generated files have been removed.');

}

module.exports = {
    setupHusky,
    setupLeftHook,
    uninstallHusky,
    uninstallLefthook,
    cleanGitHooks,
    initializeConfig,
    removeTool
};
