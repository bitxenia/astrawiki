import {
  type OrbitDB,
  ComposedStorage,
  IPFSAccessController,
  IPFSBlockStorage,
  LRUStorage,
} from "@orbitdb/core";
import { CID } from "multiformats/cid";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

class Database {
  orbitdb: OrbitDB;

  public async init() {}

  public async createDatabase(dbName: string) {
    const storage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs: this.orbitdb.ipfs, pin: true })
    );

    const db = await this.orbitdb.open(dbName, {
      AccessController: IPFSAccessController({
        write: ["*"],
        storage,
      }),
    });

    return db;
  }

  public async getDatabase(dbName: string) {
    const db = await this.orbitdb.open(dbName);
    return db;
  }

  public async close() {
    await this.orbitdb.stop();
    await this.orbitdb.ipfs.stop();
  }
}

export class ArticleRepositoryDatabase extends Database {
  public async init(orbitdb: OrbitDB, wikiName: string) {
    this.orbitdb = orbitdb;

    this.articleRepositoryDB = await this.createDatabase("article-repository", [
      "*",
    ]);
  }
}

export class ArticleDatabase extends Database {}
