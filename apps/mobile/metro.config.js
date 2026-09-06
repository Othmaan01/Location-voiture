// Metro dans un monorepo pnpm : suit les packages du workspace et comprend
// la convention Node ESM (`import "./x.js"` -> fichier `x.ts`) utilisee par
// packages/contracts, packages/pricing et packages/tokens.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

const TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    const base = moduleName.slice(0, -3);
    for (const ext of TS_EXTENSIONS) {
      try {
        return context.resolveRequest(context, base + ext, platform);
      } catch {
        // essaie l'extension suivante
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
