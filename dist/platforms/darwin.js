"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("fs");
const createDebug = require("debug");
const command_exists_1 = require("command-exists");
const utils_1 = require("../utils");
const shared_1 = require("./shared");
const debug = createDebug('devcert:platforms:macos');
const getCertUtilPath = () => path.join(utils_1.run('brew --prefix nss')
    .toString()
    .trim(), 'bin', 'certutil');
class MacOSPlatform {
    constructor() {
        this.FIREFOX_BUNDLE_PATH = '/Applications/Firefox.app';
        this.FIREFOX_BIN_PATH = path.join(this.FIREFOX_BUNDLE_PATH, 'Contents/MacOS/firefox');
        this.FIREFOX_NSS_DIR = path.join(shared_1.HOME, 'Library/Application Support/Firefox/Profiles/*');
        this.HOST_FILE_PATH = '/etc/hosts';
    }
    /**
     * macOS is pretty simple - just add the certificate to the system keychain,
     * and most applications will delegate to that for determining trusted
     * certificates. Firefox, of course, does it's own thing. We can try to
     * automatically install the cert with Firefox if we can use certutil via the
     * `nss` Homebrew package, otherwise we go manual with user-facing prompts.
     */
    async addToTrustStores(certificatePath, options = {}) {
        // Chrome, Safari, system utils
        debug('Adding devcert root CA to macOS system keychain');
        utils_1.run(`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${certificatePath}"`);
        if (this.isFirefoxInstalled()) {
            // Try to use certutil to install the cert automatically
            debug('Firefox install detected. Adding devcert root CA to Firefox trust store');
            if (!this.isNSSInstalled()) {
                if (!options.skipCertutilInstall) {
                    if (command_exists_1.sync('brew')) {
                        debug(`certutil is not already installed, but Homebrew is detected. Trying to install certutil via Homebrew...`);
                        utils_1.run('brew install nss');
                    }
                    else {
                        debug(`Homebrew isn't installed, so we can't try to install certutil. Falling back to manual certificate install`);
                        return await shared_1.openCertificateInFirefox(this.FIREFOX_BIN_PATH, certificatePath);
                    }
                }
                else {
                    debug(`certutil is not already installed, and skipCertutilInstall is true, so we have to fall back to a manual install`);
                    return await shared_1.openCertificateInFirefox(this.FIREFOX_BIN_PATH, certificatePath);
                }
            }
            await shared_1.closeFirefox();
            shared_1.addCertificateToNSSCertDB(this.FIREFOX_NSS_DIR, certificatePath, getCertUtilPath());
        }
        else {
            debug('Firefox does not appear to be installed, skipping Firefox-specific steps...');
        }
    }
    removeFromTrustStores(certificatePath) {
        debug('Removing devcert root CA from macOS system keychain');
        try {
            if (fs_1.existsSync(certificatePath)) {
                utils_1.run(`sudo security remove-trusted-cert -d "${certificatePath}"`);
            }
        }
        catch (e) {
            debug(`failed to remove ${certificatePath} from macOS cert store, continuing. ${e.toString()}`);
        }
        if (this.isFirefoxInstalled() && this.isNSSInstalled()) {
            debug('Firefox install and certutil install detected. Trying to remove root CA from Firefox NSS databases');
            shared_1.removeCertificateFromNSSCertDB(this.FIREFOX_NSS_DIR, certificatePath, getCertUtilPath());
        }
    }
    addDomainToHostFileIfMissing(domain) {
        const hostsFileContents = fs_1.readFileSync(this.HOST_FILE_PATH, 'utf8');
        if (!hostsFileContents.includes(domain)) {
            utils_1.run(`echo '\n127.0.0.1 ${domain}' | sudo tee -a "${this.HOST_FILE_PATH}" > /dev/null`);
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
        return fs_1.existsSync(this.FIREFOX_BUNDLE_PATH);
    }
    isNSSInstalled() {
        try {
            return utils_1.run('brew list -1')
                .toString()
                .includes('\nnss\n');
        }
        catch (e) {
            return false;
        }
    }
}
exports.default = MacOSPlatform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFyd2luLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwbGF0Zm9ybXMvZGFyd2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQTZCO0FBQzdCLDJCQUtZO0FBQ1oscUNBQXFDO0FBQ3JDLG1EQUF1RDtBQUN2RCxvQ0FBK0I7QUFFL0IscUNBT2tCO0FBR2xCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXJELE1BQU0sZUFBZSxHQUFHLEdBQVcsRUFBRSxDQUNuQyxJQUFJLENBQUMsSUFBSSxDQUNQLFdBQUcsQ0FBQyxtQkFBbUIsQ0FBQztLQUNyQixRQUFRLEVBQUU7S0FDVixJQUFJLEVBQUUsRUFDVCxLQUFLLEVBQ0wsVUFBVSxDQUNYLENBQUM7QUFFSixNQUFxQixhQUFhO0lBQWxDO1FBQ1Usd0JBQW1CLEdBQUcsMkJBQTJCLENBQUM7UUFDbEQscUJBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDbEMsSUFBSSxDQUFDLG1CQUFtQixFQUN4Qix3QkFBd0IsQ0FDekIsQ0FBQztRQUNNLG9CQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDakMsYUFBSSxFQUNKLGdEQUFnRCxDQUNqRCxDQUFDO1FBRU0sbUJBQWMsR0FBRyxZQUFZLENBQUM7SUFrSXhDLENBQUM7SUFoSUM7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUNwQixlQUF1QixFQUN2QixVQUFtQixFQUFFO1FBRXJCLCtCQUErQjtRQUMvQixLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUN6RCxXQUFHLENBQ0QseUdBQXlHLGVBQWUsR0FBRyxDQUM1SCxDQUFDO1FBRUYsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtZQUM3Qix3REFBd0Q7WUFDeEQsS0FBSyxDQUNILHlFQUF5RSxDQUMxRSxDQUFDO1lBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxD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Q0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxjQUFjO1FBQ3BCLElBQUk7WUFDRixPQUFPLFdBQUcsQ0FBQyxjQUFjLENBQUM7aUJBQ3ZCLFFBQVEsRUFBRTtpQkFDVixRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDeEI7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0NBQ0Y7QUE3SUQsZ0NBNklDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHtcclxuICB3cml0ZUZpbGVTeW5jIGFzIHdyaXRlRmlsZSxcclxuICBleGlzdHNTeW5jIGFzIGV4aXN0cyxcclxuICByZWFkRmlsZVN5bmMgYXMgcmVhZCxcclxuICBleGlzdHNTeW5jXHJcbn0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBjcmVhdGVEZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmltcG9ydCB7IHN5bmMgYXMgY29tbWFuZEV4aXN0cyB9IGZyb20gJ2NvbW1hbmQtZXhpc3RzJztcclxuaW1wb3J0IHsgcnVuIH0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQgeyBPcHRpb25zIH0gZnJvbSAnLi4vaW5kZXgnO1xyXG5pbXBvcnQge1xyXG4gIGFkZENlcnRpZmljYXRlVG9OU1NDZXJ0REIsXHJcbiAgYXNzZXJ0Tm90VG91Y2hpbmdGaWxlcyxcclxuICBvcGVuQ2VydGlmaWNhdGVJbkZpcmVmb3gsXHJcbiAgY2xvc2VGaXJlZm94LFxyXG4gIHJlbW92ZUNlcnRpZmljYXRlRnJvbU5TU0NlcnREQixcclxuICBIT01FXHJcbn0gZnJvbSAnLi9zaGFyZWQnO1xyXG5pbXBvcnQgeyBQbGF0Zm9ybSB9IGZyb20gJy4nO1xyXG5cclxuY29uc3QgZGVidWcgPSBjcmVhdGVEZWJ1ZygnZGV2Y2VydDpwbGF0Zm9ybXM6bWFjb3MnKTtcclxuXHJcbmNvbnN0IGdldENlcnRVdGlsUGF0aCA9ICgpOiBzdHJpbmcgPT5cclxuICBwYXRoLmpvaW4oXHJcbiAgICBydW4oJ2JyZXcgLS1wcmVmaXggbnNzJylcclxuICAgICAgLnRvU3RyaW5nKClcclxuICAgICAgLnRyaW0oKSxcclxuICAgICdiaW4nLFxyXG4gICAgJ2NlcnR1dGlsJ1xyXG4gICk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYWNPU1BsYXRmb3JtIGltcGxlbWVudHMgUGxhdGZvcm0ge1xyXG4gIHByaXZhdGUgRklSRUZPWF9CVU5ETEVfUEFUSCA9ICcvQXBwbGljYXRpb25zL0ZpcmVmb3guYXBwJztcclxuICBwcml2YXRlIEZJUkVGT1hfQklOX1BBVEggPSBwYXRoLmpvaW4oXHJcbiAgICB0aGlzLkZJUkVGT1hfQlVORExFX1BBVEgsXHJcbiAgICAnQ29udGVudHMvTWFjT1MvZmlyZWZveCdcclxuICApO1xyXG4gIHByaXZhdGUgRklSRUZPWF9OU1NfRElSID0gcGF0aC5qb2luKFxyXG4gICAgSE9NRSxcclxuICAgICdMaWJyYXJ5L0FwcGxpY2F0aW9uIFN1cHBvcnQvRmlyZWZveC9Qcm9maWxlcy8qJ1xyXG4gICk7XHJcblxyXG4gIHByaXZhdGUgSE9TVF9GSUxFX1BBVEggPSAnL2V0Yy9ob3N0cyc7XHJcblxyXG4gIC8qKlxyXG4gICAqIG1hY09TIGlzIHByZXR0eSBzaW1wbGUgLSBqdXN0IGFkZCB0aGUgY2VydGlmaWNhdGUgdG8gdGhlIHN5c3RlbSBrZXljaGFpbixcclxuICAgKiBhbmQgbW9zdCBhcHBsaWNhdGlvbnMgd2lsbCBkZWxlZ2F0ZSB0byB0aGF0IGZvciBkZXRlcm1pbmluZyB0cnVzdGVkXHJcbiAgICogY2VydGlmaWNhdGVzLiBGaXJlZm94LCBvZiBjb3Vyc2UsIGRvZXMgaXQncyBvd24gdGhpbmcuIFdlIGNhbiB0cnkgdG9cclxuICAgKiBhdXRvbWF0aWNhbGx5IGluc3RhbGwgdGhlIGNlcnQgd2l0aCBGaXJlZm94IGlmIHdlIGNhbiB1c2UgY2VydHV0aWwgdmlhIHRoZVxyXG4gICAqIGBuc3NgIEhvbWVicmV3IHBhY2thZ2UsIG90aGVyd2lzZSB3ZSBnbyBtYW51YWwgd2l0aCB1c2VyLWZhY2luZyBwcm9tcHRzLlxyXG4gICAqL1xyXG4gIGFzeW5jIGFkZFRvVHJ1c3RTdG9yZXMoXHJcbiAgICBjZXJ0aWZpY2F0ZVBhdGg6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IE9wdGlvbnMgPSB7fVxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gQ2hyb21lLCBTYWZhcmksIHN5c3RlbSB1dGlsc1xyXG4gICAgZGVidWcoJ0FkZGluZyBkZXZjZXJ0IHJvb3QgQ0EgdG8gbWFjT1Mgc3lzdGVtIGtleWNoYWluJyk7XHJcbiAgICBydW4oXHJcbiAgICAgIGBzdWRvIHNlY3VyaXR5IGFkZC10cnVzdGVkLWNlcnQgLWQgLXIgdHJ1c3RSb290IC1rIC9MaWJyYXJ5L0tleWNoYWlucy9TeXN0ZW0ua2V5Y2hhaW4gLXAgc3NsIC1wIGJhc2ljIFwiJHtjZXJ0aWZpY2F0ZVBhdGh9XCJgXHJcbiAgICApO1xyXG5cclxuICAgIGlmICh0aGlzLmlzRmlyZWZveEluc3RhbGxlZCgpKSB7XHJcbiAgICAgIC8vIFRyeSB0byB1c2UgY2VydHV0aWwgdG8gaW5zdGFsbCB0aGUgY2VydCBhdXRvbWF0aWNhbGx5XHJcbiAgICAgIGRlYnVnKFxyXG4gICAgICAgICdGaXJlZm94IGluc3RhbGwgZGV0ZWN0ZWQuIEFkZGluZyBkZXZjZXJ0IHJvb3QgQ0EgdG8gRmlyZWZveCB0cnVzdCBzdG9yZSdcclxuICAgICAgKTtcclxuICAgICAgaWYgKCF0aGlzLmlzTlNTSW5zdGFsbGVkKCkpIHtcclxuICAgICAgICBpZiAoIW9wdGlvbnMuc2tpcENlcnR1dGlsSW5zdGFsbCkge1xyXG4gICAgICAgICAgaWYgKGNvbW1hbmRFeGlzdHMoJ2JyZXcnKSkge1xyXG4gICAgICAgICAgICBkZWJ1ZyhcclxuICAgICAgICAgICAgICBgY2VydHV0aWwgaXMgbm90IGFscmVhZHkgaW5zdGFsbGVkLCBidXQgSG9tZWJyZXcgaXMgZGV0ZWN0ZWQuIFRyeWluZyB0byBpbnN0YWxsIGNlcnR1dGlsIHZpYSBIb21lYnJldy4uLmBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgcnVuKCdicmV3IGluc3RhbGwgbnNzJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkZWJ1ZyhcclxuICAgICAgICAgICAgICBgSG9tZWJyZXcgaXNuJ3QgaW5zdGFsbGVkLCBzbyB3ZSBjYW4ndCB0cnkgdG8gaW5zdGFsbCBjZXJ0dXRpbC4gRmFsbGluZyBiYWNrIHRvIG1hbnVhbCBjZXJ0aWZpY2F0ZSBpbnN0YWxsYFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgb3BlbkNlcnRpZmljYXRlSW5GaXJlZm94KFxyXG4gICAgICAgICAgICAgIHRoaXMuRklSRUZPWF9CSU5fUEFUSCxcclxuICAgICAgICAgICAgICBjZXJ0aWZpY2F0ZVBhdGhcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZGVidWcoXHJcbiAgICAgICAgICAgIGBjZXJ0dXRpbCBpcyBub3QgYWxyZWFkeSBpbnN0YWxsZWQsIGFuZCBza2lwQ2VydHV0aWxJbnN0YWxsIGlzIHRydWUsIHNvIHdlIGhhdmUgdG8gZmFsbCBiYWNrIHRvIGEgbWFudWFsIGluc3RhbGxgXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IG9wZW5DZXJ0aWZpY2F0ZUluRmlyZWZveChcclxuICAgICAgICAgICAgdGhpcy5GSVJFRk9YX0JJTl9QQVRILFxyXG4gICAgICAgICAgICBjZXJ0aWZpY2F0ZVBhdGhcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGF3YWl0IGNsb3NlRmlyZWZveCgpO1xyXG4gICAgICBhZGRDZXJ0aWZpY2F0ZVRvTlNTQ2VydERCKFxyXG4gICAgICAgIHRoaXMuRklSRUZPWF9OU1NfRElSLFxyXG4gICAgICAgIGNlcnRpZmljYXRlUGF0aCxcclxuICAgICAgICBnZXRDZXJ0VXRpbFBhdGgoKVxyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZGVidWcoXHJcbiAgICAgICAgJ0ZpcmVmb3ggZG9lcyBub3QgYXBwZWFyIHRvIGJlIGluc3RhbGxlZCwgc2tpcHBpbmcgRmlyZWZveC1zcGVjaWZpYyBzdGVwcy4uLidcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJlbW92ZUZyb21UcnVzdFN0b3JlcyhjZXJ0aWZpY2F0ZVBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgZGVidWcoJ1JlbW92aW5nIGRldmNlcnQgcm9vdCBDQSBmcm9tIG1hY09TIHN5c3RlbSBrZXljaGFpbicpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKGV4aXN0c1N5bmMoY2VydGlmaWNhdGVQYXRoKSkge1xyXG4gICAgICAgIHJ1bihgc3VkbyBzZWN1cml0eSByZW1vdmUtdHJ1c3RlZC1jZXJ0IC1kIFwiJHtjZXJ0aWZpY2F0ZVBhdGh9XCJgKTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBkZWJ1ZyhcclxuICAgICAgICBgZmFpbGVkIHRvIHJlbW92ZSAke2NlcnRpZmljYXRlUGF0aH0gZnJvbSBtYWNPUyBjZXJ0IHN0b3JlLCBjb250aW51aW5nLiAke2UudG9TdHJpbmcoKX1gXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5pc0ZpcmVmb3hJbnN0YWxsZWQoKSAmJiB0aGlzLmlzTlNTSW5zdGFsbGVkKCkpIHtcclxuICAgICAgZGVidWcoXHJcbiAgICAgICAgJ0ZpcmVmb3ggaW5zdGFsbCBhbmQgY2VydHV0aWwgaW5zdGFsbCBkZXRlY3RlZC4gVHJ5aW5nIHRvIHJlbW92ZSByb290IENBIGZyb20gRmlyZWZveCBOU1MgZGF0YWJhc2VzJ1xyXG4gICAgICApO1xyXG4gICAgICByZW1vdmVDZXJ0aWZpY2F0ZUZyb21OU1NDZXJ0REIoXHJcbiAgICAgICAgdGhpcy5GSVJFRk9YX05TU19ESVIsXHJcbiAgICAgICAgY2VydGlmaWNhdGVQYXRoLFxyXG4gICAgICAgIGdldENlcnRVdGlsUGF0aCgpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhZGREb21haW5Ub0hvc3RGaWxlSWZNaXNzaW5nKGRvbWFpbjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBob3N0c0ZpbGVDb250ZW50cyA9IHJlYWQodGhpcy5IT1NUX0ZJTEVfUEFUSCwgJ3V0ZjgnKTtcclxuICAgIGlmICghaG9zdHNGaWxlQ29udGVudHMuaW5jbHVkZXMoZG9tYWluKSkge1xyXG4gICAgICBydW4oXHJcbiAgICAgICAgYGVjaG8gJ1xcbjEyNy4wLjAuMSAke2RvbWFpbn0nIHwgc3VkbyB0ZWUgLWEgXCIke3RoaXMuSE9TVF9GSUxFX1BBVEh9XCIgPiAvZGV2L251bGxgXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBkZWxldGVQcm90ZWN0ZWRGaWxlcyhmaWxlcGF0aDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAnZGVsZXRlJyk7XHJcbiAgICBydW4oYHN1ZG8gcm0gLXJmIFwiJHtmaWxlcGF0aH1cImApO1xyXG4gIH1cclxuXHJcbiAgcmVhZFByb3RlY3RlZEZpbGUoZmlsZXBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAncmVhZCcpO1xyXG4gICAgcmV0dXJuIHJ1bihgc3VkbyBjYXQgXCIke2ZpbGVwYXRofVwiYClcclxuICAgICAgLnRvU3RyaW5nKClcclxuICAgICAgLnRyaW0oKTtcclxuICB9XHJcblxyXG4gIHdyaXRlUHJvdGVjdGVkRmlsZShmaWxlcGF0aDogc3RyaW5nLCBjb250ZW50czogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAnd3JpdGUnKTtcclxuICAgIGlmIChleGlzdHMoZmlsZXBhdGgpKSB7XHJcbiAgICAgIHJ1bihgc3VkbyBybSBcIiR7ZmlsZXBhdGh9XCJgKTtcclxuICAgIH1cclxuICAgIHdyaXRlRmlsZShmaWxlcGF0aCwgY29udGVudHMpO1xyXG4gICAgcnVuKGBzdWRvIGNob3duIDAgXCIke2ZpbGVwYXRofVwiYCk7XHJcbiAgICBydW4oYHN1ZG8gY2htb2QgNjAwIFwiJHtmaWxlcGF0aH1cImApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc0ZpcmVmb3hJbnN0YWxsZWQoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gZXhpc3RzKHRoaXMuRklSRUZPWF9CVU5ETEVfUEFUSCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGlzTlNTSW5zdGFsbGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIHJ1bignYnJldyBsaXN0IC0xJylcclxuICAgICAgICAudG9TdHJpbmcoKVxyXG4gICAgICAgIC5pbmNsdWRlcygnXFxubnNzXFxuJyk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19