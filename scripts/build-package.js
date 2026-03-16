const fs = require("fs");
const path = require("path");
const { models, commandModels } = require("./models");

const packagePath = path.join(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

// Update model dropdown data for each command's preferences
for (const command of pkg.commands) {
  for (const pref of command.preferences || []) {
    if (pref.type === "dropdown" && pref.name && pref.name.startsWith("model_")) {
      pref.data = commandModels;
    }
  }
}

// Update global model preference
for (const pref of pkg.preferences || []) {
  if (pref.name === "model" && pref.type === "dropdown") {
    pref.data = models;
  }
}

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("package.json updated successfully with", models.length, "models.");
