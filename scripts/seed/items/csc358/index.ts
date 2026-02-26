import type { ItemDef } from '../../types'

export const CSC358_ITEMS: ItemDef[] = [
  // ─── CSC358: Computer Networks (Fall 2024) ────────────────────────────────────
  {
    moduleKey: 'CSC358_Fall 2024::Network Layers & Protocols',
    externalQuestionId: 'CSC358-NL-001',
    bloom: 'REMEMBER',
    stem: 'Which layer of the OSI model is responsible for end-to-end logical addressing (IP addresses)?',
    reference: 'Kurose & Ross, Computer Networking, 8th Ed.',
    irtA: 0.80, irtB: -1.0, irtC: 0.22,
    options: [
      { label: 'A', text: 'Data Link Layer (Layer 2)', justification: 'Layer 2 uses MAC addresses for local (LAN) addressing.', isCorrect: false },
      { label: 'B', text: 'Network Layer (Layer 3)', justification: 'The Network Layer (e.g., IP protocol) handles logical addressing and routing between networks.', isCorrect: true },
      { label: 'C', text: 'Transport Layer (Layer 4)', justification: 'The Transport Layer handles end-to-end communication (ports, reliability); IP addressing is Layer 3.', isCorrect: false },
      { label: 'D', text: 'Application Layer (Layer 7)', justification: 'The Application Layer handles protocols like HTTP, DNS; IP addressing is handled at Layer 3.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC358_Fall 2024::Network Layers & Protocols',
    externalQuestionId: 'CSC358-NL-002',
    bloom: 'UNDERSTAND',
    stem: 'What does ARP (Address Resolution Protocol) do?',
    reference: 'Kurose & Ross, Computer Networking, 8th Ed.',
    irtA: 0.95, irtB: -0.3, irtC: 0.20,
    options: [
      { label: 'A', text: 'Translates domain names to IP addresses', justification: 'That is DNS, not ARP.', isCorrect: false },
      { label: 'B', text: 'Maps an IP address to the corresponding MAC address on a local network', justification: 'ARP broadcasts a request for the MAC address associated with a given IP address on the local subnet.', isCorrect: true },
      { label: 'C', text: 'Assigns IP addresses dynamically to hosts', justification: 'That is DHCP, not ARP.', isCorrect: false },
      { label: 'D', text: 'Encrypts packets for secure transmission', justification: 'Encryption is handled by TLS/IPsec, not ARP.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC358_Fall 2024::Transport & Application Layer',
    externalQuestionId: 'CSC358-TA-001',
    bloom: 'UNDERSTAND',
    stem: 'What is the purpose of the TCP three-way handshake?',
    reference: 'Kurose & Ross, Computer Networking, 8th Ed.',
    irtA: 0.98, irtB: -0.4, irtC: 0.20,
    options: [
      { label: 'A', text: 'To encrypt the connection before data transfer', justification: 'The TCP handshake establishes a connection; encryption is handled by TLS on top of TCP.', isCorrect: false },
      { label: 'B', text: 'To establish a reliable connection by synchronizing sequence numbers between client and server', justification: 'SYN → SYN-ACK → ACK synchronizes initial sequence numbers, confirming both sides can send and receive before data transfer.', isCorrect: true },
      { label: 'C', text: 'To negotiate the maximum transmission unit (MTU)', justification: 'MTU is negotiated via path MTU discovery, not the TCP handshake.', isCorrect: false },
      { label: 'D', text: 'To authenticate the identities of client and server', justification: 'Authentication is performed by higher-layer protocols like TLS; the TCP handshake only establishes connectivity.', isCorrect: false },
    ],
  },
  {
    moduleKey: 'CSC358_Fall 2024::Transport & Application Layer',
    externalQuestionId: 'CSC358-TA-002',
    bloom: 'REMEMBER',
    stem: 'Which transport layer protocol provides connectionless, low-overhead communication without guaranteed delivery?',
    reference: 'Kurose & Ross, Computer Networking, 8th Ed.',
    irtA: 0.75, irtB: -1.1, irtC: 0.22,
    options: [
      { label: 'A', text: 'TCP', justification: 'TCP is connection-oriented and provides reliable, ordered delivery.', isCorrect: false },
      { label: 'B', text: 'UDP', justification: 'UDP sends datagrams without connection setup, acknowledgment, or ordering — useful for low-latency applications like DNS and streaming.', isCorrect: true },
      { label: 'C', text: 'HTTP', justification: 'HTTP is an application layer protocol; it runs on top of TCP.', isCorrect: false },
      { label: 'D', text: 'IP', justification: 'IP is a network layer protocol, not a transport layer protocol.', isCorrect: false },
    ],
  },
]
