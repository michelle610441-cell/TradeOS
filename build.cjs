const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'index.html');
const code=['app.js','v4.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n').concat('\nbootV4();\n').replace(/<\/script/gi,'<\\/script');
const html=fs.readFileSync(p,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/,()=>'<script>\n'+code+'\n</script>');
fs.writeFileSync(p,html);
