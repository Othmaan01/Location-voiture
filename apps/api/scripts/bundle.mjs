// Compile l'API en un seul fichier JavaScript (dist/main.mjs) pour la production.
// Pourquoi : executee via tsx, l'API mettait ~11 s a demarrer apres une mise en veille Fly,
// et le proxy Fly abandonne au bout de ~8 s : la premiere requete echouait. Compilee, elle
// demarre en 1 a 2 s. Les paquets du monorepo (@lv/*, sources TypeScript) sont integres au
// fichier ; les dependances npm restent externes (installees dans l'image).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith("@lv/"));

const result = await build({
  entryPoints: [join(root, "src/main.ts")],
  outfile: join(root, "dist/main.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external,
  logLevel: "warning",
  metafile: true,
});
const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
console.log(
  `API compilee : dist/main.mjs (${Math.round(bytes / 1024)} Ko, ${external.length} dependances externes)`,
);
