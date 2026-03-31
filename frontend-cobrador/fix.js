const fs=require("fs");let c=fs.readFileSync("src/pages/Login.js","utf8");c=c.replace(/abel style=/g,"abel style=");fs.writeFileSync("src/pages/Login.js",c,"utf8");console.log("OK");
