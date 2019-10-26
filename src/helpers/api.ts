import axios, { AxiosInstance } from "axios";
// @ts-ignore
import contract from 'truffle-contract';
import utils from 'web3-utils';
import AssetsRegistryFactory from 'emergeum-assets-registry/build/contracts/AssetsRegistryFactory.json';
import AssetsRegistry from 'emergeum-assets-registry/build/contracts/AssetsRegistry.json';
import { IAssetData, IGasPrices, IParsedTx } from "./types";
import { isNullAddress } from './utilities';

let assetsRegistry: any;
let assetsRegistryFactory: any;

const api: AxiosInstance = axios.create({
  baseURL: "https://ethereum-api.xyz",
  timeout: 30000, // 30 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

async function initProvider() {
  // @ts-ignore
  const provider = window.ethereum;

  if (provider && !provider.selectedAddress) {
    await provider.enable();
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

export const apiGetGasPrices = async (): Promise<IGasPrices> => {
  const response = await api.get(`/gas-prices`);
  const { result } = response.data;
  return result;
};

export async function getAssetsRegistry() {
  if (assetsRegistry === undefined) {
    const factory = await getAssetsRegistryFactory();
    const provider = await initProvider();
    const registry = await factory.registries(provider.selectedAddress);

    if (isNullAddress(registry)) {
      assetsRegistry = null;
    } else {
      const instance = contract(AssetsRegistry);

      instance.defaults({ from: provider.selectedAddress });
      instance.setProvider(provider);
      assetsRegistry = await instance.at(registry);
    }
  }

  return assetsRegistry;
}

export async function getAssetsRegistryFactory() {
  if (!assetsRegistryFactory) {
    const instance = contract(AssetsRegistryFactory);
    const provider = await initProvider();

    instance.defaults({ from: provider.selectedAddress });
    instance.setProvider(provider);
    assetsRegistryFactory = await instance.deployed();
  }

  return assetsRegistryFactory;
}

export async function createRegistry(map = {}) {
  const factory = await getAssetsRegistryFactory();
  // @ts-ignore
  const [tickers, addresses] = Object.entries(map).reduce(([tickerAcc, addressAcc], [ticker, address]) => [[...tickerAcc, utils.fromAscii(ticker)], [...addressAcc, utils.fromAscii(address)]], [[], []]);

  await factory.newRegistry(tickers, addresses);
}
