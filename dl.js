const { parse } = require('url');
const https = require('https');
const fs = require('fs');
const { basename } = require('path');

const TIMEOUT = 10000; // 10 seconds

const BASE_IPA_NAME = process.argv.includes("--icreate") ? "icreate.ipa" : "base.ipa";

/**
 * Downloads a file from a given URL and saves it to the given path.
 * @param {string} url - The URL to download from.
 * @param {string} path - The destination path for the downloaded file.
 * @returns {Promise<void>}
 */
module.exports = function downloadFile(url, path) {
  const uri = parse(url);
  if (!path) {
    path = basename(uri.path);
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);

    const request = https.get(uri.href, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed. HTTP Status: ${res.statusCode}`));
        return;
      }

      const len = parseInt(res.headers['content-length'], 10);
      let downloaded = 0;
      let percent = 0;

      res.on('data', (chunk) => {
        file.write(chunk);
        downloaded += chunk.length;
        percent = ((100.0 * downloaded) / len).toFixed(2);
        process.stdout.write(`Downloading ${BASE_IPA_NAME} - ${percent}%\r`);
      });

      res.on('end', () => {
        file.end();
        console.log(`\n✅ ${BASE_IPA_NAME} downloaded successfully!`);
        resolve();
      });

      res.on('error', (err) => {
        file.close();
        reject(err);
      });
    });

    request.on('timeout', () => {
      request.abort();
      reject(new Error(`❌ Request timed out after ${TIMEOUT / 1000}s`));
    });

    request.on('error', (err) => {
      file.close();
      reject(err);
    });

    request.setTimeout(TIMEOUT);
  });
};
