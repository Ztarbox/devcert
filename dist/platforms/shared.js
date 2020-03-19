"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const url = require("url");
const createDebug = require("debug");
const assert = require("assert");
const getPort = require("get-port");
const http = require("http");
const fs_1 = require("fs");
const glob_1 = require("glob");
const fs_2 = require("fs");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const user_interface_1 = require("../user-interface");
const child_process_1 = require("child_process");
const os_1 = require("os");
const debug = createDebug('devcert:platforms:shared');
exports.HOME = (_a = process.env.HOME) !== null && _a !== void 0 ? _a : os_1.homedir();
/**
 *  Given a directory or glob pattern of directories, run a callback for each db
 *  directory, with a version argument.
 */
function doForNSSCertDB(nssDirGlob, callback) {
    glob_1.sync(nssDirGlob).forEach(potentialNSSDBDir => {
        debug(`checking to see if ${potentialNSSDBDir} is a valid NSS database directory`);
        if (fs_2.existsSync(path.join(potentialNSSDBDir, 'cert8.db'))) {
            debug(`Found legacy NSS database in ${potentialNSSDBDir}, running callback...`);
            callback(potentialNSSDBDir, 'legacy');
        }
        if (fs_2.existsSync(path.join(potentialNSSDBDir, 'cert9.db'))) {
            debug(`Found modern NSS database in ${potentialNSSDBDir}, running callback...`);
            callback(potentialNSSDBDir, 'modern');
        }
    });
}
/**
 *  Given a directory or glob pattern of directories, attempt to install the
 *  CA certificate to each directory containing an NSS database.
 */
function addCertificateToNSSCertDB(nssDirGlob, certPath, certutilPath) {
    debug(`trying to install certificate into NSS databases in ${nssDirGlob}`);
    doForNSSCertDB(nssDirGlob, (dir, version) => {
        const dirArg = version === 'modern' ? `sql:${dir}` : dir;
        utils_1.run(`${certutilPath} -A -d "${dirArg}" -t 'C,,' -i "${certPath}" -n devcert`);
    });
    debug(`finished scanning & installing certificate in NSS databases in ${nssDirGlob}`);
}
exports.addCertificateToNSSCertDB = addCertificateToNSSCertDB;
function removeCertificateFromNSSCertDB(nssDirGlob, certPath, certutilPath) {
    debug(`trying to remove certificates from NSS databases in ${nssDirGlob}`);
    doForNSSCertDB(nssDirGlob, (dir, version) => {
        const dirArg = version === 'modern' ? `sql:${dir}` : dir;
        try {
            if (fs_1.existsSync(certPath)) {
                utils_1.run(`${certutilPath} -A -d "${dirArg}" -t 'C,,' -i "${certPath}" -n devcert`);
            }
        }
        catch (e) {
            debug(`failed to remove ${certPath} from ${dir}, continuing. ${e.toString()}`);
        }
    });
    debug(`finished scanning & installing certificate in NSS databases in ${nssDirGlob}`);
}
exports.removeCertificateFromNSSCertDB = removeCertificateFromNSSCertDB;
/**
 *  Check to see if Firefox is still running, and if so, ask the user to close
 *  it. Poll until it's closed, then return.
 *
 * This is needed because Firefox appears to load the NSS database in-memory on
 * startup, and overwrite on exit. So we have to ask the user to quite Firefox
 * first so our changes don't get overwritten.
 */
async function closeFirefox() {
    if (isFirefoxOpen()) {
        await user_interface_1.default.closeFirefoxBeforeContinuing();
        while (isFirefoxOpen()) {
            await sleep(50);
        }
    }
}
exports.closeFirefox = closeFirefox;
/**
 * Check if Firefox is currently open
 */
