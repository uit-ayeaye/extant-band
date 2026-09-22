// Netlify Functions run on Linux x64. Include Sharp's matching prebuilt binaries
// even when packaging from macOS. npm ci restores host-native dependencies later.
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
if(process.platform!=='linux'||process.arch!=='x64') {
 execFileSync('npm',['install','--os=linux','--cpu=x64','--libc=glibc','--include=optional','--ignore-scripts','--package-lock=false'],{stdio:'inherit'});
}
// Fail before deploying if npm omitted either native runtime package.
const require=createRequire(import.meta.url);
require.resolve('@img/sharp-linux-x64/sharp.node');
require.resolve('@img/sharp-libvips-linux-x64/binary');
