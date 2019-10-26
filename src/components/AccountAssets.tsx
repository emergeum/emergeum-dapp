import * as React from "react";
import Column from "./Column";
import AssetRow from "./AssetRow";
import { IAssetData } from "../helpers/types";

const AccountAssets = (props: any) => {
  const { assets } = props;
  const defaultNativeCurrency: IAssetData = {
    contractAddress: "",
    name: "Ethereum",
    symbol: "ETH",
    decimals: "18",
    balance: "0"
  };

  let nativeCurrency: IAssetData = defaultNativeCurrency;
  console.log("===1: " + nativeCurrency.balance); // tslint:disable-line
  let tokens: IAssetData[] = [];
  if (assets && assets.length) {
    const filteredNativeCurrency = assets.filter((asset: IAssetData) =>
      asset && asset.symbol
        ? asset.symbol.toLowerCase() === nativeCurrency.symbol.toLowerCase()
        : false
    );
    nativeCurrency =
      filteredNativeCurrency && filteredNativeCurrency.length
        ? filteredNativeCurrency[0]
        : defaultNativeCurrency;
    console.log("===2: " + nativeCurrency.balance); // tslint:disable-line
    tokens = assets.filter((asset: IAssetData) =>
      asset && asset.symbol
        ? asset.symbol.toLowerCase() !== nativeCurrency.symbol.toLowerCase()
        : false
    );
  }
  return (
    <Column center>
      <AssetRow key={nativeCurrency.name} asset={nativeCurrency} />
      {tokens.map(token => (
        <AssetRow key={token.symbol} asset={token} />
      ))}
    </Column>
  );
};

export default AccountAssets;
