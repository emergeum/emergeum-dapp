import * as React from "react";
import { Account } from "@trustwallet/types/src/Account";
import styled from "styled-components";
import WalletConnect from "@trustwallet/walletconnect"
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import { IInternalEvent } from "@walletconnect/types";
import Button from "./components/Button";
import Column from "./components/Column";
import Wrapper from "./components/Wrapper";
import Modal from "./components/Modal";
import Header from "./components/Header";
import Loader from "./components/Loader";
import { fonts } from "./styles";
import {
  apiGetAccountAssets,
  apiGetGasPrices,
  apiGetAccountNonce
} from "./helpers/api";
// import {
//   recoverTypedSignature
// } from "./helpers/ethSigUtil";
import {
  sanitizeHex
} from "./helpers/utilities";
import {
  convertAmountToRawNumber,
  convertStringToHex
} from "./helpers/bignumber";
import { IAssetData } from "./helpers/types";
import Banner from "./components/Banner";
import AccountAssets from "./components/AccountAssets";

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

const SEmergencyButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const SEmergencyButton = styled(Button)`
  background-color: red;
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
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
      const allAddresses: Account[] = [];
      walletConnector.getAccounts().then(result => { const arr: Account[] = []; // tslint:disable-line
        result.forEach(function (value) { if (value.network === 60 || value.network === 118) { arr.push(value); } // tslint:disable-line
        });  // tslint:disable-line
        this.setState({ // tslint:disable-line
          allAddresses: arr // tslint:disable-line
        }); // tslint:disable-line
      }).catch(error => { console.error(error); });  // tslint:disable-line
      this.setState({
        connected: true,
        chainId,
        accounts,
        address,
        allAddresses
      });
    }

    this.setState({ walletConnector });
    console.log(this.state.allAddresses); // tslint:disable-line
  };

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
    const address = accounts[0];
    await this.setState({
      connected: true,
      chainId,
      accounts,
      address
    });
    WalletConnectQRCodeModal.close();
    this.getAccountAssets();
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

  public transfer = async () => {
    const { walletConnector, address, chainId } = this.state;

    if (!walletConnector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = "0xEff8d0e1A600EDBB0AE9230Ba657C9f9B6281903";

    walletConnector.getAccounts().then(result => { result.forEach(function (value) { console.log('address: ' + value.address + ' network: ' + value.network); }); }).catch(error => { console.error(error); });  // tslint:disable-line
    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(
      convertStringToHex(convertAmountToRawNumber(_gasPrice, 9))
    );

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0.01;
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
      const result = await walletConnector.sendTransaction(tx);

      // format displayed result
      const formattedResult = {
        method: "eth_sendTransaction",
        txHash: result,
        from: address,
        to: "0xEff8d0e1A600EDBB0AE9230Ba657C9f9B6281903",
        value: "0.01 ETH"
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

  public testSignTransaction = async () => {
    const { walletConnector, address, chainId } = this.state;

    if (!walletConnector) {
      return;
    }

    // from
    const from = address;

    // to
    const to = "0xEff8d0e1A600EDBB0AE9230Ba657C9f9B6281903";

    // nonce
    const _nonce = await apiGetAccountNonce(address, chainId);
    const nonce = sanitizeHex(convertStringToHex(_nonce));

    // gasPrice
    const gasPrices = await apiGetGasPrices();
    const _gasPrice = gasPrices.slow.price;
    const gasPrice = sanitizeHex(
      convertStringToHex(convertAmountToRawNumber(_gasPrice, 9))
    );

    // gasLimit
    const _gasLimit = 21000;
    const gasLimit = sanitizeHex(convertStringToHex(_gasLimit));

    // value
    const _value = 0.01;
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
      allAddresses
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
                <h3>Actions</h3>
                <Column center>
                  <SEmergencyButtonContainer>
                    <SEmergencyButton left onClick={this.transfer}>
                      {"Transfer"}
                    </SEmergencyButton>
                    <SEmergencyButton left onClick={this.testSignTransaction}>
                      {"Sign transaction"}
                    </SEmergencyButton>
                  </SEmergencyButtonContainer>
                </Column>
                <h3>Balances</h3>
                {!fetching ? (
                  <AccountAssets chainId={chainId} assets={assets} />
                ) : (
                  <Column center>
                    <SContainer>
                      <Loader />
                    </SContainer>
                  </Column>
                )}
                <h6>Network {allAddresses && allAddresses.length && allAddresses[0].network}</h6>
                <h6>Address {allAddresses && allAddresses.length && allAddresses[0].address}</h6>
                <h6>Network {allAddresses && allAddresses.length && allAddresses[1].network}</h6>
                <h6>Address {allAddresses && allAddresses.length && allAddresses[1].address}</h6>
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
