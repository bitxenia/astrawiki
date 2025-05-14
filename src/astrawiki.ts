import { ArticleInfo, AstrawikiInit } from "./index.js";
import { ArticleRepository } from "./articleRepository.js";
import { Astrawiki } from "./index.js";
import { AstraDb, createAstraDb } from "@bitxenia/astradb";

export class AstrawikiNode implements Astrawiki {
  wikiName: string;
  astraDb: AstraDb;
  articleRepository: ArticleRepository;

  constructor(wikiName: string) {
    this.wikiName = wikiName;
  }

  public async init(init: AstrawikiInit): Promise<void> {
    this.astraDb = await createAstraDb({
      dbName: this.wikiName,
      isCollaborator: init.isCollaborator,
      datastore: init.datastore,
      blockstore: init.blockstore,
      publicIp: init.publicIp,
      tcpPort: init.tcpPort,
      wsPort: init.wsPort,
      wssPort: init.wssPort,
      webRTCDirectPort: init.webRTCDirectPort,
      dataDir: init.dataDir,
      bootstrapPeers: init.bootstrapPeers,
      offlineMode: init.offlineMode,
    });

    this.articleRepository = new ArticleRepository(this.wikiName, this.astraDb);
  }

  public async getArticle(
    articleName: string,
    articleVersionID?: string
  ): Promise<ArticleInfo> {
    console.log(`Fetching article ${articleName}`);
    const article = await this.articleRepository.getArticle(
      articleName,
      articleVersionID
    );
    console.log(`Article ${articleName} fetched`);
    return article;
  }

  public async newArticle(
    articleName: string,
    articleContent: string
  ): Promise<void> {
    console.log(`Creating article ${articleName}`);
    await this.articleRepository.newArticle(articleName, articleContent);
    console.log(`Article ${articleName} created`);
  }

  public async editArticle(
    articleName: string,
    newArticleContent: string
  ): Promise<void> {
    console.log(`Editing article ${articleName}`);
    await this.articleRepository.editArticle(articleName, newArticleContent);
    console.log(`Article ${articleName} edited`);
  }

  public async getArticleList(): Promise<string[]> {
    return await this.articleRepository.getArticleList();
  }
}
