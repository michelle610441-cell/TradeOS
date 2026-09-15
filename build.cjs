const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'index.html');
const code=fs.readFileSync(path.join(__dirname,'app.js'),'utf8').replace(/<\/script/gi,'<\\/script');
const html=fs.readFileSync(p,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/,()=>'<script>\n'+code+'\n</script>');
fs.writeFileSync(p,html);
