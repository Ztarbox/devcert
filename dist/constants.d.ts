export declare const isMac: boolean;
export declare const isLinux: boolean;
export declare const isWindows: boolean;
export declare const configDir: string;
export declare const configPath: (...pathSegments: string[]) => string;
export declare const domainsDir: string;
export declare const caVersionFile: string;
export declare const opensslSerialFilePath: string;
export declare const opensslDatabaseFilePath: string;
export declare const caSelfSignConfig: string;
export declare function withDomainSigningRequestConfig(commonName: string, { alternativeNames }: {
    alternativeNames: string[];
}, cb: (filepath: string) => Promise<void> | void): Promise<void>;
export declare function withDomainCertificateConfig(commonName: string, alternativeNames: string[], cb: (filepath: string) => Promise<void> | void): Promise<void>;
export declare const rootCADir: string;
export declare const rootCAKeyPath: string;
export declare const rootCACertPath: string;
export declare function getLegacyConfigDir(): string;
export declare function ensureConfigDirs(): void;