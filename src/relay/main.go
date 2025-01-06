package main

import (
	"context"
	"log"
	"time"

	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/routing"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
	"github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	"github.com/libp2p/go-libp2p/p2p/security/noise"
	libp2ptls "github.com/libp2p/go-libp2p/p2p/security/tls"

	"fmt"
)

func main() {
	run()
}

func run() {
	// Set your own keypair
	priv, _, err := crypto.GenerateKeyPair(
		crypto.Ed25519, // Select your key type. Ed25519 are nice short
		-1,             // Select key length when possible (i.e. RSA).
	)
	if err != nil {
		panic(err)
	}

	var idht *dht.IpfsDHT

	connmgr, err := connmgr.NewConnManager(
		100, // Lowwater
		400, // HighWater,
		connmgr.WithGracePeriod(time.Minute),
	)
	if err != nil {
		panic(err)
	}
	node, err := libp2p.New(
		// Use the keypair we generated
		libp2p.Identity(priv),
		// Multiple listen addresses
		libp2p.ListenAddrStrings(
			"/ip4/0.0.0.0/tcp/4001",
			"/ip4/0.0.0.0/udp/4001/quic-v1",
			"/ip4/0.0.0.0/udp/4001/quic-v1/webtransport",
			"/ip4/0.0.0.0/udp/4001/webrtc-direct",
			"/ip6/::/tcp/4001",
			"/ip6/::/udp/4001/quic-v1",
			"/ip6/::/udp/4001/quic-v1/webtransport",
			"/ip6/::/udp/4001/webrtc-direct",
		),
		// support TLS connections
		libp2p.Security(libp2ptls.ID, libp2ptls.New),
		// support noise connections
		libp2p.Security(noise.ID, noise.New),
		// support any other default transports (TCP, QUIC, WebSockets, WebRTC-direct, WebTransport)
		libp2p.DefaultTransports,
		// Let's prevent our peer from having too many
		// connections by attaching a connection manager.
		libp2p.ConnectionManager(connmgr),
		// Attempt to open ports using uPNP for NATed hosts.
		libp2p.NATPortMap(),
		// Let this host use the DHT to find other hosts
		libp2p.Routing(func(h host.Host) (routing.PeerRouting, error) {
			idht, err = dht.New(context.Background(), h)
			return idht, err
		}),
		// If you want to help other peers to figure out if they are behind
		// NATs, you can launch the server-side of AutoNAT too (AutoRelay
		// already runs the client)
		//
		// This service is highly rate-limited and should not cause any
		// performance issues.
		libp2p.EnableNATService(),
	)
	if err != nil {
		panic(err)
	}

	ctx := context.Background()

	// This connects to public bootstrappers
	for _, addr := range dht.DefaultBootstrapPeers {
		pi, _ := peer.AddrInfoFromP2pAddr(addr)
		// We ignore errors as some bootstrap peers may be down
		// and that is fine.
		node.Connect(ctx, *pi)
	}

	// Configure the host to offer the circuit relay service.
	// Any host that is directly dialable in the network (or on the internet)
	// can offer a circuit relay service, this isn't just the job of
	// "dedicated" relay services.
	// In circuit relay v2 (which we're using here!) it is rate limited so that
	// any node can offer this service safely
	_, err = relay.New(node)
	if err != nil {
		log.Printf("Failed to instantiate the relay: %v", err)
		return
	}

	// print the node's listening addresses
	fmt.Println("Listen addresses:", node.Addrs())

	// make a while true
	for {
		fmt.Println("Listen addresses:", node.Addrs())
		// sleep for 10 seconds
		time.Sleep(10 * time.Second)
	}
}
