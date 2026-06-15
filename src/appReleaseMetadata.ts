import packageJson from '../package.json'

export const appVersion = packageJson.version
export const appReleaseTag = `v${appVersion}-windows-x64-latest`
