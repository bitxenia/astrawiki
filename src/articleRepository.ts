import { type OrbitDB, IPFSAccessController } from "@orbitdb/core";
import { CID } from "multiformats/cid";
import { Article } from "./article.ts";

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

    await this.startDBServices();

    await this.setupDbEvents();
  }

  private async startDBServices() {
    // Servicies are long running tasks, we don't need to await them

    this.startArticleReplicationService();
    // this.startConnectToProvidersService();
    // this.startProvideDBService();
  }

  private async startArticleReplicationService() {
    // Because of orbitdb eventual consistency nature, we need to keep if new articles were added
    // when we sync with other peers. This is because not all the entry sync updates trigger the
    // "update" event. Only the latest entry is triggered. JP
    while (true) {
      for await (const record of this.articleRepositoryDB.iterator()) {
        let [articleName, articleAddress] = record.value.split("::");
        // If we already have the article replicated, skip it
        if (this.articles.has(articleName)) {
          continue;
        }
        await this.replicateArticle(articleName, articleAddress);
      }
      // Wait 60 seconds before searching for new articles
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  private async startConnectToProvidersService() {
    const cid = this.getDBAddressCID();

    while (true) {
      try {
        let providers =
          await this.articleRepositoryDB.ipfs.libp2p.contentRouting.findProviders(
            cid
          );
        for await (const provider of providers) {
          console.log(`Connecting to provider: ${provider.id}`);
          try {
            await this.orbitdb.ipfs.libp2p.dial(provider.id);
          } catch (error) {
            console.error(
              `Error connecting to provider ${provider.id}: ${error}`
            );
          }
        }
      } catch (error) {
        console.error("Error finding providers:", error);
      }
      // Wait 60 seconds before searching for providers again
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  private async startProvideDBService() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p. JP
    // TODO: See if we need to also provide the file, we could be getting "banned" from the network. JP
    const cid = this.getDBAddressCID();

    // TODO: Find a better way to provide & reprovide the database. JP
    while (true) {
      try {
        console.log("Providing database address");
        const startTime = performance.now();
        await this.orbitdb.ipfs.routing.provide(cid);
        const endTime = performance.now();

        console.log(
          `Database address provided, took ${
            (endTime - startTime) / 1000
          } seconds`
        );
      } catch (error) {
        console.error("Error providing database:", error);
      }
      // Wait 60 seconds before providing the database again
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  private async setupDbEvents() {
    this.articleRepositoryDB.events.on("update", async (entry) => {
      let [articleName, articleAddress] = entry.payload.value.split("::");
      await this.replicateArticle(articleName, articleAddress);
    });

    this.articleRepositoryDB.events.on("join", async (peerId, heads) => {
      console.log(`${peerId} joined`);
    });
    this.articleRepositoryDB.events.on("leave", async (peerId) => {
      console.log(`${peerId} left`);
    });
  }

  private async replicateArticle(articleName: string, articleAddress: string) {
    console.log(
      `New article received: name: ${articleName}, addr: ${articleAddress}. Replicating...`
    );

    // TODO: Maybe is it better to use voyager for replicating the individual articles db?
    const article = new Article(articleName, articleAddress, this.orbitdb);
    await article.init();
    console.log(`Article ${articleName} replicated`);

    this.articles.set(articleName, article);
  }

  private getDBAddressCID() {
    const [_, cid]: string = this.articleRepositoryDB.address.split("/");
    return CID.parse(cid);
  }
}
