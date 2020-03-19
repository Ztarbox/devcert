"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const crypto = require("crypto");
const fs_1 = require("fs");
const rimraf_1 = require("rimraf");
const shared_1 = require("./shared");
const utils_1 = require("../utils");
const user_interface_1 = require("../user-interface");
const debug = createDebug('devcert:platforms:windows');
let encryptionKey;
class WindowsPlatform {
    constructor() {
        this.HOST_FILE_PATH = 'C:\\Windows\\System32\\Drivers\\etc\\hosts';
    }
    /**
     * Windows is at least simple. Like macOS, most applications will delegate to
     * the system trust store, which is updated with the confusingly named
     * `certutil` exe (not the same as the NSS/Mozilla certutil). Firefox does it's
     * own thing as usual, and getting a copy of NSS certutil onto the Windows
     * machine to try updating the Firefox store is basically a nightmare, so we
     * don't even try it - we just bail out to the GUI.
     */
    async addToTrustStores(certificatePath, options = {}) {
        // IE, Chrome, system utils
        debug('adding devcert root to Windows OS trust store');
        try {
            utils_1.run(`certutil -addstore -user root "${certificatePath}"`);
        }
        catch (e) {
            e.output.map((buffer) => {
                if (buffer) {
                    console.log(buffer.toString());
                }
            });
        }
        debug('adding devcert root to Firefox trust store');
        // Firefox (don't even try NSS certutil, no easy install for Windows)
        try {
            await shared_1.openCertificateInFirefox('start firefox', certificatePath);
        }
        catch (_a) {
            debug('Error opening Firefox, most likely Firefox is not installed');
        }
    }
    removeFromTrustStores(certificatePath) {
        debug('removing devcert root from Windows OS trust store');
        try {
            console.warn("Removing old certificates from trust stores. You may be prompted to grant permission for this. It's safe to delete old devcert certificates.");
            utils_1.run(`certutil -delstore -user root devcert`);
        }
        catch (e) {
            debug(`failed to remove ${certificatePath} from Windows OS trust store, continuing. ${e.toString()}`);
        }
    }
    async addDomainToHostFileIfMissing(domain) {
        const hostsFileContents = fs_1.readFileSync(this.HOST_FILE_PATH, 'utf8');
        if (!hostsFileContents.includes(domain)) {
            await utils_1.sudo(`echo 127.0.0.1  ${domain} >> ${this.HOST_FILE_PATH}`);
        }
    }
    deleteProtectedFiles(filepath) {
        shared_1.assertNotTouchingFiles(filepath, 'delete');
        rimraf_1.sync(filepath);
    }
    async readProtectedFile(filepath) {
        shared_1.assertNotTouchingFiles(filepath, 'read');
        if (!encryptionKey) {
            encryptionKey = await user_interface_1.default.getWindowsEncryptionPassword();
        }
        // Try to decrypt the file
        try {
            return this.decrypt(fs_1.readFileSync(filepath, 'utf8'), encryptionKey);
        }
        catch (e) {
            // If it's a bad password, clear the cached copy and retry
            if (e.message.indexOf('bad decrypt') >= -1) {
                encryptionKey = null;
                return await this.readProtectedFile(filepath);
            }
            throw e;
        }
    }
    async writeProtectedFile(filepath, contents) {
        shared_1.assertNotTouchingFiles(filepath, 'write');
        if (!encryptionKey) {
            encryptionKey = await user_interface_1.default.getWindowsEncryptionPassword();
        }
        const encryptedContents = this.encrypt(contents, encryptionKey);
        fs_1.writeFileSync(filepath, encryptedContents);
    }
    encrypt(text, key) {
        const cipher = crypto.createCipher('aes256', new Buffer(key));
        return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    }
    decrypt(encrypted, key) {
        const decipher = crypto.createDecipher('aes256', new Buffer(key));
        return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    }
}
exports.default = WindowsPlatform;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luMzIuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBsYXRmb3Jtcy93aW4zMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFxQztBQUNyQyxpQ0FBaUM7QUFDakMsMkJBQWtFO0FBQ2xFLG1DQUF3QztBQUV4QyxxQ0FBNEU7QUFFNUUsb0NBQXFDO0FBQ3JDLHNEQUFtQztBQUVuQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUV2RCxJQUFJLGFBQTRCLENBQUM7QUFFakMsTUFBcUIsZUFBZTtJQUFwQztRQUNVLG1CQUFjLEdBQUcsNENBQTRDLENBQUM7SUFnR3hFLENBQUM7SUE5RkM7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxnQkFBZ0IsQ0FDcEIsZUFBdUIsRUFDdkIsVUFBbUIsRUFBRTtRQUVyQiwyQkFBMkI7UUFDM0IsS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDdkQsSUFBSTtZQUNGLFdBQUcsQ0FBQyxrQ0FBa0MsZUFBZSxHQUFHLENBQUMsQ0FBQztTQUMzRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFjLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDaEM7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDcEQscUVBQXFFO1FBQ3JFLElBQUk7WUFDRixNQUFNLGlDQUF3QixDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztTQUNsRTtRQUFDLFdBQU07WUFDTixLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQztTQUN0RTtJQUNILENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxlQUF1QjtRQUMzQyxLQUFLLENBQUMsbURBQW1E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akdELGtDQWlHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNyZWF0ZURlYnVnIGZyb20gJ2RlYnVnJztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgYXMgd3JpdGUsIHJlYWRGaWxlU3luYyBhcyByZWFkIH0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XHJcbmltcG9ydCB7IE9wdGlvbnMgfSBmcm9tICcuLi9pbmRleCc7XHJcbmltcG9ydCB7IGFzc2VydE5vdFRvdWNoaW5nRmlsZXMsIG9wZW5DZXJ0aWZpY2F0ZUluRmlyZWZveCB9IGZyb20gJy4vc2hhcmVkJztcclxuaW1wb3J0IHsgUGxhdGZvcm0gfSBmcm9tICcuJztcclxuaW1wb3J0IHsgcnVuLCBzdWRvIH0gZnJvbSAnLi4vdXRpbHMnO1xyXG5pbXBvcnQgVUkgZnJvbSAnLi4vdXNlci1pbnRlcmZhY2UnO1xyXG5cclxuY29uc3QgZGVidWcgPSBjcmVhdGVEZWJ1ZygnZGV2Y2VydDpwbGF0Zm9ybXM6d2luZG93cycpO1xyXG5cclxubGV0IGVuY3J5cHRpb25LZXk6IHN0cmluZyB8IG51bGw7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXaW5kb3dzUGxhdGZvcm0gaW1wbGVtZW50cyBQbGF0Zm9ybSB7XHJcbiAgcHJpdmF0ZSBIT1NUX0ZJTEVfUEFUSCA9ICdDOlxcXFxXaW5kb3dzXFxcXFN5c3RlbTMyXFxcXERyaXZlcnNcXFxcZXRjXFxcXGhvc3RzJztcclxuXHJcbiAgLyoqXHJcbiAgICogV2luZG93cyBpcyBhdCBsZWFzdCBzaW1wbGUuIExpa2UgbWFjT1MsIG1vc3QgYXBwbGljYXRpb25zIHdpbGwgZGVsZWdhdGUgdG9cclxuICAgKiB0aGUgc3lzdGVtIHRydXN0IHN0b3JlLCB3aGljaCBpcyB1cGRhdGVkIHdpdGggdGhlIGNvbmZ1c2luZ2x5IG5hbWVkXHJcbiAgICogYGNlcnR1dGlsYCBleGUgKG5vdCB0aGUgc2FtZSBhcyB0aGUgTlNTL01vemlsbGEgY2VydHV0aWwpLiBGaXJlZm94IGRvZXMgaXQnc1xyXG4gICAqIG93biB0aGluZyBhcyB1c3VhbCwgYW5kIGdldHRpbmcgYSBjb3B5IG9mIE5TUyBjZXJ0dXRpbCBvbnRvIHRoZSBXaW5kb3dzXHJcbiAgICogbWFjaGluZSB0byB0cnkgdXBkYXRpbmcgdGhlIEZpcmVmb3ggc3RvcmUgaXMgYmFzaWNhbGx5IGEgbmlnaHRtYXJlLCBzbyB3ZVxyXG4gICAqIGRvbid0IGV2ZW4gdHJ5IGl0IC0gd2UganVzdCBiYWlsIG91dCB0byB0aGUgR1VJLlxyXG4gICAqL1xyXG4gIGFzeW5jIGFkZFRvVHJ1c3RTdG9yZXMoXHJcbiAgICBjZXJ0aWZpY2F0ZVBhdGg6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IE9wdGlvbnMgPSB7fVxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gSUUsIENocm9tZSwgc3lzdGVtIHV0aWxzXHJcbiAgICBkZWJ1ZygnYWRkaW5nIGRldmNlcnQgcm9vdCB0byBXaW5kb3dzIE9TIHRydXN0IHN0b3JlJyk7XHJcbiAgICB0cnkge1xyXG4gICAgICBydW4oYGNlcnR1dGlsIC1hZGRzdG9yZSAtdXNlciByb290IFwiJHtjZXJ0aWZpY2F0ZVBhdGh9XCJgKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgZS5vdXRwdXQubWFwKChidWZmZXI6IEJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmIChidWZmZXIpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGJ1ZmZlci50b1N0cmluZygpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZGVidWcoJ2FkZGluZyBkZXZjZXJ0IHJvb3QgdG8gRmlyZWZveCB0cnVzdCBzdG9yZScpO1xyXG4gICAgLy8gRmlyZWZveCAoZG9uJ3QgZXZlbiB0cnkgTlNTIGNlcnR1dGlsLCBubyBlYXN5IGluc3RhbGwgZm9yIFdpbmRvd3MpXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBvcGVuQ2VydGlmaWNhdGVJbkZpcmVmb3goJ3N0YXJ0IGZpcmVmb3gnLCBjZXJ0aWZpY2F0ZVBhdGgpO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIGRlYnVnKCdFcnJvciBvcGVuaW5nIEZpcmVmb3gsIG1vc3QgbGlrZWx5IEZpcmVmb3ggaXMgbm90IGluc3RhbGxlZCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmVtb3ZlRnJvbVRydXN0U3RvcmVzKGNlcnRpZmljYXRlUGF0aDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBkZWJ1ZygncmVtb3ZpbmcgZGV2Y2VydCByb290IGZyb20gV2luZG93cyBPUyB0cnVzdCBzdG9yZScpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgIFwiUmVtb3Zpbmcgb2xkIGNlcnRpZmljYXRlcyBmcm9tIHRydXN0IHN0b3Jlcy4gWW91IG1heSBiZSBwcm9tcHRlZCB0byBncmFudCBwZXJtaXNzaW9uIGZvciB0aGlzLiBJdCdzIHNhZmUgdG8gZGVsZXRlIG9sZCBkZXZjZXJ0IGNlcnRpZmljYXRlcy5cIlxyXG4gICAgICApO1xyXG4gICAgICBydW4oYGNlcnR1dGlsIC1kZWxzdG9yZSAtdXNlciByb290IGRldmNlcnRgKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgZGVidWcoXHJcbiAgICAgICAgYGZhaWxlZCB0byByZW1vdmUgJHtjZXJ0aWZpY2F0ZVBhdGh9IGZyb20gV2luZG93cyBPUyB0cnVzdCBzdG9yZSwgY29udGludWluZy4gJHtlLnRvU3RyaW5nKCl9YFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWRkRG9tYWluVG9Ib3N0RmlsZUlmTWlzc2luZyhkb21haW46IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgaG9zdHNGaWxlQ29udGVudHMgPSByZWFkKHRoaXMuSE9TVF9GSUxFX1BBVEgsICd1dGY4Jyk7XHJcbiAgICBpZiAoIWhvc3RzRmlsZUNvbnRlbnRzLmluY2x1ZGVzKGRvbWFpbikpIHtcclxuICAgICAgYXdhaXQgc3VkbyhgZWNobyAxMjcuMC4wLjEgICR7ZG9tYWlufSA+PiAke3RoaXMuSE9TVF9GSUxFX1BBVEh9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBkZWxldGVQcm90ZWN0ZWRGaWxlcyhmaWxlcGF0aDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAnZGVsZXRlJyk7XHJcbiAgICByaW1yYWYoZmlsZXBhdGgpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVhZFByb3RlY3RlZEZpbGUoZmlsZXBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAncmVhZCcpO1xyXG4gICAgaWYgKCFlbmNyeXB0aW9uS2V5KSB7XHJcbiAgICAgIGVuY3J5cHRpb25LZXkgPSBhd2FpdCBVSS5nZXRXaW5kb3dzRW5jcnlwdGlvblBhc3N3b3JkKCk7XHJcbiAgICB9XHJcbiAgICAvLyBUcnkgdG8gZGVjcnlwdCB0aGUgZmlsZVxyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIHRoaXMuZGVjcnlwdChyZWFkKGZpbGVwYXRoLCAndXRmOCcpLCBlbmNyeXB0aW9uS2V5KTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgLy8gSWYgaXQncyBhIGJhZCBwYXNzd29yZCwgY2xlYXIgdGhlIGNhY2hlZCBjb3B5IGFuZCByZXRyeVxyXG4gICAgICBpZiAoZS5tZXNzYWdlLmluZGV4T2YoJ2JhZCBkZWNyeXB0JykgPj0gLTEpIHtcclxuICAgICAgICBlbmNyeXB0aW9uS2V5ID0gbnVsbDtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZWFkUHJvdGVjdGVkRmlsZShmaWxlcGF0aCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHdyaXRlUHJvdGVjdGVkRmlsZShmaWxlcGF0aDogc3RyaW5nLCBjb250ZW50czogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhc3NlcnROb3RUb3VjaGluZ0ZpbGVzKGZpbGVwYXRoLCAnd3JpdGUnKTtcclxuICAgIGlmICghZW5jcnlwdGlvbktleSkge1xyXG4gICAgICBlbmNyeXB0aW9uS2V5ID0gYXdhaXQgVUkuZ2V0V2luZG93c0VuY3J5cHRpb25QYXNzd29yZCgpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgZW5jcnlwdGVkQ29udGVudHMgPSB0aGlzLmVuY3J5cHQoY29udGVudHMsIGVuY3J5cHRpb25LZXkpO1xyXG4gICAgd3JpdGUoZmlsZXBhdGgsIGVuY3J5cHRlZENvbnRlbnRzKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZW5jcnlwdCh0ZXh0OiBzdHJpbmcsIGtleTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNpcGhlciA9IGNyeXB0by5jcmVhdGVDaXBoZXIoJ2FlczI1NicsIG5ldyBCdWZmZXIoa2V5KSk7XHJcbiAgICByZXR1cm4gY2lwaGVyLnVwZGF0ZSh0ZXh0LCAndXRmOCcsICdoZXgnKSArIGNpcGhlci5maW5hbCgnaGV4Jyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGRlY3J5cHQoZW5jcnlwdGVkOiBzdHJpbmcsIGtleTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyKCdhZXMyNTYnLCBuZXcgQnVmZmVyKGtleSkpO1xyXG4gICAgcmV0dXJuIGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWQsICdoZXgnLCAndXRmOCcpICsgZGVjaXBoZXIuZmluYWwoJ3V0ZjgnKTtcclxuICB9XHJcbn1cclxuIl19