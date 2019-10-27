import { getAccount, gasEstimate, createTransaction, sendSignedTransaction } from "./helpers/cosmos";

const DEFAULT_ATOM_AMOUNT = 10000;
const DEFAULT_ETH_AMOUNT = 10000;

const ETHEREUM_NETWORK = 60;
const COSMOS_NETWORK = 118;

export async function sendCosmosTransaction(walletConnector, from, to) {
    const acc = await getAccount(from);
    console.log('send cosmos [acc]', acc);

    const gas = await gasEstimate(from, to, acc.value.account_number, acc.value.sequence, DEFAULT_ATOM_AMOUNT);
    console.log('send cosmos [gas]', gas);

    const tx = createTransaction(from, to, acc.value.account_number, acc.value.sequence, gas, DEFAULT_ATOM_AMOUNT);
    console.log('send cosmos [tx]', tx);

    const stx = await walletConnector.trustSignTransaction(COSMOS_NETWORK, tx);
    console.log('send cosmos [stx]', stx);

    const res = await sendSignedTransaction(stx);
    console.log('send cosmos [res]', res);
}

export async function sendEthTransaction(walletConnector, from, to) {

}

export default async function(walletConnector) {

}