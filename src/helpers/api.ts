import axios, { AxiosInstance } from "axios";
// @ts-ignore
import contract from 'truffle-contract';
import utils from 'web3-utils';
import Eth from 'web3-eth';
import AssetsRegistryFactory from 'emergeum-assets-registry/build/contracts/AssetsRegistryFactory.json';
import AssetsRegistry from 'emergeum-assets-registry/build/contracts/AssetsRegistry.json';
// @ts-ignore
import ProviderEngine from 'web3-provider-engine';
// @ts-ignore
import DefaultFixture from 'web3-provider-engine/subproviders/default-fixture';
// @ts-ignore
import NonceTrackerSubprovider from 'web3-provider-engine/subproviders/nonce-tracker';
// @ts-ignore
import CacheSubprovider from 'web3-provider-engine/subproviders/cache';
// @ts-ignore
import SubscriptionSubprovider from 'web3-provider-engine/subproviders/subscriptions';
// @ts-ignore
import InflightCacheSubprovider from 'web3-provider-engine/subproviders/inflight-cache';
// @ts-ignore
import SanitizingSubprovider from 'web3-provider-engine/subproviders/sanitizer';
import { IAssetData, IGasPrices, IParsedTx } from "./types";
import { isNullAddress } from './utilities';
// @ts-ignore
import WalletConnectSubprovider from './wallet-connect-subprovider';
// @ts-ignore
import InfuraSubprovider from 'web3-provider-engine/subproviders/infura';
// @ts-ignore
import FetchSubprovider from 'web3-provider-engine/subproviders/fetch';
// @ts-ignore
import WebSocketSubprovider from 'web3-provider-engine/subproviders/websocket';
// @ts-ignore
import FilterSubprovider from 'web3-provider-engine/subproviders/filters';

let assetsRegistry: any;
let assetsRegistryFactory: any;
let provider: any;
let eth: any;

const api: AxiosInstance = axios.create({
  baseURL: "https://ethereum-api.xyz",
  timeout: 30000, // 30 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

function createDataSubprovider(connectionType: string, rpcUrl: string) {
  // default to infura
  if (!connectionType) {
    return new InfuraSubprovider()
  }
  if (connectionType === 'http') {
    return new FetchSubprovider({ rpcUrl })
  }
  if (connectionType === 'ws') {
    return new WebSocketSubprovider({ rpcUrl })
  }

  throw new Error(`ProviderEngine - unrecognized connectionType "${connectionType}"`)
}

function getConnectionType(rpcUrl: string) {
  if (!rpcUrl) {
    return undefined;
  }

  const protocol = rpcUrl.split(':')[0].toLowerCase()
  switch (protocol) {
    case 'http':
    case 'https':
      return 'http'
    case 'ws':
    case 'wss':
      return 'ws'
    default:
      throw new Error(`ProviderEngine - unrecognized protocol in "${rpcUrl}"`)
  }
}

function getEth() {
  if (!eth) {
    // @ts-ignore
    eth = new Eth(getProvider());
  }

  return eth;
}

async function getAccounts() {
  return getEth().getAccounts();
}

function initWalletConnectProvider(rpcUrl: string) {
  const connectionType = getConnectionType(rpcUrl);
  const engine = new ProviderEngine();

  // static
  const staticSubprovider = new DefaultFixture()
  engine.addProvider(staticSubprovider)

  // nonce tracker
  engine.addProvider(new NonceTrackerSubprovider())

  // sanitization
  const sanitizer = new SanitizingSubprovider()
  engine.addProvider(sanitizer)

  // cache layer
  const cacheSubprovider = new CacheSubprovider()
  engine.addProvider(cacheSubprovider)

  // filters + subscriptions
  // only polyfill if not websockets
  if (connectionType !== 'ws') {
    engine.addProvider(new SubscriptionSubprovider())
    engine.addProvider(new FilterSubprovider())
  }

  // inflight cache
  const inflightCache = new InflightCacheSubprovider()
  engine.addProvider(inflightCache)

  engine.addProvider(
      new WalletConnectSubprovider({
        connector: window.walletConnector,
      })
  );

  // data source
  const dataSubprovider = createDataSubprovider(connectionType as string, rpcUrl)
  engine.addProvider(dataSubprovider)

  engine.start();

  return engine;
}

function getProvider() {
  if (!provider) {
    provider = initWalletConnectProvider('https://rinkeby.infura.io/v3/42b3b5fb8da041be9065aad61239f7f0');
  }

  return provider;
}

export async function apiGetAccountAssets(
  address: string,
  chainId: number
): Promise<IAssetData[]> {
  const response = await api.get(
    `/account-assets?address=${address}&chainId=${chainId}`
  );
  const { result } = response.data;
  return result;
}

export async function apiGetAccountTransactions(
  address: string,
  chainId: number
): Promise<IParsedTx[]> {
  const response = await api.get(
    `/account-transactions?address=${address}&chainId=${chainId}`
  );
  const { result } = response.data;
  return result;
}

export const apiGetAccountNonce = async (
  address: string,
  chainId: number
): Promise<string> => {
  const response = await api.get(
    `/account-nonce?address=${address}&chainId=${chainId}`
  );
  const { result } = response.data;
  return result;
};

export const apiGetGasPrices = async (chainId: number): Promise<IGasPrices> => {
  const response = await api.get(`/gas-prices?chainId=${chainId}`);
  const { result } = response.data;
  return result;
};

export async function getAssetsRegistry() {
  if (!assetsRegistry) {
    const factory = await getAssetsRegistryFactory();
    const provider = getProvider();
    const [address] = await getAccounts();
    const registry = await factory.registries(address);

    if (!isNullAddress(registry)) {
      const instance = contract(AssetsRegistry);

      instance.defaults({ from: address });
      instance.setProvider(provider);
      assetsRegistry = await instance.at(registry);
    }
  }

  return assetsRegistry;
}

export async function getAssetsRegistryFactory() {
  if (!assetsRegistryFactory) {
    const instance = contract(AssetsRegistryFactory);
    const provider = getProvider();
    const [address] = await getAccounts();

    instance.defaults({ from: address });
    instance.setProvider(provider);
    assetsRegistryFactory = await instance.deployed();
  }

  return assetsRegistryFactory;
}

export async function createRegistry(data: any) {
  const factory = await getAssetsRegistryFactory();
  // @ts-ignore
  const [tickers, addresses] = data.reduce(([tickerAcc, addressAcc], { ticker, address }) => [[...tickerAcc, utils.fromAscii(ticker)], [...addressAcc, address]], [[], []])

  await factory.newRegistry(tickers, addresses);
}

export async function getTickers() {
  const registry = await getAssetsRegistry();

  if (!registry) {
    return null;
  }

  const [tickers, addresses] = await Promise.all([
    registry.getTickers(),
    registry.getBackupAddresses(),
  ]);

  return tickers.reduce((acc: any, ticker: any, index: number) => [...acc, {
    ticker: utils.toUtf8(ticker),
    address: addresses[index]
  }], []);
}

export async function setTicker(ticker: string, address: string) {
  const registry = await getAssetsRegistry();

  if (registry) {
    return registry.setAsset(utils.fromAscii(ticker), address);
  }
}

export async function deleteTicker(ticker: string) {
  const registry = await getAssetsRegistry();

  if (registry) {
    return registry.deleteAsset(utils.fromAscii(ticker));
  }
}
