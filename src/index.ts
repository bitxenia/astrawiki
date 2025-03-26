/**
 * @module IpfsWikiNode
 * @description Provides an interface for users to interact with IpfsWikiNode.
 */
import { IpfsWikiNodeP2P } from "./ipfs-wiki-node.js";

/**
 * Options used to create a IpfsWikiNode.
 */
export interface IpfsWikiNodeInit {
  /**
   * Wiki name is the wiki which the node connects to.
   * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki".
   */
  wikiName?: string;

  /**
   * The public ip of the node
   */
  publicIP?: string;

  /**
   * A collaborator is a node which helps with the availability and persistence of the wiki.
   * This means that the collaborator will replicate all the wiki's data, using its own storage.
   * Web browsers are not good candidates for collaborators, since they are not always online.
   * By default the node is not a collaborator.
   */
  isCollaborator?: boolean;
}

/**
 * Creates an instance of IpfsWikiNode.
 *
 * By default the node will connect to the Bitxenia wiki, which name is "bitxenia-wiki", except another name is passed by parameter
 *
 * The node is started by default.
 *
 * @function createIpfsWikiNode
 * @param {IpfsWikiNodeInit} init Options used to create a IpfsWikiNode
 * @instance
 */
export async function createIpfsWikiNode(
  init: IpfsWikiNodeInit = {}
): Promise<IpfsWikiNodeP2P> {
  const node = new IpfsWikiNodeP2P(init);
  await node.start();
  return node;
}

/**
 * The API presented by a IpfsWikiNode node
 */
export interface IpfsWikiNode {
  /**
   * Starts the IpfsWikiNode node
   */
  start(): Promise<void>;

  /**
   * Gets an existing article
   */
  getArticle(
    articleName: string,
    articleVersionID?: string
  ): Promise<ArticleInfo>;

  /**
   * Creates a new article
   */
  newArticle(articleName: string, articleContent: string): Promise<void>;

  /**
   * Edits an existing article
   */
  editArticle(articleName: string, newArticleContent: string): Promise<void>;

  getArticleList(): Promise<string[]>;

  /**
   * Stops the IpfsWikiNode node
   */
  stop(): Promise<void>;
}

export type VersionInfo = {
  id: string;
  date: string;
  parent: string | null;
  mainBranch: boolean;
};

export type ArticleInfo = {
  name: string;
  content: string;
  versionsInfo: VersionInfo[];
};
