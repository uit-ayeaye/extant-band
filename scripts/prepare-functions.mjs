// Netlify Functions run on Linux x64. Include Sharp's matching prebuilt binaries
// even when packaging from macOS. npm ci restores host-native dependencies later.
import {execFileSync} from 'node:child_process';
if(process.platform!=='linux'||process.arch!=='x64') {
 execFileSync('npm',['install','--os=linux','--cpu=x64','--include=optional','--ignore-scripts','--package-lock=false'],{stdio:'inherit'});
}
