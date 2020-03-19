"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("fs");
const mkdirp_1 = require("mkdirp");
const lodash_1 = require("lodash");
const eol = require("eol");
const utils_1 = require("./utils");
const applicationConfigPath = require("application-config-path");
const _createDebug = require("debug");
const debug = _createDebug('devcert:constants');
// Platform shortcuts
exports.isMac = process.platform === 'darwin';
exports.isLinux = process.platform === 'linux';
exports.isWindows = process.platform === 'win32';
// Common paths
exports.configDir = applicationConfigPath('devcert');
exports.configPath = path.join.bind(path, exports.configDir);
exports.domainsDir = exports.configPath('domains');
exports.caVersionFile = exports.configPath('devcert-ca-version');
exports.opensslSerialFilePath = exports.configPath('certificate-authority', 'serial');
exports.opensslDatabaseFilePath = exports.configPath('certificate-authority', 'index.txt');
exports.caSelfSignConfig = path.join(__dirname, '../openssl-configurations/certificate-authority-self-signing.conf');
function includeWildcards(list) {
    return list.reduce((outlist, item) => {
        outlist.push(item, `*.${item}`);
        return outlist;
    }, []);
}
async function withDomainSigningRequestConfig(commonName, { alternativeNames }, cb) {
    const tmp = utils_1.tmpDir();
    const tmpFile = path.join(tmp.name, 'domain-certificate-signing-requests.conf');
    const source = fs_1.readFileSync(path.join(__dirname, '../openssl-configurations/domain-certificate-signing-requests.conf'), 'utf-8');
    const template = lodash_1.template(source);
    const result = template({
        commonName,
        altNames: includeWildcards([commonName, ...alternativeNames])
    });
    fs_1.writeFileSync(tmpFile, eol.auto(result));
    await cb(tmpFile);
    fs_1.unlinkSync(tmpFile);
    tmp.removeCallback();
}
exports.withDomainSigningRequestConfig = withDomainSigningRequestConfig;
async function withDomainCertificateConfig(commonName, alternativeNames, cb) {
    const tmp = utils_1.tmpDir();
    const tmpFile = path.join(tmp.name, 'ca.cfg');
    const source = fs_1.readFileSync(path.join(__dirname, '../openssl-configurations/domain-certificates.conf'), 'utf-8');
    const template = lodash_1.template(source);
    const result = template({
        commonName,
        altNames: includeWildcards([commonName, ...alternativeNames]),
        serialFile: exports.opensslSerialFilePath,
        databaseFile: exports.opensslDatabaseFilePath,
        domainDir: utils_1.pathForDomain(commonName)
    });
    fs_1.writeFileSync(tmpFile, eol.auto(result));
    await cb(tmpFile);
    fs_1.unlinkSync(tmpFile);
    tmp.removeCallback();
}
exports.withDomainCertificateConfig = withDomainCertificateConfig;
// confTemplate = confTemplate.replace(/DATABASE_PATH/, configPath('index.txt').replace(/\\/g, '\\\\'));
// confTemplate = confTemplate.replace(/SERIAL_PATH/, configPath('serial').replace(/\\/g, '\\\\'));
// confTemplate = eol.auto(confTemplate);
exports.rootCADir = exports.configPath('certificate-authority');
exports.rootCAKeyPath = path.join(exports.rootCADir, 'private-key.key');
exports.rootCACertPath = path.join(exports.rootCADir, 'certificate.cert');
debug('rootCACertPath', exports.rootCACertPath);
debug('rootCAKeyPath', exports.rootCAKeyPath);
debug('rootCADir', exports.rootCADir);
// Exposed for uninstallation purposes.
function getLegacyConfigDir() {
    if (exports.isWindows && process.env.LOCALAPPDATA) {
        return path.join(process.env.LOCALAPPDATA, 'devcert', 'config');
    }
    else {
        const uid = process.getuid && process.getuid();
        const userHome = exports.isLinux && uid === 0
            ? path.resolve('/usr/local/share')
            : require('os').homedir();
        return path.join(userHome, '.config', 'devcert');
    }
}
exports.getLegacyConfigDir = getLegacyConfigDir;
function ensureConfigDirs() {
    mkdirp_1.sync(exports.configDir);
    mkdirp_1.sync(exports.domainsDir);
    mkdirp_1.sync(exports.rootCADir);
}
exports.ensureConfigDirs = ensureConfigDirs;
ensureConfigDirs();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJjb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBNkI7QUFDN0IsMkJBSVk7QUFDWixtQ0FBd0M7QUFDeEMsbUNBQWtEO0FBQ2xELDJCQUEyQjtBQUMzQixtQ0FBZ0Q7QUFDaEQsaUVBQWtFO0FBQ2xFLHNDQUFzQztBQUV0QyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNoRCxxQkFBcUI7QUFDUixRQUFBLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUN0QyxRQUFBLE9BQU8sR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQUN2QyxRQUFBLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQUV0RCxlQUFlO0FBQ0YsUUFBQSxTQUFTLEdBQUcscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDN0MsUUFBQSxVQUFVLEdBQTBDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUM3RSxJQUFJLEVBQ0osaUJBQVMsQ0FDVixDQUFDO0FBRVcsUUFBQSxVQUFVLEdBQUcsa0JBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQyxRQUFBLGFBQWEsR0FBRyxrQkFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDakQsUUFBQSxxQkFBcUIsR0FBRyxrQkFBVSxDQUM3Qyx1QkFBdUIsRUFDdkIsUUFBUSxDQUNULENBQUM7QUFDVyxRQUFBLHVCQUF1QixHQUFHLGtCQUFVLENBQy9DLHVCQUF1QixFQUN2QixXQUFXLENBQ1osQ0FBQztBQUNXLFFBQUEsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDdkMsU0FBUyxFQUNULG1FQUFtRSxDQUNwRSxDQUFDO0FBRUYsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFjO0lBQ3RDLE9BQU8sSUFBSSxDQUFDLE1BQU0s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QWEsQ0FBQyxDQUFDO0FBQ3RDLEtBQUssQ0FBQyxXQUFXLEVBQUUsaUJBQVMsQ0FBQyxDQUFDO0FBRTlCLHVDQUF1QztBQUN2QyxTQUFnQixrQkFBa0I7SUFDaEMsSUFBSSxpQkFBUyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDakU7U0FBTTtRQUNMLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9DLE1BQU0sUUFBUSxHQUNaLGVBQU8sSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztZQUNsQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQ2xEO0FBQ0gsQ0FBQztBQVhELGdEQVdDO0FBRUQsU0FBZ0IsZ0JBQWdCO0lBQzlCLGFBQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7SUFDbEIsYUFBTSxDQUFDLGtCQUFVLENBQUMsQ0FBQztJQUNuQixhQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFKRCw0Q0FJQztBQUVELGdCQUFnQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQge1xyXG4gIHdyaXRlRmlsZVN5bmMgYXMgd3JpdGVGaWxlLFxyXG4gIHJlYWRGaWxlU3luYyBhcyByZWFkRmlsZSxcclxuICB1bmxpbmtTeW5jXHJcbn0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XHJcbmltcG9ydCB7IHRlbXBsYXRlIGFzIG1ha2VUZW1wbGF0ZSB9IGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIGVvbCBmcm9tICdlb2wnO1xyXG5pbXBvcnQgeyB0bXBEaXIsIHBhdGhGb3JEb21haW4gfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IGFwcGxpY2F0aW9uQ29uZmlnUGF0aCA9IHJlcXVpcmUoJ2FwcGxpY2F0aW9uLWNvbmZpZy1wYXRoJyk7XHJcbmltcG9ydCAqIGFzIF9jcmVhdGVEZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5jb25zdCBkZWJ1ZyA9IF9jcmVhdGVEZWJ1ZygnZGV2Y2VydDpjb25zdGFudHMnKTtcclxuLy8gUGxhdGZvcm0gc2hvcnRjdXRzXHJcbmV4cG9ydCBjb25zdCBpc01hYyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICdkYXJ3aW4nO1xyXG5leHBvcnQgY29uc3QgaXNMaW51eCA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCc7XHJcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xyXG5cclxuLy8gQ29tbW9uIHBhdGhzXHJcbmV4cG9ydCBjb25zdCBjb25maWdEaXIgPSBhcHBsaWNhdGlvbkNvbmZpZ1BhdGgoJ2RldmNlcnQnKTtcclxuZXhwb3J0IGNvbnN0IGNvbmZpZ1BhdGg6ICguLi5wYXRoU2VnbWVudHM6IHN0cmluZ1tdKSA9PiBzdHJpbmcgPSBwYXRoLmpvaW4uYmluZChcclxuICBwYXRoLFxyXG4gIGNvbmZpZ0RpclxyXG4pO1xyXG5cclxuZXhwb3J0IGNvbnN0IGRvbWFpbnNEaXIgPSBjb25maWdQYXRoKCdkb21haW5zJyk7XHJcblxyXG5leHBvcnQgY29uc3QgY2FWZXJzaW9uRmlsZSA9IGNvbmZpZ1BhdGgoJ2RldmNlcnQtY2EtdmVyc2lvbicpO1xyXG5leHBvcnQgY29uc3Qgb3BlbnNzbFNlcmlhbEZpbGVQYXRoID0gY29uZmlnUGF0aChcclxuICAnY2VydGlmaWNhdGUtYXV0aG9yaXR5JyxcclxuICAnc2VyaWFsJ1xyXG4pO1xyXG5leHBvcnQgY29uc3Qgb3BlbnNzbERhdGFiYXNlRmlsZVBhdGggPSBjb25maWdQYXRoKFxyXG4gICdjZXJ0aWZpY2F0ZS1hdXRob3JpdHknLFxyXG4gICdpbmRleC50eHQnXHJcbik7XHJcbmV4cG9ydCBjb25zdCBjYVNlbGZTaWduQ29uZmlnID0gcGF0aC5qb2luKFxyXG4gIF9fZGlybmFtZSxcclxuICAnLi4vb3BlbnNzbC1jb25maWd1cmF0aW9ucy9jZXJ0aWZpY2F0ZS1hdXRob3JpdHktc2VsZi1zaWduaW5nLmNvbmYnXHJcbik7XHJcblxyXG5mdW5jdGlvbiBpbmNsdWRlV2lsZGNhcmRzKGxpc3Q6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xyXG4gIHJldHVybiBsaXN0LnJlZHVjZSgob3V0bGlzdCwgaXRlbSkgPT4ge1xyXG4gICAgb3V0bGlzdC5wdXNoKGl0ZW0sIGAqLiR7aXRlbX1gKTtcclxuICAgIHJldHVybiBvdXRsaXN0O1xyXG4gIH0sIFtdIGFzIHN0cmluZ1tdKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdpdGhEb21haW5TaWduaW5nUmVxdWVzdENvbmZpZyhcclxuICBjb21tb25OYW1lOiBzdHJpbmcsXHJcbiAgeyBhbHRlcm5hdGl2ZU5hbWVzIH06IHsgYWx0ZXJuYXRpdmVOYW1lczogc3RyaW5nW10gfSxcclxuICBjYjogKGZpbGVwYXRoOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4gfCB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHRtcCA9IHRtcERpcigpO1xyXG4gIGNvbnN0IHRtcEZpbGUgPSBwYXRoLmpvaW4oXHJcbiAgICB0bXAubmFtZSxcclxuICAgICdkb21haW4tY2VydGlmaWNhdGUtc2lnbmluZy1yZXF1ZXN0cy5jb25mJ1xyXG4gICk7XHJcbiAgY29uc3Qgc291cmNlID0gcmVhZEZpbGUoXHJcbiAgICBwYXRoLmpvaW4oXHJcbiAgICAgIF9fZGlybmFtZSxcclxuICAgICAgJy4uL29wZW5zc2wtY29uZmlndXJhdGlvbnMvZG9tYWluLWNlcnRpZmljYXRlLXNpZ25pbmctcmVxdWVzdHMuY29uZidcclxuICAgICksXHJcbiAgICAndXRmLTgnXHJcbiAgKTtcclxuICBjb25zdCB0ZW1wbGF0ZSA9IG1ha2VUZW1wbGF0ZShzb3VyY2UpO1xyXG4gIGNvbnN0IHJlc3VsdCA9IHRlbXBsYXRlKHtcclxuICAgIGNvbW1vbk5hbWUsXHJcbiAgICBhbHROYW1lczogaW5jbHVkZVdpbGRjYXJkcyhbY29tbW9uTmFtZSwgLi4uYWx0ZXJuYXRpdmVOYW1lc10pXHJcbiAgfSk7XHJcbiAgd3JpdGVGaWxlKHRtcEZpbGUsIGVvbC5hdXRvKHJlc3VsdCkpO1xyXG4gIGF3YWl0IGNiKHRtcEZpbGUpO1xyXG4gIHVubGlua1N5bmModG1wRmlsZSk7XHJcbiAgdG1wLnJlbW92ZUNhbGxiYWNrKCk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3aXRoRG9tYWluQ2VydGlmaWNhdGVDb25maWcoXHJcbiAgY29tbW9uTmFtZTogc3RyaW5nLFxyXG4gIGFsdGVybmF0aXZlTmFtZXM6IHN0cmluZ1tdLFxyXG4gIGNiOiAoZmlsZXBhdGg6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPiB8IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgdG1wID0gdG1wRGlyKCk7XHJcbiAgY29uc3QgdG1wRmlsZSA9IHBhdGguam9pbih0bXAubmFtZSwgJ2NhLmNmZycpO1xyXG4gIGNvbnN0IHNvdXJjZSA9IHJlYWRGaWxlKFxyXG4gICAgcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL29wZW5zc2wtY29uZmlndXJhdGlvbnMvZG9tYWluLWNlcnRpZmljYXRlcy5jb25mJyksXHJcbiAgICAndXRmLTgnXHJcbiAgKTtcclxuICBjb25zdCB0ZW1wbGF0ZSA9IG1ha2VUZW1wbGF0ZShzb3VyY2UpO1xyXG4gIGNvbnN0IHJlc3VsdCA9IHRlbXBsYXRlKHtcclxuICAgIGNvbW1vbk5hbWUsXHJcbiAgICBhbHROYW1lczogaW5jbHVkZVdpbGRjYXJkcyhbY29tbW9uTmFtZSwgLi4uYWx0ZXJuYXRpdmVOYW1lc10pLFxyXG4gICAgc2VyaWFsRmlsZTogb3BlbnNzbFNlcmlhbEZpbGVQYXRoLFxyXG4gICAgZGF0YWJhc2VGaWxlOiBvcGVuc3NsRGF0YWJhc2VGaWxlUGF0aCxcclxuICAgIGRvbWFpbkRpcjogcGF0aEZvckRvbWFpbihjb21tb25OYW1lKVxyXG4gIH0pO1xyXG4gIHdyaXRlRmlsZSh0bXBGaWxlLCBlb2wuYXV0byhyZXN1bHQpKTtcclxuICBhd2FpdCBjYih0bXBGaWxlKTtcclxuICB1bmxpbmtTeW5jKHRtcEZpbGUpO1xyXG4gIHRtcC5yZW1vdmVDYWxsYmFjaygpO1xyXG59XHJcblxyXG4vLyBjb25mVGVtcGxhdGUgPSBjb25mVGVtcGxhdGUucmVwbGFjZSgvREFUQUJBU0VfUEFUSC8sIGNvbmZpZ1BhdGgoJ2luZGV4LnR4dCcpLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykpO1xyXG4vLyBjb25mVGVtcGxhdGUgPSBjb25mVGVtcGxhdGUucmVwbGFjZSgvU0VSSUFMX1BBVEgvLCBjb25maWdQYXRoKCdzZXJpYWwnKS5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpKTtcclxuLy8gY29uZlRlbXBsYXRlID0gZW9sLmF1dG8oY29uZlRlbXBsYXRlKTtcclxuXHJcbmV4cG9ydCBjb25zdCByb290Q0FEaXIgPSBjb25maWdQYXRoKCdjZXJ0aWZpY2F0ZS1hdXRob3JpdHknKTtcclxuZXhwb3J0IGNvbnN0IHJvb3RDQUtleVBhdGggPSBwYXRoLmpvaW4ocm9vdENBRGlyLCAncHJpdmF0ZS1rZXkua2V5Jyk7XHJcbmV4cG9ydCBjb25zdCByb290Q0FDZXJ0UGF0aCA9IHBhdGguam9pbihyb290Q0FEaXIsICdjZXJ0aWZpY2F0ZS5jZXJ0Jyk7XHJcblxyXG5kZWJ1Zygncm9vdENBQ2VydFBhdGgnLCByb290Q0FDZXJ0UGF0aCk7XHJcbmRlYnVnKCdyb290Q0FLZXlQYXRoJywgcm9vdENBS2V5UGF0aCk7XHJcbmRlYnVnKCdyb290Q0FEaXInLCByb290Q0FEaXIpO1xyXG5cclxuLy8gRXhwb3NlZCBmb3IgdW5pbnN0YWxsYXRpb24gcHVycG9zZXMuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRMZWdhY3lDb25maWdEaXIoKTogc3RyaW5nIHtcclxuICBpZiAoaXNXaW5kb3dzICYmIHByb2Nlc3MuZW52LkxPQ0FMQVBQREFUQSkge1xyXG4gICAgcmV0dXJuIHBhdGguam9pbihwcm9jZXNzLmVudi5MT0NBTEFQUERBVEEsICdkZXZjZXJ0JywgJ2NvbmZpZycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zdCB1aWQgPSBwcm9jZXNzLmdldHVpZCAmJiBwcm9jZXNzLmdldHVpZCgpO1xyXG4gICAgY29uc3QgdXNlckhvbWUgPVxyXG4gICAgICBpc0xpbnV4ICYmIHVpZCA9PT0gMFxyXG4gICAgICAgID8gcGF0aC5yZXNvbHZlKCcvdXNyL2xvY2FsL3NoYXJlJylcclxuICAgICAgICA6IHJlcXVpcmUoJ29zJykuaG9tZWRpcigpO1xyXG4gICAgcmV0dXJuIHBhdGguam9pbih1c2VySG9tZSwgJy5jb25maWcnLCAnZGV2Y2VydCcpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZUNvbmZpZ0RpcnMoKTogdm9pZCB7XHJcbiAgbWtkaXJwKGNvbmZpZ0Rpcik7XHJcbiAgbWtkaXJwKGRvbWFpbnNEaXIpO1xyXG4gIG1rZGlycChyb290Q0FEaXIpO1xyXG59XHJcblxyXG5lbnN1cmVDb25maWdEaXJzKCk7XHJcbiJdfQ==