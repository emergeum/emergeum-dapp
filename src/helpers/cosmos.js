import axios from "axios";

const CHAIN_ID = 'cosmoshub-2';
const GAS_ADJUSTMENT = 2.3;

const DEFAULT_GAS_PRICE = (2.5e-8).toFixed(9);

const api = axios.create({
    baseURL: "https://stargate.cosmos.network",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
    }
});

export async function gasEstimate(from, to, accountNumber, sequence, amount) {
    const tx = {
        base_req: {
            chain_id: CHAIN_ID,
            from: from,
            account_number: accountNumber,
            sequence: sequence,
            simulate: true,
            memo: undefined
        },
        amount: [
            {
                amount: String(amount),
                denom: 'uatom'
            }
        ]
    };

    const response = await api.post(`/bank/accounts/${to}/transfers`, tx);

    const { gas_estimate } = response.data;

    return Math.round(Number(gas_estimate) * GAS_ADJUSTMENT);
}

export async function getAccount(from) {
    const response = await api.get(`/auth/accounts/${from}`);

    return response.data;
}

export function createTransaction(from, to, accountNumber, sequence, gas, amount) {
    return {
        chainId: CHAIN_ID,
        accountNumber: accountNumber,
        fee: {
            amounts: [
                {
                    denom: 'uatom',
                    amount: String(Math.round(DEFAULT_GAS_PRICE * gas))
                }
            ],
            gas: String(gas)
        },
        sequence: sequence,
        sendCoinsMessage: {
            fromAddress: from,
            toAddress: to,
            amounts: [
                {
                    denom: 'uatom',
                    amount: String(amount)
                }
            ]
        }
    }
}

// https://cosmos.network/rpc/#/ICS0/post_txs
export async function sendSignedTransaction(tx) {
    const response = await api.post(`/txs`, tx);
    return response.data;
}