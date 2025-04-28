import { noise } from "@chainsafe/libp2p-noise";
import { tls } from "@libp2p/tls";
import { yamux } from "@chainsafe/libp2p-yamux";
import { createDelegatedRoutingV1HttpApiClient } from "@helia/delegated-routing-v1-http-api-client";
import { delegatedHTTPRoutingDefaults } from "@helia/routers";
import { autoNAT } from "@libp2p/autonat";
import { bootstrap } from "@libp2p/bootstrap";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { dcutr } from "@libp2p/dcutr";
import { identify, identifyPush } from "@libp2p/identify";
import { kadDHT, removePrivateAddressesMapper } from "@libp2p/kad-dht";
import { ping } from "@libp2p/ping";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { ipnsSelector } from "ipns/selector";
import { ipnsValidator } from "ipns/validator";
import * as filters from "@libp2p/websockets/filters";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { webTransport } from "@libp2p/webtransport";

export function CreateLibp2pOptionsBrowser() {
  return {
    // addresses: {
    //   listen: ["/p2p-circuit", "/webrtc"],
    // },
    transports: [
      // circuitRelayTransport(),
      // webRTC(),
      // webRTCDirect(),
      // webTransport(),
      webSockets({
        filter: filters.all,
      }),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: () => false,
    },
    connectionManager: {
      // With the latest version of libp2p the timeouts for stream upgrades seems to be too aggresive
      // https://github.com/libp2p/js-libp2p/issues/2897#issuecomment-2674706509
      inboundStreamProtocolNegotiationTimeout: 1e4,
      inboundUpgradeTimeout: 1e4,
      outboundStreamProtocolNegotiationTimeout: 1e4,
      outboundUpgradeTimeout: 1e4,
    },
    peerDiscovery: [
      pubsubPeerDiscovery({
        interval: 1000,
        topics: [
          "bitxenia._peer-discovery._p2p._pubsub",
          "_peer-discovery._p2p._pubsub",
        ],
        listenOnly: false,
      }),
      bootstrap({
        // We use the default list of bootstrap nodes, found in the helia repo:
        // https://github.com/ipfs/helia/blob/main/packages/helia/src/utils/bootstrappers.js
        list: [
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
          // va1 is not in the TXT records for _dnsaddr.bootstrap.libp2p.io yet
          // so use the host name directly
          "/dnsaddr/va1.bootstrap.libp2p.io/p2p/12D3KooWKnDdG3iXw9eTFijk3EWSunZcFi54Zka4wmtqtt6rPxc8",
          "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
        ],
      }),
    ],
    services: {
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
      }),
      autoNAT: autoNAT(),
      dcutr: dcutr(),
      delegatedRouting: () =>
        createDelegatedRoutingV1HttpApiClient(
          "https://delegated-ipfs.dev",
          delegatedHTTPRoutingDefaults()
        ),
      dht: kadDHT({
        // https://github.com/libp2p/js-libp2p/tree/main/packages/kad-dht#example---connecting-to-the-ipfs-amino-dht
        protocol: "/ipfs/kad/1.0.0",
        peerInfoMapper: removePrivateAddressesMapper,
        // Server mode makes the node unable to receive connections, I think it is becuase it is always full.
        // We do not need server mode anyway.
        clientMode: true,
        validators: {
          ipns: ipnsValidator,
        },
        selectors: {
          ipns: ipnsSelector,
        },
      }),
      identify: identify(),
      identifyPush: identifyPush(),
      ping: ping(),
    },
  };
}
