const fs = require("fs");
const path = require("path");

const utilsPath = path.join(
  __dirname,
  "../node_modules/whatsapp-web.js/src/util/Injected/Utils.js",
);

if (!fs.existsSync(utilsPath)) {
  console.log("[patch] whatsapp-web.js not installed yet, skipping patch");
  process.exit(0);
}

let content = fs.readFileSync(utilsPath, "utf8");
let patchCount = 0;

const patches = [
  {
    name: "newsletter media metadata (msg.avParams removed by WA Web)",
    old: "mediaMetadata: msg.avParams(),",
    new: "mediaMetadata: typeof msg.avParams === 'function' ? msg.avParams() : window.require('WAWebMediaMetadata').mediaMetadata(msg),",
  },
  {
    name: "media cache lookup guard",
    old: `        const shouldUseMediaCache = window
            .require('WAWebMediaDataUtils')
            .shouldUseMediaCache(
                window.require('WAWebMmsMediaTypes').castToV4(mediaObject.type),
            );`,
    new: `        let shouldUseMediaCache = false;
        try {
            shouldUseMediaCache = window
                .require('WAWebMediaDataUtils')
                .shouldUseMediaCache(
                    window.require('WAWebMmsMediaTypes').castToV4(mediaObject.type),
                );
        } catch {
            shouldUseMediaCache = false;
        }`,
  },
];

for (const patch of patches) {
  if (content.includes(patch.new)) {
    console.log(`[patch] "${patch.name}" already applied`);
    continue;
  }
  if (!content.includes(patch.old)) {
    console.log(`[patch] "${patch.name}" not needed or code changed`);
    continue;
  }
  content = content.replace(patch.old, patch.new);
  console.log(`[patch] Applied: ${patch.name}`);
  patchCount++;
}

if (patchCount > 0) {
  fs.writeFileSync(utilsPath, content);
  console.log(`[patch] Successfully applied ${patchCount} patch(es)`);
} else {
  console.log("[patch] No patches needed");
}
