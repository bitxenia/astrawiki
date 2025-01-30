import { type OrbitDB, IPFSAccessController } from "@orbitdb/core";
import { CID } from "multiformats/cid";
import { Article } from "./article";

// TODO: Add a way to opt to use a different database name. JP
const ARTICLE_DB_NAME = "bitxenia-wiki";

export class ArticleRepository {
  orbitdb: OrbitDB;
  articleRepositoryDB: any;
  initialized: boolean | undefined;
  articles: Map<string, any>;

  constructor(orbitdb: OrbitDB) {
    this.orbitdb = orbitdb;
    this.initialized = false;
    this.articles = new Map();
  }

  public async init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // TODO: See if we need to search if the database exists first. JP
    this.articleRepositoryDB = await this.orbitdb.open(ARTICLE_DB_NAME, {
      AccessController: IPFSAccessController({ write: ["*"] }),
    });
    console.log(`Database address: ${this.articleRepositoryDB.address}`);

    // TODO: Search and connect to other providers before providing? JP

    // TODO: Maybe we do not need to wait for the db to be provided. JP
    // this.start_provide_db_service();

    await this.set_up_db_events();
  }

  private async start_provide_db_service() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p. JP
    // TODO: See if we need to also provide the file, we could be getting "banned" from the network. JP
    const parts: string = this.articleRepositoryDB.address.split("/");
    const cid = parts[2];
    const cidObj = CID.parse(cid);

    // TODO: Find a better way to provide & reprovide the database. JP
    while (true) {
      try {
        console.log("Providing database address:", cid);
        const startTime = performance.now();
        await this.orbitdb.ipfs.routing.provide(cidObj);
        const endTime = performance.now();

        console.log(
          `Database address ${cid} provided, took ${
            (endTime - startTime) / 1000
          } seconds`
        );
      } catch (error) {
        console.error("Error providing database:", error);
      }
    }
  }

  private async set_up_db_events() {
    this.articleRepositoryDB.events.on("update", async (entry) => {
      let [articleName, articleAddress] = entry.payload.value.split("::");
      console.log(
        `New article received: name: ${articleName}, addr: ${articleAddress}`
      );
      // Replicate the article
      // TODO: Maybe is it better to use voyager for replicating the individual articles db?
      const article = new Article(articleName, articleAddress, this.orbitdb);
      await article.init();

      this.articles.set(articleName, article);
    });

    this.articleRepositoryDB.events.on("join", async (peerId, heads) => {
      console.log(`${peerId} joined`);
    });
    this.articleRepositoryDB.events.on("leave", async (peerId) => {
      console.log(`${peerId} left`);
    });
  }
}
