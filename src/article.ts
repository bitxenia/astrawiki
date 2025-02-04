import { type OrbitDB } from "@orbitdb/core";

export class Article {
  articleName: string;
  articleAddress: string;
  orbitdb: OrbitDB;
  articleDB: any;
  initialized: boolean | undefined;

  constructor(articleName: string, articleAddress: string, orbitdb: OrbitDB) {
    this.articleName = articleName;
    this.articleAddress = articleAddress;
    this.orbitdb = orbitdb;
    this.initialized = false;
  }

  public async init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // TODO: Handle the case where the database doesn't exist.
    //       This could be happening if the database existed but the peer was offline.
    this.articleDB = await this.orbitdb.open(this.articleAddress);

    await this.set_up_db_events();
  }

  private async set_up_db_events() {
    this.articleDB.events.on("update", async (entry) => {
      console.log(`New entry for article ${this.articleName}`);
    });
  }
}
