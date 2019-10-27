import * as React from "react";
import Column from "./Column";

function network(id: number) {
    switch(id) {
        case 60: return 'Ethereum';
        case 118: return 'Cosmos';
        default: return '';
    }
}

const Addresses = (props: any) => {
    const { accs } = props;

    return (
        <Column center>
            <ul>
                {accs.map((acc: any) => (
                    <li><b>{network(acc.network)}</b>: {acc.address}</li>
                ))}
            </ul>
        </Column>
    );
};

export default Addresses;