import { ArticleInfo } from "./index.js";
import { startOrbitDb } from "./utils/startOrbitdb.js";
import { ArticleRepository } from "./articleRepository.js";
import { AstrawikiNode as AstrawikiNode } from "./index.js";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

export class AstrawikiNodeP2P implements AstrawikiNode {
  articleRepository: ArticleRepository;

  public async start(
    wikiName: string,
    isCollaborator: boolean,
    datastore: Datastore,
    blockstore: Blockstore,
    publicIP: string
  ): Promise<void> {
    if (isCollaborator) {
      if (!datastore || !blockstore) {
        throw new Error(
          "A collaborator node should use a persistent datastore and blockstore."
        );
      }
    }
    const orbitdb = await startOrbitDb(datastore, blockstore, publicIP);

    this.articleRepository = new ArticleRepository(
      orbitdb,
      wikiName,
      isCollaborator
    );
    await this.articleRepository.init();
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

  public async stop(): Promise<void> {
    // TODO: Implement?
  }
}
