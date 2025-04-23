import { OrbitDB } from "@orbitdb/core";
import { Database } from "./database.js";
import { ArticleDatabase } from "./articleDatabase.js";
import { Article } from "../article.js";
import { ConnectionManager } from "./connectionManager.js";
import { CID } from "multiformats/cid";

export class ArticleRepositoryDatabase extends Database {
  wikiName: string;
  isCollaborator: boolean;
  articleNames: Set<string>;
  articleDBs: Map<string, ArticleDatabase>;
  connectionManager: ConnectionManager;

  constructor(orbitdb: OrbitDB, wikiName: string, isCollaborator: boolean) {
    super(orbitdb);
    this.wikiName = wikiName;
    this.isCollaborator = isCollaborator;
    this.articleNames = new Set();
    this.articleDBs = new Map();
    this.connectionManager = new ConnectionManager(this.orbitdb.ipfs);
  }

  public async init() {
    // Start the connection manager.
    // This is used to manage and connect to other astrawikis peers.
    await this.connectionManager.init(this.wikiName, this.isCollaborator);

    this.openDb = await this.createDatabase(this.wikiName);
    console.log(
      `Article repository database created with address ${this.openDb.address}`
    );

    // TODO: Maybe add a flag to know if the database is new and we should not sync.
    const synced = await this.syncDb();

    if (!this.isCollaborator && !synced) {
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
      // Because we could not have the articleDB open yet in the updateDB function.
      // And creating a new one could also cause problems. Check this.
      articleDB = this.articleDBs.get(articleName);
    } else {
      // Else, we need to open the articleDB.
      articleDB = new ArticleDatabase(this.orbitdb, this.wikiName, articleName);
      await articleDB.initExisting();
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

    const articleDB = new ArticleDatabase(
      this.orbitdb,
      this.wikiName,
      articleName
    );
    await articleDB.initNew();
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
      const articleDb = new ArticleDatabase(
        this.orbitdb,
        this.wikiName,
        articleName
      );
      await articleDb.initExisting();
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
      // Wait 10 seconds before running the service function again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
