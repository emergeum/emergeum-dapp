import * as React from "react";
import utils from 'web3-utils';
import { Account } from "@trustwallet/types/src/Account";
import styled from "styled-components";
import WalletConnect from "@trustwallet/walletconnect"
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import { convertUtf8ToHex } from "@walletconnect/utils";
import { IInternalEvent, IJsonRpcRequest } from "@walletconnect/types";
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import BackupAddresses from "./containers/BackupAddresses";
import { fonts } from "./styles";
import {
  apiGetAccountAssets,
  apiGetGasPrices,
  apiGetAccountNonce
} from "./helpers/api";
import {
    sanitizeHex,
    hashPersonalMessage,
    recoverPublicKey,
    recoverPersonalSignature,
    getNetworkIdByTicker, tickersMap,
} from "./helpers/utilities";
import {
  convertAmountToRawNumber,
  convertStringToHex
} from "./helpers/bignumber";
import { IAssetData } from "./helpers/types";
import Banner from "./components/Banner";
import Addresses from "./components/Addresses";
import emergeum from "./emergeum";

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
  min-height: 100vh;
  text-align: center;
`;

const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

const SButtonContainer = styled(Column)`
  width: 250px;
  margin: 50px 0;
`;

const SConnectButton = styled(Button)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;

const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;

const SModalParagraph = styled.p`
  margin-top: 30px;
`;

const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const STable = styled(SContainer)`
  flex-direction: column;
  text-align: left;
