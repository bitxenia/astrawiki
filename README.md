# IPFS Wiki Node

The Bitxenia IPFS wiki node is an implementation of a client for a decentralized peer-to-peer wiki within the [IPFS](https://ipfs.tech) ecosystem. It leverages technologies such as [OrbitDB](https://github.com/orbitdb/orbitdb) for the database and [LibP2P](https://github.com/libp2p/js-libp2p) for peer-to-peer communication between collaborators. With this node, users can connect to an existing wiki or create their own.  

The implementation focuses on providing a decentralized, distributed, and collaborative alternative to existing wikis. For this reason, only the collaborative nodes are responsible for the availability and persistence of the wiki.  

To achieve true decentralization, all nodes that make up the wiki share the same responsibilities, making it easy to create or maintain a wiki separate from the one provided by Bitxenia. Additionally, no wiki depends on its original creators.  

By using OrbitDB as a database, any user can create and edit articles in real-time.  

A *frontend* client can be built using the node to make the wiki more accessible. The node can be used locally or from a web application. At Bitxenia, we provide our own [web client](https://github.com/bitxenia/rc), but users are free to create their own if desired.

## Install
```
npm install @bitxenia/ipfs-wiki-node
```

## Usage
Using the `createIpfsWikiNode` init function you can create and connect a node to a wiki.
```ts
import { createIpfsWikiNode } from "@bitxenia/ipfs-wiki-node";

const node = await createIpfsWikiNode({
  wikiName: "bitxenia-wiki"
});

const articleList = await node.getArticleList()
console.log(articleList);
```
Use the [Getting Started](https://github.com/bitxenia/ipfs-wiki-node/tree/main/docs/getting_started.md) guide for an initial introduction to the IPFS Wiki Node usage.

## Documentation

You can find more advanced topics in our [docs](https://github.com/bitxenia/ipfs-wiki-node/tree/main/docs).

## Development

### Run Tests
```
npm run test
```

### Build
```
npm run build
```

## Contribute
Contributions welcome! Please check out the issues.

## Troubleshooting

### The node cannot receive incoming connections and, as a result, cannot collaborate.
If the node is set to collaborate and it fails to do so, the reason should most likely be a port issue. The `LibP2P` implementation uses `UPnP` to automatically open ports and detect the public IP. If the modem is outdated, you will need to manually open the ports and specify the public IP when creating the node in the `createIpfsWikiNode` init function.

The ports that need to be opened manually are:
- `4001` used to receive `TCP` incoming connections.
- `4002` used to receive `WebSocket` incoming connections.
- `4003` used to receive `WebSocketSecure` upgraded by `autoTLS` incoming connections.

If this does not work, your ISP may be using Double NAT, which prevents incoming connections. In this case, you may need to contact your ISP to request a solution.

## License
MIT (LICENSE-MIT / http://opensource.org/licenses/MIT)
