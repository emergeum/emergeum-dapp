import * as React from "react";
import Column from "./Column";

import { ETHEREUM_NETWORK, COSMOS_NETWORK } from '../emergeum';

function network(id: number) {
    switch(id) {
        case ETHEREUM_NETWORK: return 'Ethereum';
        case COSMOS_NETWORK: return 'Cosmos';
        default: return '';
    }
}

const Addresses = (props: any) => {
    const { accs } = props;

    return (
        <Column center>
            <ul>
                {accs.map((acc: any) => (
                    <li key={acc.address}><b>{network(acc.network)}</b>: {acc.address}</li>
                ))}
            </ul>
        </Column>
    );
};

export default Addresses;