function isFirefoxOpen() {
    // NOTE: We use some Windows-unfriendly methods here (ps) because Windows
    // never needs to check this, because it doesn't update the NSS DB
    // automaticaly.
    assert(constants_1.isMac || constants_1.isLinux, 'checkForOpenFirefox was invoked on a platform other than Mac or Linux');
    return child_process_1.execSync('ps aux').indexOf('firefox') > -1;
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Firefox manages it's own trust store for SSL certificates, which can be
 * managed via the certutil command (supplied by NSS tooling packages). In the
 * event that certutil is not already installed, and either can't be installed
 * (Windows) or the user doesn't want to install it (skipCertutilInstall:
 * true), it means that we can't programmatically tell Firefox to trust our
 * root CA certificate.
 *
 * There is a recourse though. When a Firefox tab is directed to a URL that
 * responds with a certificate, it will automatically prompt the user if they
 * want to add it to their trusted certificates. So if we can't automatically
 * install the certificate via certutil, we instead start a quick web server
 * and host our certificate file. Then we open the hosted cert URL in Firefox
 * to kick off the GUI flow.
 *
 * This method does all this, along with providing user prompts in the terminal
 * to walk them through this process.
 */
async function openCertificateInFirefox(firefoxPath, certPath) {
    debug('Adding devert to Firefox trust stores manually. Launching a webserver to host our certificate temporarily ...');
    const port = await getPort();
    const server = http
        .createServer((req, res) => {
        const { url: reqUrl } = req;
        if (!reqUrl)
            throw new Error(`Request url was found to be empty: "${JSON.stringify(reqUrl)}"`);
        const { pathname } = url.parse(reqUrl);
        if (pathname === '/certificate') {
            res.writeHead(200, { 'Content-type': 'application/x-x509-ca-cert' });
            res.write(fs_2.readFileSync(certPath));
            res.end();
        }
        else {
            res.writeHead(200);
            Promise.resolve(user_interface_1.default.firefoxWizardPromptPage(`http://localhost:${port}/certificate`)).then(userResponse => {
                res.write(userResponse);
                res.end();
            });
        }
    })
        .listen(port);
    debug('Certificate server is up. Printing instructions for user and launching Firefox with hosted certificate URL');
    await user_interface_1.default.startFirefoxWizard(`http://localhost:${port}`);
    utils_1.run(`${firefoxPath} http://localhost:${port}`);
    await user_interface_1.default.waitForFirefoxWizard();
    server.close();
}
exports.openCertificateInFirefox = openCertificateInFirefox;
function assertNotTouchingFiles(filepath, operation) {
    if (!filepath.startsWith(constants_1.configDir) &&
        !filepath.startsWith(constants_1.getLegacyConfigDir())) {
        throw new Error(`Devcert cannot ${operation} ${filepath}; it is outside known devcert config directories!`);
    }
}
exports.assertNotTouchingFiles = assertNotTouchingFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwbGF0Zm9ybXMvc2hhcmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFDM0IscUNBQXFDO0FBQ3JDLGlDQUFpQztBQUNqQyxvQ0FBb0M7QUFDcEMsNkJBQTZCO0FBQzdCLDJCQUFnQztBQUNoQywrQkFBb0M7QUFDcEMsMkJBQW9FO0FBQ3BFLG9DQUErQjtBQUMvQiw0Q0FBNkU7QUFDN0Usc0RBQW1DO0FBQ25DLGlEQUFpRDtBQUNqRCwyQkFBNkI7QUFFN0IsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFekMsUUFBQSxJQUFJLFNBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLG1DQUFJLFlBQU8sRUFBRSxDQUFDO0FBRWxEOzs7R0FHRztBQUNILFNBQVMsY0FBYyxDQUNyQixVQUFrQixFQUNsQixRQUE2RDtJQUU3RCxXQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUU7UUFDM0MsS0FBSyxDQUNILHNCQUFzQixpQkFBaUIsb0NBQW9DLENBQzVFLENBQUM7UUFDRixJQUFJLGVBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsS0FBSyxDQUNILGdDQUFnQyxpQkFBaUIsdUJBQXVCLENBQ3pFLENBQUM7WUFDRixRQUFRLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDdkM7UUFDRCxJQUFJLGVBQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsS0FBSyxDQUNILGdDQUFnQyxpQkFBaUIsdUJBQXVCLENBQ3pFLENBQUM7WUFDRixRQUFRLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDdkM7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c0JBQXNCLENBQ3BDLFFBQWdCLEVBQ2hCLFNBQWlCO0lBRWpCLElBQ0UsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLHFCQUFTLENBQUM7UUFDL0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLDhCQUFrQixFQUFFLENBQUMsRUFDMUM7UUFDQSxNQUFNLElBQUksS0FBSyxDQUNiLGtCQUFrQixTQUFTLElBQUksUUFBUSxtREFBbUQsQ0FDM0YsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQVpELHdEQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XHJcbmltcG9ydCAqIGFzIGNyZWF0ZURlYnVnIGZyb20gJ2RlYnVnJztcclxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XHJcbmltcG9ydCAqIGFzIGdldFBvcnQgZnJvbSAnZ2V0LXBvcnQnO1xyXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBzeW5jIGFzIGdsb2IgfSBmcm9tICdnbG9iJztcclxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIGFzIHJlYWRGaWxlLCBleGlzdHNTeW5jIGFzIGV4aXN0cyB9IGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgcnVuIH0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQgeyBpc01hYywgaXNMaW51eCwgY29uZmlnRGlyLCBnZXRMZWdhY3lDb25maWdEaXIgfSBmcm9tICcuLi9jb25zdGFudHMnO1xyXG5pbXBvcnQgVUkgZnJvbSAnLi4vdXNlci1pbnRlcmZhY2UnO1xyXG5pbXBvcnQgeyBleGVjU3luYyBhcyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdvcyc7XHJcblxyXG5jb25zdCBkZWJ1ZyA9IGNyZWF0ZURlYnVnKCdkZXZjZXJ0OnBsYXRmb3JtczpzaGFyZWQnKTtcclxuXHJcbmV4cG9ydCBjb25zdCBIT01FID0gcHJvY2Vzcy5lbnYuSE9NRSA/PyBob21lZGlyKCk7XHJcblxyXG4vKipcclxuICogIEdpdmVuIGEgZGlyZWN0b3J5IG9yIGdsb2IgcGF0dGVybiBvZiBkaXJlY3RvcmllcywgcnVuIGEgY2FsbGJhY2sgZm9yIGVhY2ggZGJcclxuICogIGRpcmVjdG9yeSwgd2l0aCBhIHZlcnNpb24gYXJndW1lbnQuXHJcbiAqL1xyXG5mdW5jdGlvbiBkb0Zvck5TU0NlcnREQihcclxuICBuc3NEaXJHbG9iOiBzdHJpbmcsXHJcbiAgY2FsbGJhY2s6IChkaXI6IHN0cmluZywgdmVyc2lvbjogJ2xlZ2FjeScgfCAnbW9kZXJuJykgPT4gdm9pZFxyXG4pOiB2b2lkIHtcclxuICBnbG9iKG5zc0Rpckdsb2IpLmZvckVhY2gocG90ZW50aWFsTlNTREJEaXIgPT4ge1xyXG4gICAgZGVidWcoXHJcbiAgICAgIGBjaGVja2luZyB0byBzZWUgaWYgJHtwb3RlbnRpYWxOU1NEQkRpcn0gaXMgYSB2YWxpZCBOU1MgZGF0YWJhc2UgZGlyZWN0b3J5YFxyXG4gICAgKTtcclxuICAgIGlmIChleGlzdHMocGF0aC5qb2luKHBvdGVudGlhbE5TU0RCRGlyLCAnY2VydDguZGInKSkpIHtcclxuICAgICAgZGVidWcoXHJcbiAgICAgICAgYEZvdW5kIGxlZ2FjeSBOU1MgZGF0YWJhc2UgaW4gJHtwb3RlbnRpYWxOU1NEQkRpcn0sIHJ1bm5pbmcgY2FsbGJhY2suLi5gXHJcbiAgICAgICk7XHJcbiAgICAgIGNhbGxiYWNrKHBvdGVudGlhbE5TU0RCRGlyLCAnbGVnYWN5Jyk7XHJcbiAgICB9XHJcbiAgICBpZiAoZXhpc3RzKHBhdGguam9pbihwb3RlbnRpYWxOU1NEQkRpciwgJ2NlcnQ5LmRiJykpKSB7XHJcbiAgICAgIGRlYnVnKFxyXG4gICAgICAgIGBGb3VuZCBtb2Rlcm4gTlNTIGRhdGFiYXNlIGluICR7cG90ZW50aWFsTlNTREJEaXJ9LCBydW5uaW5nIGNhbGxiYWNrLi4uYFxyXG4gICAgICApO1xyXG4gICAgICBjYWxsYmFjayhwb3RlbnRpYWxOU1NEQkRpciwgJ21vZGVybicpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogIEdpdmVuIGEgZGlyZWN0b3J5IG9yIGdsb2IgcGF0dGVybiBvZiBkaXJlY3RvcmllcywgYXR0ZW1wdCB0byBpbnN0YWxsIHRoZVxyXG4gKiAgQ0EgY2VydGlmaWNhdGUgdG8gZWFjaCBkaXJlY3RvcnkgY29udGFpbmluZyBhbiBOU1MgZGF0YWJhc2UuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWRkQ2VydGlmaWNhdGVUb05TU0NlcnREQihcclxuICBuc3NEaXJHbG9iOiBzdHJpbmcsXHJcbiAgY2VydFBhdGg6IHN0cmluZyxcclxuICBjZXJ0dXRpbFBhdGg6IHN0cmluZ1xyXG4pOiB2b2lkIHtcclxuICBkZWJ1ZyhgdHJ5aW5nIHRvIGluc3RhbGwgY2VydGlmaWNhdGUgaW50byBOU1MgZGF0YWJhc2VzIGluICR7bnNzRGlyR2xvYn1gKTtcclxuICBkb0Zvck5TU0NlcnREQihuc3NEaXJHbG9iLCAoZGlyLCB2ZXJzaW9uKSA9PiB7XHJcbiAgICBjb25zdCBkaXJBcmcgPSB2ZXJzaW9uID09PSAnbW9kZXJuJyA/IGBzcWw6JHtkaXJ9YCA6IGRpcjtcclxuICAgIHJ1bihcclxuICAgICAgYCR7Y2VydHV0aWxQYXRofSAtQSAtZCBcIiR7ZGlyQXJnfVwiIC10ICdDLCwnIC1pIFwiJHtjZXJ0UGF0aH1cIiAtbiBkZXZjZXJ0YFxyXG4gICAgKTtcclxuICB9KTtcclxuICBkZWJ1ZyhcclxuICAgIGBmaW5pc2hlZCBzY2FubmluZyAmIGluc3RhbGxpbmcgY2VydGlmaWNhdGUgaW4gTlNTIGRhdGFiYXNlcyBpbiAke25zc0Rpckdsb2J9YFxyXG4gICk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDZXJ0aWZpY2F0ZUZyb21OU1NDZXJ0REIoXHJcbiAgbnNzRGlyR2xvYjogc3RyaW5nLFxyXG4gIGNlcnRQYXRoOiBzdHJpbmcsXHJcbiAgY2VydHV0aWxQYXRoOiBzdHJpbmdcclxuKTogdm9pZCB7XHJcbiAgZGVidWcoYHRyeWluZyB0byByZW1vdmUgY2VydGlmaWNhdGVzIGZyb20gTlNTIGRhdGFiYXNlcyBpbiAke25zc0Rpckdsb2J9YCk7XHJcbiAgZG9Gb3JOU1NDZXJ0REIobnNzRGlyR2xvYiwgKGRpciwgdmVyc2lvbikgPT4ge1xyXG4gICAgY29uc3QgZGlyQXJnID0gdmVyc2lvbiA9PT0gJ21vZGVybicgPyBgc3FsOiR7ZGlyfWAgOiBkaXI7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoZXhpc3RzU3luYyhjZXJ0UGF0aCkpIHtcclxuICAgICAgICBydW4oXHJcbiAgICAgICAgICBgJHtjZXJ0dXRpbFBhdGh9IC1BIC1kIFwiJHtkaXJBcmd9XCIgLXQgJ0MsLCcgLWkgXCIke2NlcnRQYXRofVwiIC1uIGRldmNlcnRgXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBkZWJ1ZyhcclxuICAgICAgICBgZmFpbGVkIHRvIHJlbW92ZSAke2NlcnRQYXRofSBmcm9tICR7ZGlyfSwgY29udGludWluZy4gJHtlLnRvU3RyaW5nKCl9YFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIGRlYnVnKFxyXG4gICAgYGZpbmlzaGVkIHNjYW5uaW5nICYgaW5zdGFsbGluZyBjZXJ0aWZpY2F0ZSBpbiBOU1MgZGF0YWJhc2VzIGluICR7bnNzRGlyR2xvYn1gXHJcbiAgKTtcclxufVxyXG5cclxuLyoqXHJcbiAqICBDaGVjayB0byBzZWUgaWYgRmlyZWZveCBpcyBzdGlsbCBydW5uaW5nLCBhbmQgaWYgc28sIGFzayB0aGUgdXNlciB0byBjbG9zZVxyXG4gKiAgaXQuIFBvbGwgdW50aWwgaXQncyBjbG9zZWQsIHRoZW4gcmV0dXJuLlxyXG4gKlxyXG4gKiBUaGlzIGlzIG5lZWRlZCBiZWNhdXNlIEZpcmVmb3ggYXBwZWFycyB0byBsb2FkIHRoZSBOU1MgZGF0YWJhc2UgaW4tbWVtb3J5IG9uXHJcbiAqIHN0YXJ0dXAsIGFuZCBvdmVyd3JpdGUgb24gZXhpdC4gU28gd2UgaGF2ZSB0byBhc2sgdGhlIHVzZXIgdG8gcXVpdGUgRmlyZWZveFxyXG4gKiBmaXJzdCBzbyBvdXIgY2hhbmdlcyBkb24ndCBnZXQgb3ZlcndyaXR0ZW4uXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xvc2VGaXJlZm94KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGlmIChpc0ZpcmVmb3hPcGVuKCkpIHtcclxuICAgIGF3YWl0IFVJLmNsb3NlRmlyZWZveEJlZm9yZUNvbnRpbnVpbmcoKTtcclxuICAgIHdoaWxlIChpc0ZpcmVmb3hPcGVuKCkpIHtcclxuICAgICAgYXdhaXQgc2xlZXAoNTApO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIEZpcmVmb3ggaXMgY3VycmVudGx5IG9wZW5cclxuICovXHJcbmZ1bmN0aW9uIGlzRmlyZWZveE9wZW4oKTogYm9vbGVhbiB7XHJcbiAgLy8gTk9URTogV2UgdXNlIHNvbWUgV2luZG93cy11bmZyaWVuZGx5IG1ldGhvZHMgaGVyZSAocHMpIGJlY2F1c2UgV2luZG93c1xyXG4gIC8vIG5ldmVyIG5lZWRzIHRvIGNoZWNrIHRoaXMsIGJlY2F1c2UgaXQgZG9lc24ndCB1cGRhdGUgdGhlIE5TUyBEQlxyXG4gIC8vIGF1dG9tYXRpY2FseS5cclxuICBhc3NlcnQoXHJcbiAgICBpc01hYyB8fCBpc0xpbnV4LFxyXG4gICAgJ2NoZWNrRm9yT3BlbkZpcmVmb3ggd2FzIGludm9rZWQgb24gYSBwbGF0Zm9ybSBvdGhlciB0aGFuIE1hYyBvciBMaW51eCdcclxuICApO1xyXG4gIHJldHVybiBleGVjKCdwcyBhdXgnKS5pbmRleE9mKCdmaXJlZm94JykgPiAtMTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZpcmVmb3ggbWFuYWdlcyBpdCdzIG93biB0cnVzdCBzdG9yZSBmb3IgU1NMIGNlcnRpZmljYXRlcywgd2hpY2ggY2FuIGJlXHJcbiAqIG1hbmFnZWQgdmlhIHRoZSBjZXJ0dXRpbCBjb21tYW5kIChzdXBwbGllZCBieSBOU1MgdG9vbGluZyBwYWNrYWdlcykuIEluIHRoZVxyXG4gKiBldmVudCB0aGF0IGNlcnR1dGlsIGlzIG5vdCBhbHJlYWR5IGluc3RhbGxlZCwgYW5kIGVpdGhlciBjYW4ndCBiZSBpbnN0YWxsZWRcclxuICogKFdpbmRvd3MpIG9yIHRoZSB1c2VyIGRvZXNuJ3Qgd2FudCB0byBpbnN0YWxsIGl0IChza2lwQ2VydHV0aWxJbnN0YWxsOlxyXG4gKiB0cnVlKSwgaXQgbWVhbnMgdGhhdCB3ZSBjYW4ndCBwcm9ncmFtbWF0aWNhbGx5IHRlbGwgRmlyZWZveCB0byB0cnVzdCBvdXJcclxuICogcm9vdCBDQSBjZXJ0aWZpY2F0ZS5cclxuICpcclxuICogVGhlcmUgaXMgYSByZWNvdXJzZSB0aG91Z2guIFdoZW4gYSBGaXJlZm94IHRhYiBpcyBkaXJlY3RlZCB0byBhIFVSTCB0aGF0XHJcbiAqIHJlc3BvbmRzIHdpdGggYSBjZXJ0aWZpY2F0ZSwgaXQgd2lsbCBhdXRvbWF0aWNhbGx5IHByb21wdCB0aGUgdXNlciBpZiB0aGV5XHJcbiAqIHdhbnQgdG8gYWRkIGl0IHRvIHRoZWlyIHRydXN0ZWQgY2VydGlmaWNhdGVzLiBTbyBpZiB3ZSBjYW4ndCBhdXRvbWF0aWNhbGx5XHJcbiAqIGluc3RhbGwgdGhlIGNlcnRpZmljYXRlIHZpYSBjZXJ0dXRpbCwgd2UgaW5zdGVhZCBzdGFydCBhIHF1aWNrIHdlYiBzZXJ2ZXJcclxuICogYW5kIGhvc3Qgb3VyIGNlcnRpZmljYXRlIGZpbGUuIFRoZW4gd2Ugb3BlbiB0aGUgaG9zdGVkIGNlcnQgVVJMIGluIEZpcmVmb3hcclxuICogdG8ga2ljayBvZmYgdGhlIEdVSSBmbG93LlxyXG4gKlxyXG4gKiBUaGlzIG1ldGhvZCBkb2VzIGFsbCB0aGlzLCBhbG9uZyB3aXRoIHByb3ZpZGluZyB1c2VyIHByb21wdHMgaW4gdGhlIHRlcm1pbmFsXHJcbiAqIHRvIHdhbGsgdGhlbSB0aHJvdWdoIHRoaXMgcHJvY2Vzcy5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuQ2VydGlmaWNhdGVJbkZpcmVmb3goXHJcbiAgZmlyZWZveFBhdGg6IHN0cmluZyxcclxuICBjZXJ0UGF0aDogc3RyaW5nXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGRlYnVnKFxyXG4gICAgJ0FkZGluZyBkZXZlcnQgdG8gRmlyZWZveCB0cnVzdCBzdG9yZXMgbWFudWFsbHkuIExhdW5jaGluZyBhIHdlYnNlcnZlciB0byBob3N0IG91ciBjZXJ0aWZpY2F0ZSB0ZW1wb3JhcmlseSAuLi4nXHJcbiAgKTtcclxuICBjb25zdCBwb3J0ID0gYXdhaXQgZ2V0UG9ydCgpO1xyXG4gIGNvbnN0IHNlcnZlciA9IGh0dHBcclxuICAgIC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIGNvbnN0IHsgdXJsOiByZXFVcmwgfSA9IHJlcTtcclxuICAgICAgaWYgKCFyZXFVcmwpXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgYFJlcXVlc3QgdXJsIHdhcyBmb3VuZCB0byBiZSBlbXB0eTogXCIke0pTT04uc3RyaW5naWZ5KHJlcVVybCl9XCJgXHJcbiAgICAgICAgKTtcclxuICAgICAgY29uc3QgeyBwYXRobmFtZSB9ID0gdXJsLnBhcnNlKHJlcVVybCk7XHJcbiAgICAgIGlmIChwYXRobmFtZSA9PT0gJy9jZXJ0aWZpY2F0ZScpIHtcclxuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL3gteDUwOS1jYS1jZXJ0JyB9KTtcclxuICAgICAgICByZXMud3JpdGUocmVhZEZpbGUoY2VydFBhdGgpKTtcclxuICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgIFByb21pc2UucmVzb2x2ZShcclxuICAgICAgICAgIFVJLmZpcmVmb3hXaXphcmRQcm9tcHRQYWdlKGBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH0vY2VydGlmaWNhdGVgKVxyXG4gICAgICAgICkudGhlbih1c2VyUmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgcmVzLndyaXRlKHVzZXJSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAubGlzdGVuKHBvcnQpO1xyXG4gIGRlYnVnKFxyXG4gICAgJ0NlcnRpZmljYXRlIHNlcnZlciBpcyB1cC4gUHJpbnRpbmcgaW5zdHJ1Y3Rpb25zIGZvciB1c2VyIGFuZCBsYXVuY2hpbmcgRmlyZWZveCB3aXRoIGhvc3RlZCBjZXJ0aWZpY2F0ZSBVUkwnXHJcbiAgKTtcclxuICBhd2FpdCBVSS5zdGFydEZpcmVmb3hXaXphcmQoYGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApO1xyXG4gIHJ1bihgJHtmaXJlZm94UGF0aH0gaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCk7XHJcbiAgYXdhaXQgVUkud2FpdEZvckZpcmVmb3hXaXphcmQoKTtcclxuICBzZXJ2ZXIuY2xvc2UoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdFRvdWNoaW5nRmlsZXMoXHJcbiAgZmlsZXBhdGg6IHN0cmluZyxcclxuICBvcGVyYXRpb246IHN0cmluZ1xyXG4pOiB2b2lkIHtcclxuICBpZiAoXHJcbiAgICAhZmlsZXBhdGguc3RhcnRzV2l0aChjb25maWdEaXIpICYmXHJcbiAgICAhZmlsZXBhdGguc3RhcnRzV2l0aChnZXRMZWdhY3lDb25maWdEaXIoKSlcclxuICApIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgYERldmNlcnQgY2Fubm90ICR7b3BlcmF0aW9ufSAke2ZpbGVwYXRofTsgaXQgaXMgb3V0c2lkZSBrbm93biBkZXZjZXJ0IGNvbmZpZyBkaXJlY3RvcmllcyFgXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=