`;

const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;

const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;

const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;

interface IAppState {
  walletConnector: WalletConnect | null;
  fetching: boolean;
  connected: boolean;
  chainId: number;
  showModal: boolean;
  pendingRequest: boolean;
  uri: string;
  accounts: string[];
  address: string;
  result: any | null;
  assets: IAssetData[];
  allAddresses: Account[];
}

const INITIAL_STATE: IAppState = {
  walletConnector: null,
  fetching: false,
  connected: false,
  chainId: 1,
  showModal: false,
  pendingRequest: false,
  uri: "",
  accounts: [],
  address: "",
  result: null,
  assets: [],
  allAddresses: []
};

class App extends React.Component<any, any> {
  public state: IAppState = {
    ...INITIAL_STATE
  };

  public walletConnectInit = async () => {
    // bridge url
    const bridge = "https://bridge.walletconnect.org";

    // create new walletConnector
    const walletConnector = new WalletConnect({ bridge });

    window.walletConnector = walletConnector;

    await this.setState({ walletConnector });

    // check if already connected
    if (!walletConnector.connected) {
      // create new session
      await walletConnector.createSession();

      // get uri for QR Code modal
      const uri = walletConnector.uri;

      // console log the uri for development
      console.log(uri); // tslint:disable-line

      // display QR Code modal
      WalletConnectQRCodeModal.open(uri, () => {
        console.log("QR Code Modal closed"); // tslint:disable-line
      });
    }
    // subscribe to events
    await this.subscribeToEvents();
  };
  public subscribeToEvents = () => {
    const { walletConnector } = this.state;

    if (!walletConnector) {
      return;
    }

    walletConnector.on("session_update", async (error, payload) => {
      console.log('walletConnector.on("session_update")'); // tslint:disable-line

      if (error) {
        throw error;
      }

      console.log('===== payload.params.length' + payload.params.length); // tslint:disable-line
      const { chainId, accounts } = payload.params[0];
      this.onSessionUpdate(accounts, chainId);
    });

    walletConnector.on("connect", (error, payload) => {
      console.log('walletConnector.on("connect")'); // tslint:disable-line

      if (error) {
        throw error;
      }

      this.onConnect(payload);
    });

    walletConnector.on("disconnect", (error, payload) => {
      console.log('walletConnector.on("disconnect")'); // tslint:disable-line

      if (error) {
        throw error;
      }

      this.onDisconnect();
    });

    if (walletConnector.connected) {
      const { chainId, accounts } = walletConnector;
      const address = accounts[0];

      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
      });

      this.getAccounts(walletConnector);
    }

    this.setState({ walletConnector });
  };

  public async getAccounts(walletConnector: any) {
      const accounts = await walletConnector.getAccounts();

      console.log({accounts});

      this.setState({
          allAddresses: accounts.filter((value: any) => value.network === tickersMap.ETH || value.network === tickersMap.ATOM),
      });
  }

  public killSession = async () => {
    const { walletConnector } = this.state;
    if (walletConnector) {
      walletConnector.killSession();
    }
    this.resetApp();
  };

  public resetApp = async () => {
    await this.setState({ ...INITIAL_STATE });
  };

  public onConnect = async (payload: IInternalEvent) => {
    const { chainId, accounts } = payload.params[0];
    const { walletConnector } = this.state;
    const address = accounts[0];
    this.setState({
      connected: true,
      chainId,
      accounts,
      address,
    });
    this.getAccounts(walletConnector);
    WalletConnectQRCodeModal.close();
  };

  public onDisconnect = async () => {
    WalletConnectQRCodeModal.close();
    this.resetApp();
  };

  public onSessionUpdate = async (accounts: string[], chainId: number) => {
    const address = accounts[0];
    await this.setState({ chainId, accounts, address });
    await this.getAccountAssets();
  };

  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, address, assets });
    } catch (error) {
      console.error(error); // tslint:disable-line
      await this.setState({ fetching: false });
    }
  };

  public toggleModal = () =>
    this.setState({ showModal: !this.state.showModal });

  public transfer = async (backupAddresses: any) => {
    const { walletConnector, address, chainId, allAddresses } = this.state;
    const addresses = backupAddresses.filter(({ ticker }: any) => allAddresses.some((addr) => tickersMap[ticker] === addr.network));

    addresses.forEach(async (addr: any) => {
        if (addr.ticker === 'ETH') {
            if (!walletConnector) {
                return;
            }

            getNetworkIdByTicker(addr.ticker);

            // from
            const from = address;

            // gasPrice
            const gasPrices = await apiGetGasPrices(chainId);
            const _gasPrice = gasPrices.slow.price;
            const gasPrice = sanitizeHex(
                convertStringToHex(convertAmountToRawNumber(_gasPrice, 9))
            );

            const valueToTransfer = '0.01'; // ETH

            // gasLimit
            const _gasLimit = 21000;
            const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

            // test transaction
            const tx = {
                from,
                gasPrice,
                gasLimit,
                value: utils.toWei(valueToTransfer),
                to: addr.address
            };

            try {
                // open modal
                this.toggleModal();

                // toggle pending request indicator
                this.setState({ pendingRequest: true });

                // send transaction
                const result = await walletConnector.sendTransaction(tx);

                // format displayed result
                const formattedResult = {
                    method: "eth_sendTransaction",
                    txHash: result,
                    from: address,
                    to: address,
                    value: `${valueToTransfer} ETH`
                };

                // display result
                this.setState({
                    walletConnector,
                    pendingRequest: false,
                    result: formattedResult || null
                });
            } catch (error) {
                console.error(error); // tslint:disable-line
                this.setState({ walletConnector, pendingRequest: false, result: null });
            }
        }

        if (addr.ticker === 'ATOM') {
            try {
                // open modal
                this.toggleModal();

                // toggle pending request indicator
                this.setState({ pendingRequest: true });

                let result = 'OK';
                try {
                    await emergeum(walletConnector, allAddresses, {
                        'ATOM': addr.address,
                    });
                } catch(e) {
                    console.error(e);
                    result = e.message;
                }

                // format displayed result
                const formattedResult = {
                    method: "transfer",
                    result
                };

                // display result
                this.setState({
                    walletConnector,
                    pendingRequest: false,
                    result: formattedResult || null
                });
            } catch (error) {
                console.error(error); // tslint:disable-line
                this.setState({ walletConnector, pendingRequest: false, result: null });
            }
        }
    });
  };

  public testSignTransaction = async () => {
    const { walletConnector, address, chainId } = this.state;

    if (!walletConnector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = address;

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices(chainId);
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(
      convertStringToHex(convertAmountToRawNumber(_gasPrice, 9))
    );

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0;
    const value = sanitizeHex(convertStringToHex(_value));

    // data
    const data = "0x";

    // test transaction
    const tx = {
      from,
      to,
      nonce,
      gasPrice,
      gasLimit,
      value,
      data
    };

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await walletConnector.signTransaction(tx);

      // format displayed result
      const formattedResult = {
        method: "eth_signTransaction",
        result
      };

      // display result
      this.setState({
        walletConnector,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ walletConnector, pendingRequest: false, result: null });
    }
  };

  public testCustomRequest = async (customRequest: IJsonRpcRequest) => {
    const { walletConnector } = this.state;

    if (!walletConnector) {
      return;
    }

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await walletConnector.sendCustomRequest(customRequest);

      // format displayed result
      const formattedResult = {
        method: customRequest.method,
        result
      };

      // display result
      this.setState({
        walletConnector,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ walletConnector, pendingRequest: false, result: null });
    }
  };

  public testSignMessage = async () => {
    const { walletConnector, address } = this.state;

    if (!walletConnector) {
      return;
    }

    // test message
    const message = "My email is john@doe.com - 1537836206101";

    // hash message
    const hash = hashPersonalMessage(message);

    // eth_sign params
    const msgParams = [address, hash];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await walletConnector.signMessage(msgParams);

      // verify signature
      const signer = recoverPublicKey(result, hash);
      const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        method: "eth_sign",
        address,
        signer,
        verified,
        result
      };

      // display result
      this.setState({
        walletConnector,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ walletConnector, pendingRequest: false, result: null });
    }
  };

  public testSignPersonalMessage = async () => {
    const { walletConnector, address } = this.state;

    if (!walletConnector) {
      return;
    }

    // test message
    const message = "My email is john@doe.com - 1537836206101";

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    // personal_sign params
    const msgParams = [hexMsg, address];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await walletConnector.signPersonalMessage(msgParams);

      // verify signature
      const signer = recoverPersonalSignature(result, message);
      const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        method: "personal_sign",
        address,
        signer,
        verified,
        result
      };

      // display result
      this.setState({
        walletConnector,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ walletConnector, pendingRequest: false, result: null });
    }
  };

  public testSignTypedData = async () => {
    const { walletConnector, address } = this.state;

    if (!walletConnector) {
      return;
    }

    // typed data
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" }
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "account", type: "address" }
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" }
        ]
      },
      primaryType: "Mail",
      domain: {
        name: "Example Dapp",
        version: "0.7.0",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000"
      },
      message: {
        from: {
          name: "Alice",
          account: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        to: {
          name: "Bob",
          account: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        },
        contents: "Hey, Bob!"
      }
    };

    // eth_signTypedData params
    const msgParams = [address, typedData];

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // sign typed data
      const result = await walletConnector.signTypedData(msgParams);

      // // verify signature
      // const signer = recoverPublicKey(result, typedData);
      // const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        method: "eth_signTypedData",
        address,
        // signer,
        // verified,
        result
      };

      // display result
      this.setState({
        walletConnector,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ walletConnector, pendingRequest: false, result: null });
    }
  };

  public render = () => {
    const {
      assets,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
      allAddresses,
    } = this.state;

    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.killSession}
          />
          <SContent>
            {!address && !assets.length ? (
              <SLanding center>
                <h3>
                  {`Try out Emergeum`}
                  <br />
                  <span>{`v${process.env.REACT_APP_VERSION}`}</span>
                </h3>
                <SButtonContainer>
                  <SConnectButton
                    left
                    onClick={this.walletConnectInit}
                    fetching={fetching}
                  >
                    {"Connect to Emergeum"}
                  </SConnectButton>
                </SButtonContainer>
              </SLanding>
            ) : (
              <SBalances>
                <Banner />
                <BackupAddresses transfer={this.transfer}/>
                <h3>Accounts</h3>
                {allAddresses && <Addresses accs={allAddresses} />}
              </SBalances>
            )}
          </SContent>
        </Column>
        <Modal show={showModal} toggleModal={this.toggleModal}>
          {pendingRequest ? (
            <SModalContainer>
              <SModalTitle>{"Pending Call Request"}</SModalTitle>
              <SContainer>
                <Loader />
                <SModalParagraph>
                  {"Approve or reject request using your wallet"}
                </SModalParagraph>
              </SContainer>
            </SModalContainer>
          ) : result ? (
            <SModalContainer>
              <SModalTitle>{"Call Request Approved"}</SModalTitle>
              <STable>
                {Object.keys(result).map(key => (
                  <SRow key={key}>
                    <SKey>{key}</SKey>
                    <SValue>{result[key].toString()}</SValue>
                  </SRow>
                ))}
              </STable>
            </SModalContainer>
          ) : (
            <SModalContainer>
              <SModalTitle>{"Call Request Rejected"}</SModalTitle>
            </SModalContainer>
          )}
        </Modal>
      </SLayout>
    );
  };
}

export default App;
