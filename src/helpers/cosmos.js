import axios from "axios";

const CHAIN_ID = 'cosmoshub-2';
const GAS_ADJUSTMENT = 2.3;

function Coin ({ amount, denom }) {
    return ({
        amount: String(amount),
        denom
    })
}

const api = axios.create({
    baseURL: "https://stargate.cosmos.network",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
    }
});

export async function gasEstimate(from, to, accountNumber, sequence, amounts) {
    const tx = {
        base_req: {
            sequence,
            from: from,
            account_number: accountNumber,
            chain_id: CHAIN_ID,
            simulate: true,
            memo: undefined
        },
        value: {
            from_address: from,
            to_address: to,
            amount: amounts.map(Coin)
        }
    };

    const response = await api.post(`/bank/accounts/${from}/transfers`, tx);

    const { gas_estimate } = response.data;

    return Math.round(Number(gas_estimate) * GAS_ADJUSTMENT);
}

export async function getAccount(from) {
    const response = await api.get(`/auth/accounts/${from}`);

    return response.data;
}

// https://cosmos.network/rpc/#/ICS0/post_txs
export async function sendSignedTransaction() {
    throw new Error('Not implemented yet');
}