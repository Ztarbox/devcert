import {
  readFileSync as readFile,
  writeFileSync as writeFile,
  unlinkSync
} from 'fs';
import * as createDebug from 'debug';

import {
  domainsDir,
  rootCADir,
  ensureConfigDirs,
  getLegacyConfigDir,
  rootCAKeyPath,
  rootCACertPath,
  caSelfSignConfig,
  opensslSerialFilePath,
  opensslDatabaseFilePath,
  caVersionFile
} from './constants';
import currentPlatform from './platforms';
import { openssl, tmpDir } from './utils';
import { generateKey } from './certificates';
import { Options, CertOptions } from './index';
import { join } from 'path';

const debug = createDebug('devcert:certificate-authority');

/**
 * Install the once-per-machine trusted root CA. We'll use this CA to sign
 * per-app certs.
 */
export default async function installCertificateAuthority(
  options: Options = {},
  certOptions: CertOptions
): Promise<void> {
  debug(
    `Uninstalling existing certificates, which will be void once any existing CA is gone`
  );
  uninstall();
  ensureConfigDirs();

  const tmp = tmpDir();
  debug(`Making a temp working directory for files to copied in`);
  const rootKeyPath = join(tmp.name, 'ca.key');

  debug(
    `Generating the OpenSSL configuration needed to setup the certificate authority`
  );
  seedConfigFiles();

  debug(`Generating a private key`);
  generateKey(rootKeyPath);

  debug(`Generating a CA certificate`);
  openssl(
    `req -new -x509 -config "${caSelfSignConfig}" -key "${rootKeyPath}" -out "${rootCACertPath}" -days ${certOptions.caCertExpiry}`,
    'generating CA CSR'
  );

  debug('Saving certificate authority credentials');
  await saveCertificateAuthorityCredentials(rootKeyPath);

  debug(`Adding the root certificate authority to trust stores`);
  await currentPlatform.addToTrustStores(rootCACertPath, options);
}

/**
 * Initializes the files OpenSSL needs to sign certificates as a certificate
 * authority, as well as our CA setup version
 */
function seedConfigFiles(): void {
  // This is v2 of the devcert certificate authority setup
  writeFile(caVersionFile, '2');
  // OpenSSL CA files
  writeFile(opensslDatabaseFilePath, '');
  writeFile(opensslSerialFilePath, '01');
}

export async function withCertificateAuthorityCredentials(
  cb: ({
    caKeyPath,
    caCertPath
  }: {
    caKeyPath: string;
    caCertPath: string;
  }) => Promise<void> | void
): Promise<void> {
  debug(`Retrieving devcert's certificate authority credentials`);
  const tmp = tmpDir();
  const caKeyPath = join(tmp.name, 'ca.key');
  const caKey = await currentPlatform.readProtectedFile(rootCAKeyPath);
  writeFile(caKeyPath, caKey);
  await cb({ caKeyPath, caCertPath: rootCACertPath });
  unlinkSync(caKeyPath);
  tmp.removeCallback();
}

async function saveCertificateAuthorityCredentials(
  keypath: string
): Promise<void> {
  debug(`Saving devcert's certificate authority credentials`);
  const key = readFile(keypath, 'utf-8');
  await currentPlatform.writeProtectedFile(rootCAKeyPath, key);
}

function certErrors(): string {
  try {
    openssl(
      `x509 -in "${rootCACertPath}" -noout`,
      'checking for certificate errors'
    );
    return '';
  } catch (e) {
    return e.toString();
  }
}

// This function helps to migrate from v1.0.x to >= v1.1.0.
/**
 * Smoothly migrate the certificate storage from v1.0.x to >= v1.1.0.
 * In v1.1.0 there are new options for retrieving the CA cert directly,
 * to help third-party Node apps trust the root CA.
 *
 * If a v1.0.x cert already exists, then devcert has written it with
 * platform.writeProtectedFile(), so an unprivileged readFile cannot access it.
 * Pre-detect and remedy this; it should only happen once per installation.
 */
export async function ensureCACertReadable(
  options: Options,
  certOptions: CertOptions
): Promise<void> {
  if (!certErrors()) {
    return;
  }
  /**
   * on windows, writeProtectedFile left the cert encrypted on *nix, the cert
   * has no read permissions either way, openssl will fail and that means we
   * have to fix it
   */
  try {
    const caFileContents = await currentPlatform.readProtectedFile(
      rootCACertPath
    );
    currentPlatform.deleteProtectedFiles(rootCACertPath);
    writeFile(rootCACertPath, caFileContents);
  } catch (e) {
    return installCertificateAuthority(options, certOptions);
  }

  // double check that we have a live one
  const remainingErrors = certErrors();
  if (remainingErrors) {
    return installCertificateAuthority(options, certOptions);
  }
}

/**
 * Remove as much of the devcert files and state as we can. This is necessary
 * when generating a new root certificate, and should be available to API
 * consumers as well.
 *
 * Not all of it will be removable. If certutil is not installed, we'll leave
 * Firefox alone. We try to remove files with maximum permissions, and if that
 * fails, we'll silently fail.
 *
 * It's also possible that the command to untrust will not work, and we'll
 * silently fail that as well; with no existing certificates anymore, the
 * security exposure there is minimal.
 *
 * @public
 */
export function uninstall(): void {
  currentPlatform.removeFromTrustStores(rootCACertPath);
  currentPlatform.deleteProtectedFiles(domainsDir);
  currentPlatform.deleteProtectedFiles(rootCADir);
  currentPlatform.deleteProtectedFiles(getLegacyConfigDir());
}
