import express from "express";
import {
  createAstrawikiNode,
  AstrawikiNode,
  AstrawikiNodeInit,
} from "@bitxenia/astrawiki";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BLOCKSTORE_DIR = path.resolve(
  __dirname,
  "./astrawiki_data/ipfs/block-store",
);
const DATASTORE_DIR = path.resolve(
  __dirname,
  "./astrawiki_data/ipfs/data-store",
);

const PORT = 31337;

let server: AstrawikiNode | null = null;

async function startService() {
  const app = express();
  const opts: AstrawikiNodeInit = {
    blockstore: new FsBlockstore(BLOCKSTORE_DIR),
    datastore: new FsDatastore(DATASTORE_DIR),
    // TODO: Add config file to set these two parameters (maybe containerized
    // version might break because of the public IP parameter?)
    isCollaborator: true,
    publicIP: "190.245.180.10",
  };

  server = await createAstrawikiNode(opts);

  app.get("/articles", async (req, res) => {
    if (!server) {
      res
        .status(400)
        .json({ message: "Server not running. Run astrawiki start" });
    } else {
      res.json({ articles: await server.getArticleList() });
    }
  });

  app.get("/", (req, res) => {
    res.json({ message: "Server running" });
  });

  app.listen(PORT, () => {
    console.log(`Astrawiki server running at http://localhost:${PORT}`);
  });
}

startService().catch((err) => {
  console.error("Failed to start Astrawiki service: ", err);
  process.exit(1);
});
