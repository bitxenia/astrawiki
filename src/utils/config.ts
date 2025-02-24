import * as fs from "fs";

const CONFIG_PATH = "./config.json";
const EXAMPLE_CONFIG_PATH = "./config.example.json";

export class Config {
  wikiName: string;
  publicIP: string;

  constructor() {
    this.createConfigFromExample();
    this.loadConfig();
  }

  private createConfigFromExample() {
    if (fs.existsSync(CONFIG_PATH)) {
      // Config file already exists
      return;
    }
    // Config file doesn't exist
    // Copy the example config file to the path
    fs.copyFileSync(EXAMPLE_CONFIG_PATH, CONFIG_PATH);
  }

  private loadConfig() {
    // Open the json file and load the config
    let config = fs.readFileSync(CONFIG_PATH, "utf-8");
    let configJson = JSON.parse(config);
    this.wikiName = configJson.wiki_name;
    this.publicIP = configJson.public_ip;
  }
}
