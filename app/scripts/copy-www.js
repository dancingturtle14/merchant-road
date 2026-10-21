const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "..", "prototype");
const dest = path.join(__dirname, "..", "www");
for (const f of ["index.html", "styles.css", "game.js"]) {
  fs.copyFileSync(path.join(src, f), path.join(dest, f));
  console.log("copied", f);
}
