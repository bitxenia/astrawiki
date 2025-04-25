import { HeliaLibp2p } from "helia";
import { CID } from "multiformats/cid";
import { Peer, PeerId } from "@libp2p/interface";
import { UnixFS, unixfs } from "@helia/unixfs";

const ASTRAWIKI_PROTOCOL = "/ipfs/astrawiki";

export class ConnectionManager {
  private ipfs: HeliaLibp2p;
  private providerCID: CID;
  private fs: UnixFS;

  constructor(ipfs: HeliaLibp2p) {
    this.ipfs = ipfs;
  }

  public async init(wikiName: string, isCollaborator: boolean) {
    this.providerCID = await this.constructProviderCID(
      wikiName,
      isCollaborator
    );

    // Add astrawiki protocol to the libp2p node.
    this.ipfs.libp2p.handle(ASTRAWIKI_PROTOCOL, ({ stream }) => {
      console.log("Received connection from astrawiki peer");
    });

    this.startService(async () => {
      await this.connectToProviders();
    });

    this.setupEvents();
  }

  private async constructProviderCID(
    wikiName: string,
    isCollaborator: boolean
  ): Promise<CID> {
    // This is the CID used to identify the wiki.
    // We upload it to ipfs and provide it (if we are a collaborator) so other peers can find us.

    // TODO: We are adding this file to prevent getting banned from the network. See if this is needed.

    // create a filesystem on top of Helia, in this case it's UnixFS
    this.fs = unixfs(this.ipfs);

    // we will use this TextEncoder to turn strings into Uint8Arrays
    const encoder = new TextEncoder();

    // add the bytes to your node and receive a CID
    const cid = await this.fs.addBytes(encoder.encode(wikiName));

    // Check if the CID is already pinned. If not, pin it.
    if (!(await this.ipfs.pins.isPinned(cid))) {
      // Pin the block
      for await (const pinnedCid of this.ipfs.pins.add(cid)) {
        console.log(`Pinned CID: ${pinnedCid}`);
      }
    }

    console.log(`Provider CID created: ${cid}`);

    // We only want to provide the database if we are a collaborator.
    if (isCollaborator) {
      // We do not await to the provide to finish.
      this.provideDB(cid);
    }

    return cid;
  }

  private async provideDB(cid: CID): Promise<void> {
    // TODO: See if only colaborators should provide the database.

    /**
     * Helia will periodically re-provide every previously provided CID.
     * https://github.com/ipfs/helia/blob/bb2ab74e711ae67514397aa982e35031bdf6541f/packages/interface/src/routing.ts#L67
     */
    let provided = false;
    console.log("Providing CID address...");
    while (!provided) {
      try {
        const startTime = performance.now();
        await this.ipfs.routing.provide(cid);
        const endTime = performance.now();
        provided = true;

        console.log(
          `CID address provided, took ${(endTime - startTime) / 1000} seconds`
        );
      } catch (error) {
        console.error("Error providing CID:", error);
        console.log("Retrying provide...");
      }
    }
  }

  private async connectToProviders(): Promise<void> {
    // TODO: Check if we need to add a timeout.
    try {
      let providers = this.ipfs.libp2p.contentRouting.findProviders(
        this.providerCID
      );
      for await (const provider of providers) {
        try {
          // Check if the provider is us.
          if (provider.id.equals(this.ipfs.libp2p.peerId)) {
            // console.log("Provider is us, skipping...");
            continue;
          }
          // Check if we are already connected.
          if (this.ipfs.libp2p.getConnections(provider.id).length > 0) {
            // console.log(`Already connected to provider: ${provider.id}`);
            continue;
          }

          console.log(`New provider found, connecting to it: ${provider.id}`);

          this.ipfs.libp2p.dial(provider.id).catch((error) => {
            console.error(
              `Error connecting to provider ${provider.id}: ${error}`
            );
          });
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

  private setupEvents() {
    this.ipfs.libp2p.addEventListener("peer:connect", (evt) => {
      const peerId = evt.detail;
      this.manageNewConnection(peerId);
    });
  }

  private async manageNewConnection(peerId: PeerId) {
    let peerInfo: Peer;
    try {
      // TODO: See if peerstore is available when the event is triggered.
      peerInfo = await this.ipfs.libp2p.peerStore.get(peerId);
    } catch (error) {
      console.log(
        "Warning: Peer info not found, skipping peer. Triggered by: ",
        error
      );
      return;
    }

    // See if the peer is not an Astrawiki peer.
    if (!peerInfo.protocols.includes(ASTRAWIKI_PROTOCOL)) {
      return;
    }
    console.log(`Connected to astrawiki peer: ${peerId}`);

    // Tag the peer with a high priority to make sure we are connected to it.
    await this.ipfs.libp2p.peerStore.merge(peerId, {
      tags: {
        "my-tag": {
          value: 100, // 0-100 is the typical value range
        },
      },
    });
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
}
