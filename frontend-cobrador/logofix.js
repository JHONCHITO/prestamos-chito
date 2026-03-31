const fs=require("fs");let c=fs.readFileSync("src/pages/Menu.js","utf8");c=c.replace(/>\s*\$\s*</g,">🏦<");fs.writeFileSync("src/pages/Menu.js",c,"utf8");console.log("OK");
