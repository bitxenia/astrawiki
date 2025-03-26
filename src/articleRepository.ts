import {
  type OrbitDB,
  ComposedStorage,
  IPFSAccessController,
  IPFSBlockStorage,
  LRUStorage,
} from "@orbitdb/core";
import { CID } from "multiformats/cid";
import { Article } from "./article.js";
import { VersionID } from "./version.js";
import { ArticleInfo } from "./index.js";

export class ArticleRepository {
  orbitdb: OrbitDB;
  wikiName: string;
  isCollaborator: boolean;
  articleRepositoryDB: any;
  initialized: boolean | undefined;
  articleAddressByName: Map<string, string>;
  lastVersionFetchedByArticle: Map<string, VersionID>;
  articlesReplicated: Map<string, Article>;

  constructor(orbitdb: OrbitDB, wikiName: string, isCollaborator: boolean) {
    this.orbitdb = orbitdb;
    this.wikiName = wikiName;
    this.isCollaborator = isCollaborator;
    this.initialized = false;
    this.articleAddressByName = new Map();
    this.lastVersionFetchedByArticle = new Map();
    this.articlesReplicated = new Map();
  }

  public async init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Since the db address should never change, we can always create the database instead of opening it, and then
    // use the address to look for providers and synchronize it.
    await this.createArticleRepositoryDB();

    // We see if the database already exist by trying to connect to other providers. If we do not find any
    // we asume the database did not exist, but we should also continue to look for providers after.
    await this.connectToProviders();

    await this.startDBServices();
    await this.setupDbEvents();
  }

  public async getArticle(
    articleName: string,
    articleVersionID?: string
  ): Promise<ArticleInfo> {
    // Iterate over the records in the article repository database to find the article

    // Article protocol:
    // <article-name>::<orbitdb_article_address>
    // TODO: Implement a better protocol.
    const articleAddress = this.articleAddressByName.get(articleName);
    if (!articleAddress) {
      throw Error(`Article ${articleName} not found`);
    }
    const article = new Article(articleName, this.orbitdb);
    await article.initExisting(articleAddress);

    // Update the last version fetched.
    this.lastVersionFetchedByArticle[articleName] =
      article.getCurrentVersionID();

    const articleContent = article.getContent(articleVersionID);
    const articleVersions = article.getVersions();

    return {
      name: articleName,
      content: articleContent,
      versionsInfo: articleVersions,
    };
  }

  public async newArticle(articleName: string, articleContent: string) {
    // Check if the article already exists
    if (this.articleAddressByName.has(articleName)) {
      throw Error(`Article ${articleName} already exists`);
    }
    const article = new Article(articleName, this.orbitdb);
    const articleAdress = await article.initNew(articleContent);

    await this.articleRepositoryDB.add(articleName + "::" + articleAdress);
  }

  public async editArticle(
    articleName: string,
    newArticleContent: string
  ): Promise<void> {
    const articleAddress = this.articleAddressByName.get(articleName);
    if (!articleAddress) {
      throw Error(`Article ${articleName} not found`);
    }
    // TODO: See if somehow an edit to a not previously fetched article is possible.
    const lastVersionFetched =
      this.lastVersionFetchedByArticle.get(articleName);
    if (!lastVersionFetched) {
      throw Error(`Article ${articleName} was not previously fetched`);
    }
    const article = new Article(articleName, this.orbitdb);
    await article.initExisting(articleAddress);

    await article.newContent(newArticleContent, lastVersionFetched);
  }

  public async getArticleList(): Promise<string[]> {
    return Array.from(this.articleAddressByName.keys());
  }

  private async createArticleRepositoryDB() {
    // We use the default storage, found in:
    // https://github.com/orbitdb/orbitdb/blob/d290032ebf1692feee1985853b2c54d376bbfc82/src/access-controllers/ipfs.js#L56
    const storage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs: this.orbitdb.ipfs, pin: true })
    );

    // TODO: See if we need to search if the database exists first. JP
    this.articleRepositoryDB = await this.orbitdb.open(this.wikiName, {
      AccessController: IPFSAccessController({ write: ["*"], storage }),
    });
    console.log(`Database address: ${this.articleRepositoryDB.address}`);
  }

  private async connectToProviders() {
    const cid = this.getDBAddressCID();
    try {
      // TODO: If no providers are found we should have a timeout to stop searching.
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
  }

  private async startDBServices() {
    // Servicies are long running tasks, we don't need to await them
    this.startConnectToProvidersService();

    if (this.isCollaborator) {
      this.startArticleReplicationService();
      this.startProvideDBService();
    }
  }

  private async startArticleReplicationService() {
    // Because of orbitdb eventual consistency nature, we need to keep if new articles were added
    // when we sync with other peers. This is because not all the entry sync updates trigger the
    // "update" event. Only the latest entry is triggered. JP
    while (true) {
      for await (const record of this.articleRepositoryDB.iterator()) {
        let [articleName, articleAddress] = record.value.split("::");
        // If we already have the article replicated, skip it
        if (this.articlesReplicated.has(articleName)) {
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
      this.connectToProviders();
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
        console.log("Providing database address...");
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
      this.articleAddressByName.set(articleName, articleAddress);
      if (this.isCollaborator) {
        await this.replicateArticle(articleName, articleAddress);
      }
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
    // TODO: The article could not be currently available, we should handle this case better.
    try {
      const article = new Article(articleName, this.orbitdb);
      await article.initExisting(articleAddress);
      console.log(`Article ${articleName} replicated`);

      this.articlesReplicated.set(articleName, article);
    } catch (error) {
      console.error(
        `Error replicating article ${articleName}, article not found: ${error}`
      );
      return;
    }
  }

  private getDBAddressCID() {
    const [_, __, cid] = this.articleRepositoryDB.address.split("/");
    return CID.parse(cid);
  }
}
