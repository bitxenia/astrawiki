import { ArticleInfo } from "./index.js";
import { ArticleRepository } from "./articleRepository.js";
import { Astrawiki } from "./index.js";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";
import { AstraDb, createAstraDb } from "@bitxenia/astradb";

export class AstrawikiNode implements Astrawiki {
  wikiName: string;
  astraDb: AstraDb;
  articleRepository: ArticleRepository;

  constructor(wikiName: string) {
    this.wikiName = wikiName;
  }

  public async init(
    isCollaborator: boolean,
    datastore: Datastore,
    blockstore: Blockstore,
    publicIP: string
  ): Promise<void> {
    this.astraDb = await createAstraDb({
      dbName: this.wikiName,
      isCollaborator: isCollaborator,
      datastore: datastore,
      blockstore: blockstore,
      publicIP: publicIP,
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
