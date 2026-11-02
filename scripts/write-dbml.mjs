// Piše schema.dbml iz izgrađenog paketa (npm run dbml = build + ovo).
import { writeFileSync } from "node:fs";
import { toDbml } from "../dist/dbml.js";

writeFileSync(new URL("../schema.dbml", import.meta.url), toDbml());
console.log("schema.dbml zapisan");
