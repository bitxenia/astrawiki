/**
 * @module IpfsWikiNode
 * @description Provides an interface for users to interact with IpfsWikiNode.
 */
import { IpfsWikiNodeP2P } from "./ipfs-wiki-node.ts";

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
   * Stops the IpfsWikiNode node
   */
  stop(): Promise<void>;

  /**
   * Gets an existing article
   */
  getArticle(articleName: string): Promise<void>;

  /**
   * Creates a new article
   */
  newArticle(articleName: string): Promise<void>;

  /**
   * Edits an existing article
   */
  editArticle(): Promise<void>;

  getArticleList(): Promise<void>;

  /**
   * Stops the IpfsWikiNode node
   */
  stop(): Promise<void>;
}
