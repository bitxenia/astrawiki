import { OrbitDB } from "@orbitdb/core";
import { Database } from "./database.js";
import { ArticleDatabase } from "./articleDatabase.js";
import { Article } from "../article.js";
import { CID } from "multiformats/cid";

export class ArticleRepositoryDatabase extends Database {
  wikiName: string;
  isCollaborator: boolean;
  articleNames: Set<string>;
  articleDBs: Map<string, ArticleDatabase>;
  dbAddressCID: CID;

  public async init(
    orbitdb: OrbitDB,
    wikiName: string,
    isCollaborator: boolean
  ) {
    this.orbitdb = orbitdb;
    this.wikiName = wikiName;
    this.isCollaborator = isCollaborator;
    this.articleNames = new Set();
    this.articleDBs = new Map();
    this.openDb = await this.createDatabase(wikiName);
    console.log(
      `Article repository database created with address ${this.openDb.address}`
    );
    this.dbAddressCID = this.getDBAddressCID();

    // Start connecting to providers.
    // We do not await for this to finish so it can run in the background.
    this.startService(async () => {
      await this.connectToProviders();
    });

    // TODO: Maybe add a flag to know if the database is new and we should not sync.
    const synced = await this.syncDb();

    if (!isCollaborator && !synced) {
      // If we are not a collaborator and no providers were found, we need to raise an error.
      // This is because a non collaborator node cannot create a new wiki.
      throw Error(`No providers found for the database ${this.openDb.address}`);
    }

    // We wait for the database to be updated.
    await this.updateDB();

    // Then we start the services.
    this.startService(async () => {
      await this.updateDB();
    });
    if (isCollaborator) {
      // We only provide the database if we are a collaborator.
      this.startService(async () => {
        await this.provideDB();
      });
    }
    await this.setupDbEvents();
  }

  public async getArticle(articleName: string): Promise<Article> {
    // Check if the article does not exist
    if (!this.articleNames.has(articleName)) {
      throw new Error(`Article ${articleName} not found`);
    }
    let articleDB: ArticleDatabase;
    if (this.articleDBs.has(articleName)) {
      // If we are a collaborator, or we already opened/created the article, we should already have the articleDB open.

      // TODO: This could cause a race condition if the article was just created.
      // Becuse we could not have the articleDB open yet in the updateDB function.
      // And creating a new one could also cause problems. Check this.
      articleDB = this.articleDBs.get(articleName);
    } else {
      // Else, we need to open the articleDB.
      articleDB = new ArticleDatabase();
      await articleDB.initExisting(this.orbitdb, this.wikiName, articleName);
    }
    const articleVersions = await articleDB.getVersions();
    const article = new Article(articleName, articleDB, articleVersions);

    // TODO: The new database needs to stay accessible for the collaborators to replicate it.
    //       See how to achieve this or change the responsibility of creating the database to
    //       the collaborators nodes.
    //       Every change is made without confirmation that it was replicated to the collaborators.
    //       To mitigate this we replicate permanently the article. Asuming non collaborators are
    //       temporary nodes, and should not stay too long in the network.
    this.articleDBs.set(articleName, articleDB);
    return article;
  }

  public async addArticle(
    articleName: string,
    articleContent: string
  ): Promise<void> {
    // Check if the article already exist
    if (this.articleNames.has(articleName)) {
      throw new Error(`Article ${articleName} already exists`);
    }

    const articleDB = new ArticleDatabase();
    await articleDB.initNew(this.orbitdb, this.wikiName, articleName);
    const article = new Article(articleName, articleDB, []);
    await article.newContent(articleContent);

    await this.openDb.add(articleName);
    this.articleNames.add(articleName);
    // TODO: The new database needs to stay accessible for the collaborators to replicate it.
    //       See how to achieve this or change the responsibility of creating the database to
    //       the collaborators nodes.
    //       Every change is made without confirmation that it was replicated to the collaborators.
    //       To mitigate this we replicate permanently the article. Asuming non collaborators are
    //       temporary nodes, and should not stay too long in the network.
    this.articleDBs.set(articleName, articleDB);
  }

  private async connectToProviders(): Promise<boolean> {
    let providersFound = false;

    // TODO: Check if we need to add a timeout.
    try {
      let providers =
        await this.orbitdb.ipfs.libp2p.contentRouting.findProviders(
          this.dbAddressCID
        );
      for await (const provider of providers) {
        providersFound = true;
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
    return providersFound;
  }

  private async provideDB() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p.
    // TODO: See if we need to also provide the "file", we could be getting "banned" from the network.
    const cid = this.getDBAddressCID();
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
  }

  private async updateDB() {
    // Because of orbitdb eventual consistency nature, we need to keep if new articles were added
    // when we sync with other peers. This is because not all the entry sync updates trigger the
    // "update" event. Only the latest entry is triggered.
    for await (const record of this.openDb.iterator()) {
      let articleName = record.value;
      // If we already have the article replicated, skip it
      if (this.articleNames.has(articleName)) {
        continue;
      }
      await this.newArticleFound(articleName);
    }
  }

  private async setupDbEvents() {
    this.openDb.events.on("update", async (entry) => {
      await this.newArticleFound(entry.payload.value);
    });

    this.openDb.events.on("join", async (peerId, heads) => {
      console.log(`${peerId} joined`);
    });
    this.openDb.events.on("leave", async (peerId) => {
      console.log(`${peerId} left`);
    });
  }

  private async newArticleFound(articleName: string) {
    console.log(`New article found: ${articleName}`);
    this.articleNames.add(articleName);
    // If we are a collaborator, replicate the article by keeping the articleDB open.
    if (this.isCollaborator) {
      const articleDb = new ArticleDatabase();
      await articleDb.initExisting(this.orbitdb, this.wikiName, articleName);
      this.articleDBs.set(articleName, articleDb);
      console.log(`Article ${articleName} replicated.`);
    }
  }

  private async startService(serviceFunction: () => Promise<void>) {
    // TODO: Find a better way to handle the service function. it should be stoppable.
    while (true) {
      try {
        await serviceFunction();
      } catch (error) {
        console.error("Error in service function:", error);
      }
      // Wait 60 seconds before running the service function again
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  private getDBAddressCID() {
    const [_, __, cid] = this.openDb.address.split("/");
    return CID.parse(cid);
  }
}
