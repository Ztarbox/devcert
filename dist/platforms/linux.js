"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("fs");
const createDebug = require("debug");
const command_exists_1 = require("command-exists");
const shared_1 = require("./shared");
const utils_1 = require("../utils");
const user_interface_1 = require("../user-interface");
const si = require("systeminformation");
const errors_1 = require("../errors");
const debug = createDebug('devcert:platforms:linux');
var LinuxFlavor;
(function (LinuxFlavor) {
    LinuxFlavor[LinuxFlavor["Unknown"] = 0] = "Unknown";
    LinuxFlavor[LinuxFlavor["Ubuntu"] = 1] = "Ubuntu";
    LinuxFlavor[LinuxFlavor["Rhel7"] = 2] = "Rhel7";
    LinuxFlavor[LinuxFlavor["Fedora"] = 3] = "Fedora";
})(LinuxFlavor || (LinuxFlavor = {}));
async function determineLinuxFlavor(distroPromise = si.osInfo().then(info => info.distro)) {
    const distro = await distroPromise;
    switch (distro) {
        case 'Red Hat Enterprise Linux Workstation':
            return { flav: LinuxFlavor.Rhel7 };
        case 'Ubuntu':
            return { flav: LinuxFlavor.Ubuntu };
        case 'Fedora':
            return { flav: LinuxFlavor.Fedora };
        default:
            return {
                flav: LinuxFlavor.Unknown,
                message: `Unknown linux distro: ${distro}`
            };
    }
}
function linuxFlavorDetails(flavor) {
    switch (flavor) {
        case LinuxFlavor.Rhel7:
        case LinuxFlavor.Fedora:
            return {
                caFolders: [
                    '/etc/pki/ca-trust/source/anchors',
                    '/usr/share/pki/ca-trust-source'
                ],
                postCaPlacementCommands: [
                    {
                        command: 'sudo',
                        args: ['update-ca-trust']
                    }
                ],
                postCaRemovalCommands: [
                    {
                        command: 'sudo',
                        args: ['update-ca-trust']
                    }
                ]
            };
        case LinuxFlavor.Ubuntu:
            return {
                caFolders: [
                    '/etc/pki/ca-trust/source/anchors',
                    '/usr/local/share/ca-certificates'
                ],
                postCaPlacementCommands: [
                    {
                        command: 'sudo',
                        args: ['update-ca-certificates']
                    }
                ],
                postCaRemovalCommands: [
                    {
                        command: 'sudo',
                        args: ['update-ca-certificates']
                    }
                ]
            };
        default:
            throw new errors_1.UnreachableError(flavor, 'Unable to detect linux flavor');
    }
}
async function currentLinuxFlavorDetails() {
    const { flav: flavor, message } = await determineLinuxFlavor();
    if (!flavor)
        throw new Error(message); // TODO better error
    return linuxFlavorDetails(flavor);
}
class LinuxPlatform {
    constructor() {
        this.FIREFOX_NSS_DIR = path.join(shared_1.HOME, '.mozilla/firefox/*');
        this.CHROME_NSS_DIR = path.join(shared_1.HOME, '.pki/nssdb');
        this.FIREFOX_BIN_PATH = '/usr/bin/firefox';
        this.CHROME_BIN_PATH = '/usr/bin/google-chrome';
        this.HOST_FILE_PATH = '/etc/hosts';
    }
    /**
     * Linux is surprisingly difficult. There seems to be multiple system-wide
     * repositories for certs, so we copy ours to each. However, Firefox does it's
     * usual separate trust store. Plus Chrome relies on the NSS tooling (like
     * Firefox), but uses the user's NSS database, unlike Firefox (which uses a
     * separate Mozilla one). And since Chrome doesn't prompt the user with a GUI
     * flow when opening certs, if we can't use certutil to install our certificate
     * into the user's NSS database, we're out of luck.
     */
    async addToTrustStores(certificatePath, options = {}) {
        debug('Adding devcert root CA to Linux system-wide trust stores');
        // run(`sudo cp ${ certificatePath } /etc/ssl/certs/devcert.crt`);
        const linuxInfo = await currentLinuxFlavorDetails();
        const { caFolders, postCaPlacementCommands } = linuxInfo;
        caFolders.forEach(folder => {
            utils_1.run(`sudo cp "${certificatePath}" ${path.join(folder, 'devcert.crt')}`);
        });
        // run(`sudo bash -c "cat ${ certificatePath } >> /etc/ssl/certs/ca-certificates.crt"`);
        postCaPlacementCommands.forEach(({ command, args }) => {
            utils_1.run(`${command} ${args.join(' ')}`.trim());
        });
        if (this.isFirefoxInstalled()) {
            // Firefox
            debug('Firefox install detected: adding devcert root CA to Firefox-specific trust stores ...');
            if (!command_exists_1.sync('certutil')) {
                if (options.skipCertutilInstall) {
                    debug('NSS tooling is not already installed, and `skipCertutil` is true, so falling back to manual certificate install for Firefox');
                    shared_1.openCertificateInFirefox(this.FIREFOX_BIN_PATH, certificatePath);
                }
                else {
                    debug('NSS tooling is not already installed. Trying to install NSS tooling now with `apt install`');
                    utils_1.run('sudo apt install libnss3-tools');
                    debug('Installing certificate into Firefox trust stores using NSS tooling');
                    await shared_1.closeFirefox();
                    shared_1.addCertificateToNSSCertDB(this.FIREFOX_NSS_DIR, certificatePath, 'certutil');
                }
            }
        }
        else {
            debug('Firefox does not appear to be installed, skipping Firefox-specific steps...');
        }
        if (this.isChromeInstalled()) {
            debug('Chrome install detected: adding devcert root CA to Chrome trust store ...');
            if (!command_exists_1.sync('certutil')) {
                user_interface_1.default.warnChromeOnLinuxWithoutCertutil();
            }
            else {
                await shared_1.closeFirefox();
                shared_1.addCertificateToNSSCertDB(this.CHROME_NSS_DIR, certificatePath, 'certutil');
            }
        }
        else {
            debug('Chrome does not appear to be installed, skipping Chrome-specific steps...');
        }
    }
    async removeFromTrustStores(certificatePath) {
        const linuxInfo = await currentLinuxFlavorDetails();
        const { caFolders, postCaRemovalCommands } = linuxInfo;
        caFolders.forEach(folder => {
            const certPath = path.join(folder, 'devcert.crt');
            try {
                const exists = fs_1.existsSync(certPath);
                debug({ exists });
                if (!exists) {
                    debug(`cert at location ${certPath} was not found. Skipping...`);
                    return;
                }
                else {
                    utils_1.run(`sudo rm "${certificatePath}" ${certPath}`);
                    postCaRemovalCommands.forEach(({ command, args }) => {
                        utils_1.run(`${command} ${args.join(' ')}`.trim());
                    });
                }
            }
            catch (e) {
                debug(`failed to remove ${certificatePath} from ${certPath}, continuing. ${e.toString()}`);
            }
        });
        // run(`sudo bash -c "cat ${ certificatePath } >> /etc/ssl/certs/ca-certificates.crt"`);
        if (command_exists_1.sync('certutil')) {
            if (this.isFirefoxInstalled()) {
                shared_1.removeCertificateFromNSSCertDB(this.FIREFOX_NSS_DIR, certificatePath, 'certutil');
            }
            if (this.isChromeInstalled()) {
                shared_1.removeCertificateFromNSSCertDB(this.CHROME_NSS_DIR, certificatePath, 'certutil');
            }
        }
    }
    addDomainToHostFileIfMissing(domain) {
        const hostsFileContents = fs_1.readFileSync(this.HOST_FILE_PATH, 'utf8');
        if (!hostsFileContents.includes(domain)) {
            utils_1.run(`echo '127.0.0.1  ${domain}' | sudo tee -a "${this.HOST_FILE_PATH}" > /dev/null`);
        }
    }
    deleteProtectedFiles(filepath) {
        shared_1.assertNotTouchingFiles(filepath, 'delete');
        utils_1.run(`sudo rm -rf "${filepath}"`);
    }
    readProtectedFile(filepath) {
        shared_1.assertNotTouchingFiles(filepath, 'read');
        return utils_1.run(`sudo cat "${filepath}"`)
            .toString()
            .trim();
    }
    writeProtectedFile(filepath, contents) {
        shared_1.assertNotTouchingFiles(filepath, 'write');
        if (fs_1.existsSync(filepath)) {
            utils_1.run(`sudo rm "${filepath}"`);
        }
        fs_1.writeFileSync(filepath, contents);
        utils_1.run(`sudo chown 0 "${filepath}"`);
        utils_1.run(`sudo chmod 600 "${filepath}"`);
    }
    isFirefoxInstalled() {
        return fs_1.existsSync(this.FIREFOX_BIN_PATH);
    }
    isChromeInstalled() {
        return fs_1.existsSync(this.CHROME_BIN_PATH);
    }
}
exports.default = LinuxPlatform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBsYXRmb3Jtcy9saW51eC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZCQUE2QjtBQUM3QiwyQkFLWTtBQUNaLHFDQUFxQztBQUNyQyxtREFBdUQ7QUFDdkQscUNBT2tCO0FBQ2xCLG9DQUErQjtBQUUvQixzREFBbUM7QUFFbkMsd0NBQXdDO0FBQ3hDLHNDQUE2QztBQUU3QyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUVyRCxJQUFLLFdBS0o7QUFMRCxXQUFLLFdBQVc7SUFDZCxtREFBVyxDQUFBO0lBQ1gsaURBQU0sQ0FBQTtJQUNOLCtDQUFLLENBQUE7SUFDTCxpREFBTSxDQUFBO0FBQ1IsQ0FBQyxFQUxJLFdBQVcsS0FBWCxXQUFXLFFBS2Y7QUFFRCxLQUFLLFVBQVUsb0JBQW9CLENBQ2pDLGdCQUFpQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUV0RSxNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQztJQUNuQyxRQUFRLE1BQU0sRUFBRTtRQUNkLEtBQUssc0NBQXNDO1lBQ3pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JDLEtBQUssUUFBUTtZQUNYLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3RDLEtBQUssUUFBUTtZQUNYLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3RDO1lBQ0UsT0FBTztnQkFDTCxJQUFJLEVBQUUsV0FBVyxDQUFDLE9BQU87Z0JBQ3pCLE9BQU8sRUFBRSx5QkFBeUIsTUFBTSxFQUFFO2FBQzNDLENBQUM7S0FDTDtBQUNILENBQUM7QUFhRCxTQUFTLGtCQUFrQixDQUN6QixNQUFp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QU8sZUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0Y7QUF4S0QsZ0NBd0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHtcclxuICBleGlzdHNTeW5jIGFzIGV4aXN0cyxcclxuICByZWFkRmlsZVN5bmMgYXMgcmVhZCxcclxuICB3cml0ZUZpbGVTeW5jIGFzIHdyaXRlRmlsZSxcclxuICBleGlzdHNTeW5jXHJcbn0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBjcmVhdGVEZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmltcG9ydCB7IHN5bmMgYXMgY29tbWFuZEV4aXN0cyB9IGZyb20gJ2NvbW1hbmQtZXhpc3RzJztcclxuaW1wb3J0IHtcclxuICBhZGRDZXJ0aWZpY2F0ZVRvTlNTQ2VydERCLFxyXG4gIGFzc2VydE5vdFRvdWNoaW5nRmlsZXMsXHJcbiAgb3BlbkNlcnRpZmljYXRlSW5GaXJlZm94LFxyXG4gIGNsb3NlRmlyZWZveCxcclxuICByZW1vdmVDZXJ0aWZpY2F0ZUZyb21OU1NDZXJ0REIsXHJcbiAgSE9NRVxyXG59IGZyb20gJy4vc2hhcmVkJztcclxuaW1wb3J0IHsgcnVuIH0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQgeyBPcHRpb25zIH0gZnJvbSAnLi4vaW5kZXgnO1xyXG5pbXBvcnQgVUkgZnJvbSAnLi4vdXNlci1pbnRlcmZhY2UnO1xyXG5pbXBvcnQgeyBQbGF0Zm9ybSB9IGZyb20gJy4nO1xyXG5pbXBvcnQgKiBhcyBzaSBmcm9tICdzeXN0ZW1pbmZvcm1hdGlvbic7XHJcbmltcG9ydCB7IFVucmVhY2hhYmxlRXJyb3IgfSBmcm9tICcuLi9lcnJvcnMnO1xyXG5cclxuY29uc3QgZGVidWcgPSBjcmVhdGVEZWJ1ZygnZGV2Y2VydDpwbGF0Zm9ybXM6bGludXgnKTtcclxuXHJcbmVudW0gTGludXhGbGF2b3Ige1xyXG4gIFVua25vd24gPSAwLFxyXG4gIFVidW50dSxcclxuICBSaGVsNyxcclxuICBGZWRvcmFcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZGV0ZXJtaW5lTGludXhGbGF2b3IoXHJcbiAgZGlzdHJvUHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+ID0gc2kub3NJbmZvKCkudGhlbihpbmZvID0+IGluZm8uZGlzdHJvKVxyXG4pOiBQcm9taXNlPHsgZmxhdjogTGludXhGbGF2b3I7IG1lc3NhZ2U/OiBzdHJpbmcgfT4ge1xyXG4gIGNvbnN0IGRpc3RybyA9IGF3YWl0IGRpc3Ryb1Byb21pc2U7XHJcbiAgc3dpdGNoIChkaXN0cm8pIHtcclxuICAgIGNhc2UgJ1JlZCBIYXQgRW50ZXJwcmlzZSBMaW51eCBXb3Jrc3RhdGlvbic6XHJcbiAgICAgIHJldHVybiB7IGZsYXY6IExpbnV4Rmxhdm9yLlJoZWw3IH07XHJcbiAgICBjYXNlICdVYnVudHUnOlxyXG4gICAgICByZXR1cm4geyBmbGF2OiBMaW51eEZsYXZvci5VYnVudHUgfTtcclxuICAgIGNhc2UgJ0ZlZG9yYSc6XHJcbiAgICAgIHJldHVybiB7IGZsYXY6IExpbnV4Rmxhdm9yLkZlZG9yYSB9O1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmbGF2OiBMaW51eEZsYXZvci5Vbmtub3duLFxyXG4gICAgICAgIG1lc3NhZ2U6IGBVbmtub3duIGxpbnV4IGRpc3RybzogJHtkaXN0cm99YFxyXG4gICAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIENtZCB7XHJcbiAgY29tbWFuZDogc3RyaW5nO1xyXG4gIGFyZ3M6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTGludXhGbGF2b3JEZXRhaWxzIHtcclxuICBjYUZvbGRlcnM6IHN0cmluZ1tdO1xyXG4gIHBvc3RDYVBsYWNlbWVudENvbW1hbmRzOiBDbWRbXTtcclxuICBwb3N0Q2FSZW1vdmFsQ29tbWFuZHM6IENtZFtdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsaW51eEZsYXZvckRldGFpbHMoXHJcbiAgZmxhdm9yOiBFeGNsdWRlPExpbnV4Rmxhdm9yLCBMaW51eEZsYXZvci5Vbmtub3duPlxyXG4pOiBMaW51eEZsYXZvckRldGFpbHMge1xyXG4gIHN3aXRjaCAoZmxhdm9yKSB7XHJcbiAgICBjYXNlIExpbnV4Rmxhdm9yLlJoZWw3OlxyXG4gICAgY2FzZSBMaW51eEZsYXZvci5GZWRvcmE6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY2FGb2xkZXJzOiBbXHJcbiAgICAgICAgICAnL2V0Yy9wa2kvY2EtdHJ1c3Qvc291cmNlL2FuY2hvcnMnLFxyXG4gICAgICAgICAgJy91c3Ivc2hhcmUvcGtpL2NhLXRydXN0LXNvdXJjZSdcclxuICAgICAgICBdLFxyXG4gICAgICAgIHBvc3RDYVBsYWNlbWVudENvbW1hbmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbW1hbmQ6ICdzdWRvJyxcclxuICAgICAgICAgICAgYXJnczogWyd1cGRhdGUtY2EtdHJ1c3QnXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcG9zdENhUmVtb3ZhbENvbW1hbmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbW1hbmQ6ICdzdWRvJyxcclxuICAgICAgICAgICAgYXJnczogWyd1cGRhdGUtY2EtdHJ1c3QnXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfTtcclxuICAgIGNhc2UgTGludXhGbGF2b3IuVWJ1bnR1OlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGNhRm9sZGVyczogW1xyXG4gICAgICAgICAgJy9ldGMvcGtpL2NhLXRydXN0L3NvdXJjZS9hbmNob3JzJyxcclxuICAgICAgICAgICcvdXNyL2xvY2FsL3NoYXJlL2NhLWNlcnRpZmljYXRlcydcclxuICAgICAgICBdLFxyXG4gICAgICAgIHBvc3RDYVBsYWNlbWVudENvbW1hbmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbW1hbmQ6ICdzdWRvJyxcclxuICAgICAgICAgICAgYXJnczogWyd1cGRhdGUtY2EtY2VydGlmaWNhdGVzJ11cclxuICAgICAgICAgIH1cclxuICAgICAgICBdLFxyXG4gICAgICAgIHBvc3RDYVJlbW92YWxDb21tYW5kczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBjb21tYW5kOiAnc3VkbycsXHJcbiAgICAgICAgICAgIGFyZ3M6IFsndXBkYXRlLWNhLWNlcnRpZmljYXRlcyddXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9O1xyXG5cclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRocm93IG5ldyBVbnJlYWNoYWJsZUVycm9yKGZsYXZvciwgJ1VuYWJsZSB0byBkZXRlY3QgbGludXggZmxhdm9yJyk7XHJcbiAgfVxyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIGN1cnJlbnRMaW51eEZsYXZvckRldGFpbHMoKTogUHJvbWlzZTxMaW51eEZsYXZvckRldGFpbHM+IHtcclxuICBjb25zdCB7IGZsYXY6IGZsYXZvciwgbWVzc2FnZSB9ID0gYXdhaXQgZGV0ZXJtaW5lTGludXhGbGF2b3IoKTtcclxuICBpZiAoIWZsYXZvcikgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpOyAvLyBUT0RPIGJldHRlciBlcnJvclxyXG4gIHJldHVybiBsaW51eEZsYXZvckRldGFpbHMoZmxhdm9yKTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGludXhQbGF0Zm9ybSBpbXBsZW1lbnRzIFBsYXRmb3JtIHtcclxuICBwcml2YXRlIEZJUkVGT1hfTlNTX0RJUiA9IHBhdGguam9pbihIT01FLCAnLm1vemlsbGEvZmlyZWZveC8qJyk7XHJcbiAgcHJpdmF0ZSBDSFJPTUVfTlNTX0RJUiA9IHBhdGguam9pbihIT01FLCAnLnBraS9uc3NkYicpO1xyXG4gIHByaXZhdGUgRklSRUZPWF9CSU5fUEFUSCA9ICcvdXNyL2Jpbi9maXJlZm94JztcclxuICBwcml2YXRlIENIUk9NRV9CSU5fUEFUSCA9ICcvdXNyL2Jpbi9nb29nbGUtY2hyb21lJztcclxuXHJcbiAgcHJpdmF0ZSBIT1NUX0ZJTEVfUEFUSCA9ICcvZXRjL2hvc3RzJztcclxuXHJcbiAgLyoqXHJcbiAgICogTGludXggaXMgc3VycHJpc2luZ2x5IGRpZmZpY3VsdC4gVGhlcmUgc2VlbXMgdG8gYmUgbXVsdGlwbGUgc3lzdGVtLXdpZGVcclxuICAgKiByZXBvc2l0b3JpZXMgZm9yIGNlcnRzLCBzbyB3ZSBjb3B5IG91cnMgdG8gZWFjaC4gSG93ZXZlciwgRmlyZWZveCBkb2VzIGl0J3NcclxuICAgKiB1c3VhbCBzZXBhcmF0ZSB0cnVzdCBzdG9yZS4gUGx1cyBDaHJvbWUgcmVsaWVzIG9uIHRoZSBOU1MgdG9vbGluZyAobGlrZVxyXG4gICAqIEZpcmVmb3gpLCBidXQgdXNlcyB0aGUgdXNlcidzIE5TUyBkYXRhYmFzZSwgdW5saWtlIEZpcmVmb3ggKHdoaWNoIHVzZXMgYVxyXG4gICAqIHNlcGFyYXRlIE1vemlsbGEgb25lKS4gQW5kIHNpbmNlIENocm9tZSBkb2Vzbid0IHByb21wdCB0aGUgdXNlciB3aXRoIGEgR1VJXHJcbiAgICogZmxvdyB3aGVuIG9wZW5pbmcgY2VydHMsIGlmIHdlIGNhbid0IHVzZSBjZXJ0dXRpbCB0byBpbnN0YWxsIG91ciBjZXJ0aWZpY2F0ZVxyXG4gICAqIGludG8gdGhlIHVzZXIncyBOU1MgZGF0YWJhc2UsIHdlJ3JlIG91dCBvZiBsdWNrLlxyXG4gICAqL1xyXG4gIGFzeW5jIGFkZFRvVHJ1c3RTdG9yZXMoXHJcbiAgICBjZXJ0aWZpY2F0ZVBhdGg6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IE9wdGlvbnMgPSB7fVxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgZGVidWcoJ0FkZGluZyBkZXZjZXJ0IHJvb3QgQ0EgdG8gTGludXggc3lzdGVtLXdpZGUgdHJ1c3Qgc3RvcmVzJyk7XHJcbiAgICAvLyBydW4oYHN1ZG8gY3AgJHsgY2VydGlmaWNhdGVQYXRoIH0gL2V0Yy9zc2wvY2VydHMvZGV2Y2VydC5jcnRgKTtcclxuICAgIGNvbnN0IGxpbnV4SW5mbyA9IGF3YWl0IGN1cnJlbnRMaW51eEZsYXZvckRldGFpbHMoKTtcclxuICAgIGNvbnN0IHsgY2FGb2xkZXJzLCBwb3N0Q2FQbGFjZW1lbnRDb21tYW5kcyB9ID0gbGludXhJbmZvO1xyXG4gICAgY2FGb2xkZXJzLmZvckVhY2goZm9sZGVyID0+IHtcclxuICAgICAgcnVuKGBzdWRvIGNwIFwiJHtjZXJ0aWZpY2F0ZVBhdGh9XCIgJHtwYXRoLmpvaW4oZm9sZGVyLCAnZGV2Y2VydC5jcnQnKX1gKTtcclxuICAgIH0pO1xyXG4gICAgLy8gcnVuKGBzdWRvIGJhc2ggLWMgXCJjYXQgJHsgY2VydGlmaWNhdGVQYXRoIH0gPj4gL2V0Yy9zc2wvY2VydHMvY2EtY2VydGlmaWNhdGVzLmNydFwiYCk7XHJcbiAgICBwb3N0Q2FQbGFjZW1lbnRDb21tYW5kcy5mb3JFYWNoKCh7IGNvbW1hbmQsIGFyZ3MgfSkgPT4ge1xyXG4gICAgICBydW4oYCR7Y29tbWFuZH0gJHthcmdzLmpvaW4oJyAnKX1gLnRyaW0oKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAodGhpcy5pc0ZpcmVmb3hJbnN0YWxsZWQoKSkge1xyXG4gICAgICAvLyBGaXJlZm94XHJcbiAgICAgIGRlYnVnKFxyXG4gICAgICAgICdGaXJlZm94IGluc3RhbGwgZGV0ZWN0ZWQ6IGFkZGluZyBkZXZjZXJ0IHJvb3QgQ0EgdG8gRmlyZWZveC1zcGVjaWZpYyB0cnVzdCBzdG9yZXMgLi4uJ1xyXG4gICAgICApO1xyXG4gICAgICBpZiAoIWNvbW1hbmRFeGlzdHMoJ2NlcnR1dGlsJykpIHtcclxuICAgICAgICBpZiAob3B0aW9ucy5za2lwQ2VydHV0aWxJbnN0YWxsKSB7XHJcbiAgICAgICAgICBkZWJ1ZyhcclxuICAgICAgICAgICAgJ05TUyB0b29saW5nIGlzIG5vdCBhbHJlYWR5IGluc3RhbGxlZCwgYW5kIGBza2lwQ2VydHV0aWxgIGlzIHRydWUsIHNvIGZhbGxpbmcgYmFjayB0byBtYW51YWwgY2VydGlmaWNhdGUgaW5zdGFsbCBmb3IgRmlyZWZveCdcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBvcGVuQ2VydGlmaWNhdGVJbkZpcmVmb3godGhpcy5GSVJFRk9YX0JJTl9QQVRILCBjZXJ0aWZpY2F0ZVBhdGgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBkZWJ1ZyhcclxuICAgICAgICAgICAgJ05TUyB0b29saW5nIGlzIG5vdCBhbHJlYWR5IGluc3RhbGxlZC4gVHJ5aW5nIHRvIGluc3RhbGwgTlNTIHRvb2xpbmcgbm93IHdpdGggYGFwdCBpbnN0YWxsYCdcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBydW4oJ3N1ZG8gYXB0IGluc3RhbGwgbGlibnNzMy10b29scycpO1xyXG4gICAgICAgICAgZGVidWcoXHJcbiAgICAgICAgICAgICdJbnN0YWxsaW5nIGNlcnRpZmljYXRlIGludG8gRmlyZWZveCB0cnVzdCBzdG9yZXMgdXNpbmcgTlNTIHRvb2xpbmcnXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgYXdhaXQgY2xvc2VGaXJlZm94KCk7XHJcbiAgICAgICAgICBhZGRDZXJ0aWZpY2F0ZVRvTlNTQ2VydERCKFxyXG4gICAgICAgICAgICB0aGlzLkZJUkVGT1hfTlNTX0RJUixcclxuICAgICAgICAgICAgY2VydGlmaWNhdGVQYXRoLFxyXG4gICAgICAgICAgICAnY2VydHV0aWwnXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZGVidWcoXHJcbiAgICAgICAgJ0ZpcmVmb3ggZG9lcyBub3QgYXBwZWFyIHRvIGJlIGluc3RhbGxlZCwgc2tpcHBpbmcgRmlyZWZveC1zcGVjaWZpYyBzdGVwcy4uLidcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5pc0Nocm9tZUluc3RhbGxlZCgpKSB7XHJcbiAgICAgIGRlYnVnKFxyXG4gICAgICAgICdDaHJvbWUgaW5zdGFsbCBkZXRlY3RlZDogYWRkaW5nIGRldmNlcnQgcm9vdCBDQSB0byBDaHJvbWUgdHJ1c3Qgc3RvcmUgLi4uJ1xyXG4gICAgICApO1xyXG4gICAgICBpZiAoIWNvbW1hbmRFeGlzdHMoJ2NlcnR1dGlsJykpIHtcclxuICAgICAgICBVSS53YXJuQ2hyb21lT25MaW51eFdpdGhvdXRDZXJ0dXRpbCgpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGF3YWl0IGNsb3NlRmlyZWZveCgpO1xyXG4gICAgICAgIGFkZENlcnRpZmljYXRlVG9OU1NDZXJ0REIoXHJcbiAgICAgICAgICB0aGlzLkNIUk9NRV9OU1NfRElSLFxyXG4gICAgICAgICAgY2VydGlmaWNhdGVQYXRoLFxyXG4gICAgICAgICAgJ2NlcnR1dGlsJ1xyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGRlYnVnKFxyXG4gICAgICAgICdDaHJvbWUgZG9lcyBub3QgYXBwZWFyIHRvIGJlIGluc3RhbGxlZCwgc2tpcHBpbmcgQ2hyb21lLXNwZWNpZmljIHN0ZXBzLi4uJ1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVtb3ZlRnJvbVRydXN0U3RvcmVzKGNlcnRpZmljYXRlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBsaW51eEluZm8gPSBhd2FpdCBjdXJyZW50TGludXhGbGF2b3JEZXRhaWxzKCk7XHJcbiAgICBjb25zdCB7IGNhRm9sZGVycywgcG9zdENhUmVtb3ZhbENvbW1hbmRzIH0gPSBsaW51eEluZm87XHJcbiAgICBjYUZvbGRlcnMuZm9yRWFjaChmb2xkZXIgPT4ge1xyXG4gICAgICBjb25zdCBjZXJ0UGF0aCA9IHBhdGguam9pbihmb2xkZXIsICdkZXZjZXJ0LmNydCcpO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGV4aXN0cyA9IGV4aXN0c1N5bmMoY2VydFBhdGgpO1xyXG4gICAgICAgIGRlYnVnKHsgZXhpc3RzIH0pO1xyXG4gICAgICAgIGlmICghZXhpc3RzKSB7XHJcbiAgICAgICAgICBkZWJ1ZyhgY2VydCBhdCBsb2NhdGlvbiAke2NlcnRQYXRofSB3YXMgbm90IGZvdW5kLiBTa2lwcGluZy4uLmApO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBydW4oYHN1ZG8gcm0gXCIke2NlcnRpZmljYXRlUGF0aH1cIiAke2NlcnRQYXRofWApO1xyXG4gICAgICAgICAgcG9zdENhUmVtb3ZhbENvbW1hbmRzLmZvckVhY2goKHsgY29tbWFuZCwgYXJncyB9KSA9PiB7XHJcbiAgICAgICAgICAgIHJ1bihgJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfWAudHJpbSgpKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGRlYnVnKFxyXG4gICAgICAgICAgYGZhaWxlZCB0byByZW1vdmUgJHtjZXJ0aWZpY2F0ZVBhdGh9IGZyb20gJHtjZXJ0UGF0aH0sIGNvbnRpbnVpbmcuICR7ZS50b1N0cmluZygpfWBcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8vIHJ1bihgc3VkbyBiYXNoIC1jIFwiY2F0ICR7IGNlcnRpZmljYXRlUGF0aCB9ID4+IC9ldGMvc3NsL2NlcnRzL2NhLWNlcnRpZmljYXRlcy5jcnRcImApO1xyXG5cclxuICAgIGlmIChjb21tYW5kRXhpc3RzKCdjZXJ0dXRpbCcpKSB7XHJcbiAgICAgIGlmICh0aGlzLmlzRmlyZWZveEluc3RhbGxlZCgpKSB7XHJcbiAgICAgICAgcmVtb3ZlQ2VydGlmaWNhdGVGcm9tTlNTQ2VydERCKFxyXG4gICAgICAgICAgdGhpcy5GSVJFRk9YX05TU19ESVIsXHJcbiAgICAgICAgICBjZXJ0aWZpY2F0ZVBhdGgsXHJcbiAgICAgICAgICAnY2VydHV0aWwnXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy5pc0Nocm9tZUluc3RhbGxlZCgpKSB7XHJcbiAgICAgICAgcmVtb3ZlQ2VydGlmaWNhdGVGcm9tTlNTQ2VydERCKFxyXG4gICAgICAgICAgdGhpcy5DSFJPTUVfTlNTX0RJUixcclxuICAgICAgICAgIGNlcnRpZmljYXRlUGF0aCxcclxuICAgICAgICAgICdjZXJ0dXRpbCdcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhZGREb21haW5Ub0hvc3RGaWxlSWZNaXNzaW5nKGRvbWFpbjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBob3N0c0ZpbGVDb250ZW50cyA9IHJlYWQodGhpcy5IT1NUX0ZJTEVfUEFUSCwgJ3V0ZjgnKTtcclxuICAgIGlmICghaG9zdHNGaWxlQ29udGVudHMuaW5jbHVkZXMoZG9tYWluKSkge1xyXG4gICAgICBydW4oXHJcbiAgICAgICAgYGVjaG8gJzEyNy4wLjAuMSAgJHtkb21haW59JyB8IHN1ZG8gdGVlIC1hIFwiJHt0aGlzLkhPU1RfRklMRV9QQVRIfVwiID4gL2Rldi9udWxsYFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZGVsZXRlUHJvdGVjdGVkRmlsZXMoZmlsZXBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgYXNzZXJ0Tm90VG91Y2hpbmdGaWxlcyhmaWxlcGF0aCwgJ2RlbGV0ZScpO1xyXG4gICAgcnVuKGBzdWRvIHJtIC1yZiBcIiR7ZmlsZXBhdGh9XCJgKTtcclxuICB9XHJcblxyXG4gIHJlYWRQcm90ZWN0ZWRGaWxlKGZpbGVwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgYXNzZXJ0Tm90VG91Y2hpbmdGaWxlcyhmaWxlcGF0aCwgJ3JlYWQnKTtcclxuICAgIHJldHVybiBydW4oYHN1ZG8gY2F0IFwiJHtmaWxlcGF0aH1cImApXHJcbiAgICAgIC50b1N0cmluZygpXHJcbiAgICAgIC50cmltKCk7XHJcbiAgfVxyXG5cclxuICB3cml0ZVByb3RlY3RlZEZpbGUoZmlsZXBhdGg6IHN0cmluZywgY29udGVudHM6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgYXNzZXJ0Tm90VG91Y2hpbmdGaWxlcyhmaWxlcGF0aCwgJ3dyaXRlJyk7XHJcbiAgICBpZiAoZXhpc3RzKGZpbGVwYXRoKSkge1xyXG4gICAgICBydW4oYHN1ZG8gcm0gXCIke2ZpbGVwYXRofVwiYCk7XHJcbiAgICB9XHJcbiAgICB3cml0ZUZpbGUoZmlsZXBhdGgsIGNvbnRlbnRzKTtcclxuICAgIHJ1bihgc3VkbyBjaG93biAwIFwiJHtmaWxlcGF0aH1cImApO1xyXG4gICAgcnVuKGBzdWRvIGNobW9kIDYwMCBcIiR7ZmlsZXBhdGh9XCJgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaXNGaXJlZm94SW5zdGFsbGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIGV4aXN0cyh0aGlzLkZJUkVGT1hfQklOX1BBVEgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc0Nocm9tZUluc3RhbGxlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBleGlzdHModGhpcy5DSFJPTUVfQklOX1BBVEgpO1xyXG4gIH1cclxufVxyXG4iXX0=