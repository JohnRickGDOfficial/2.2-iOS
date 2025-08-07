const fs = require("fs");
const crypto = require("crypto");
const decompress = require("decompress");
require("dotenv").config();
const dl = require("./dl.js");
const zipFolder = require("./zipper");

async function main() {
    const ICREATE_MODE = process.argv.includes("--icreate");

    const BASE_IPA_NAME = ICREATE_MODE ? "icreate.ipa" : "base.ipa";
    const BASE_IPA_LINK = ICREATE_MODE
        ? "https://objectstorage.us-phoenix-1.oraclecloud.com/n/axe9yayefpvx/b/iCreateVersions/o/iCreatePro_6.7.1.ipa"
        : "https://us-east-1.tixte.net/uploads/files.141412.xyz/base.ipa";
    const BASE_BUNDLE_ID = ICREATE_MODE ? "com.camila314.icreate" : "com.robtopx.geometryjump";

    console.log("2.2 maker for iOS - https://dimisaio.be");
    if (ICREATE_MODE) console.log("iCreate Pro mode");

    // Download base.ipa if not present
    if (!fs.existsSync(BASE_IPA_NAME)) {
        console.log(`Downloading ${BASE_IPA_NAME}...`);
        await dl(BASE_IPA_LINK, BASE_IPA_NAME);
    }

    // Use .env variables only (GitHub Actions runs headless)
    const name = (process.env.name || "").replaceAll(" ", "");
    const bundle = process.env.bundle || "";
    const base = process.env.url || "";

    if (!name || !bundle || !base) {
        throw new Error("Missing environment variables: name, bundle, or url");
    }

    if (
        (ICREATE_MODE && bundle.length !== 21) ||
        (!ICREATE_MODE && bundle.length !== 23)
    ) {
        throw new Error(`Invalid bundle ID length. Expected ${ICREATE_MODE ? 21 : 23}, got ${bundle.length}`);
    }

    if (base.length !== 33) {
        throw new Error("Invalid URL length. Expected 33 characters.");
    }

    const b64 = Buffer.from(base).toString("base64");
    const url = `${base}/`;
    const dir = `${name.toLowerCase()}-${crypto.randomBytes(8).toString("hex")}`;
    const path = `${dir}/Payload/${name}.app`;

    console.log(`Decompressing ${BASE_IPA_NAME}...`);
    await decompress(BASE_IPA_NAME, dir);

    console.log(`Editing IPA in ${dir}...`);

    // Rename app folder and binary
    await fs.promises.rename(`${dir}/Payload/GeometryJump.app`, path);
    await fs.promises.rename(`${path}/GeometryJump`, `${path}/${name}`);

    // Update Info.plist
    let plist = await fs.promises.readFile(`${path}/Info.plist`, "utf8");
    plist = plist
        .replaceAll(BASE_BUNDLE_ID, bundle)
        .replaceAll("GeometryJump", name)
        .replaceAll(ICREATE_MODE ? "iCreate Pro" : "Geometry", name);
    await fs.promises.writeFile(`${path}/Info.plist`, plist, "utf8");

    // Patch binary
    let binary = await fs.promises.readFile(`${path}/${name}`, "binary");
    binary = binary
        .replaceAll(BASE_BUNDLE_ID, bundle)
        .replaceAll("https://www.boomlings.com/database", url)
        .replaceAll("aHR0cDovL3d3dy5ib29tbGluZ3MuY29tL2RhdGFiYXNl", b64);
    if (process.argv.includes("--megasa1nt")) {
        binary = binary.replaceAll(
            "https://www.newgrounds.com/audio/download/%i",
            `${url}//music/%i`
        );
    }
    await fs.promises.writeFile(`${path}/${name}`, binary, "binary");

    // Patch hook.dylib for iCreate
    if (ICREATE_MODE) {
        let dylib = await fs.promises.readFile(`${path}/hook.dylib`, "binary");
        dylib = dylib
            .replaceAll(BASE_BUNDLE_ID, bundle)
            .replaceAll("com.camila314.icreate", bundle);
        await fs.promises.writeFile(`${path}/hook.dylib`, dylib, "binary");
    }

    console.log("Compressing final IPA...");
    await zipFolder(dir, `${name}.ipa`);

    console.log("Cleaning up...");
    await fs.promises.rm(dir, { recursive: true, force: true });

    console.log("✅ Done! IPA created successfully.");
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
