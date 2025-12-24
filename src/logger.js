const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'bridge.log');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, {recursive: true});
}

function timestamp() {
    return new Date().toISOString();
}

function formatMessage(level, message) {
    return `[${timestamp()}] [${level}] ${message}`;
}

function writeToFile(formatted) {
    fs.appendFileSync(LOG_FILE, formatted + '\n');
}

function info(message) {
    const formatted = formatMessage('INFO', message);
    console.log(formatted);
    writeToFile(formatted);
}

function error(message) {
    const formatted = formatMessage('ERROR', message);
    console.error(formatted);
    writeToFile(formatted);
}

function warn(message) {
    const formatted = formatMessage('WARN', message);
    console.warn(formatted);
    writeToFile(formatted);
}

function debug(message) {
    if (process.env.DEBUG) {
        const formatted = formatMessage('DEBUG', message);
        console.log(formatted);
        writeToFile(formatted);
    }
}

module.exports = {info, error, warn, debug};
