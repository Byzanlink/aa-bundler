import { NetworkName } from "types/lib";
import { Wallet, providers } from "ethers";

export interface NetworkConfig {
  entryPoints: {
    [address: string]: EntryPointConfig;
  };
  rpcEndpoint: string;
  minInclusionDenominator: number;
  throttlingSlack: number;
  banSlack: number;
}

export interface EntryPointConfig {
  relayer: string;
  beneficiary: string;
}

export type Networks = {
  [network in NetworkName]?: NetworkConfig;
};

export interface ConfigOptions {
  networks: Networks;
}

export class Config {
  supportedNetworks: NetworkName[];
  networks: Networks;

  constructor(private config: ConfigOptions) {
    this.supportedNetworks = this.parseSupportedNetworks();
    this.networks = this.parseNetworkConfigs();
  }

  getNetworkProvider(network: NetworkName): providers.JsonRpcProvider | null {
    const conf = this.networks[network];
    return conf ? new providers.JsonRpcProvider(conf.rpcEndpoint) : null;
  }

  getEntryPointRelayer(network: NetworkName, address: string): Wallet | null {
    const conf = this.getEntryPointConfig(network, address);
    if (conf) {
      const provider = this.getNetworkProvider(network);
      if (!provider) {
        throw new Error("no provider");
      }
      return new Wallet(conf.relayer, provider);
    }
    return null;
  }

  getEntryBeneficiary(network: NetworkName, address: string): string | null {
    const conf = this.getEntryPointConfig(network, address);
    return conf ? conf.beneficiary : null;
  }

  getEntryPointConfig(
    network: NetworkName,
    address: string
  ): EntryPointConfig | null {
    const provider = this.getNetworkProvider(network);
    if (provider) {
      const conf = this.networks[network];
      if (conf) {
        const entryPoint = conf.entryPoints[address];
        if (entryPoint) {
          return entryPoint;
        }
      }
    }
    return null;
  }

  private parseSupportedNetworks(): NetworkName[] {
    return Object.keys(this.config.networks).map((key) => key as NetworkName);
  }

  private parseNetworkConfigs(): Networks {
    const networks: Networks = {};
    for (const key of this.supportedNetworks) {
      const network: NetworkName = key as NetworkName;
      let conf = this.config.networks[network];
      conf = Object.assign({}, bundlerDefaultConfigs, conf);
      networks[network] = conf;
    }
    return networks;
  }
}

const bundlerDefaultConfigs = {
  network: {
    minInclusionDenominator: 10,
    throttlingSlack: 10,
    banSlack: 10,
  },
};
