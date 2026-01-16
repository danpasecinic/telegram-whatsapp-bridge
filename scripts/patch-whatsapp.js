const fs = require('fs');
const path = require('path');

const utilsPath = path.join(
    __dirname,
    '../node_modules/whatsapp-web.js/src/util/Injected/Utils.js'
);

if (!fs.existsSync(utilsPath)) {
    console.log('[patch] whatsapp-web.js not installed yet, skipping patch');
    process.exit(0);
}

let content = fs.readFileSync(utilsPath, 'utf8');
let patchCount = 0;

const patches = [
    {
        name: 'MediaDataUtils optional chaining',
        old: `const shouldUseMediaCache = window.Store.MediaDataUtils.shouldUseMediaCache(
            window.Store.MediaTypes.castToV4(mediaObject.type)
        );`,
        new: `const shouldUseMediaCache = window.Store.MediaDataUtils?.shouldUseMediaCache?.(
            window.Store.MediaTypes.castToV4(mediaObject.type)
        ) ?? false;`
    },
    {
        name: 'OpaqueData mimetype fix for channels',
        old: 'await window.Store.OpaqueData.createFromData(file, file.type)',
        new: 'await window.Store.OpaqueData.createFromData(file, mediaInfo.mimetype)'
    },
    {
        name: 'calculateToken function reference fix',
        old: 'calculateToken: window.Store.SendChannelMessage.getRandomFilehash()',
        new: 'calculateToken: window.Store.SendChannelMessage.getRandomFilehash'
    }
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
    console.log('[patch] No patches needed');
}
