export enum ClientKind {
  ByzanlinkBundler = "ByzanlinkBundler",
  Stackup = "Stackup",
  Infinitism = "Infitinism",
  Voltaire = "Voltaire",
  Unknown = "Unknown",
}

export function clientFromAgentVersion(agentVersion: string): ClientKind {
  const slashIndex = agentVersion.indexOf("/");
  const agent =
    slashIndex >= 0 ? agentVersion.slice(0, slashIndex) : agentVersion;
  const agentLC = agent.toLowerCase();
  if (agentLC === "byzanlink-bundler" || agentLC === "js-libp2p")
    return ClientKind.ByzanlinkBundler;
  return ClientKind.Unknown;
}
