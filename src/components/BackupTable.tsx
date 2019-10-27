import * as React from "react";

import styled from "styled-components";
import Button from "./Button";
import {fonts} from "../styles";
import MaterialTable from 'material-table';
import NewAssetsTableModal from './NewAssetsTableModal';

const SEmergencyButton = styled(Button)`
  background-color: red;
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
`;

const columns = [
    { title: 'Ticker', field: 'ticker' },
    { title: 'Address', field: 'address' },
];

const BackupTable = (props: any) => {
    const { tickers, createBackup, deleteTicker, setTicker, transfer } = props;
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    if (!tickers) {
        return (
            <div>
                <SEmergencyButton onClick={handleClickOpen}>
                    Create backup
                </SEmergencyButton>
                <NewAssetsTableModal
                    open={open}
                    handleClose={handleClose}
                    onSubmit={createBackup}
                />
            </div>
        );
    }

    return (
        <div style={{ width: "100%" }}>
            <MaterialTable
                options={{
                    search: false
                }}
                title="Backup addresses"
                columns={columns}
                data={tickers}
                editable={{
                    onRowAdd: ({ ticker, address }) => setTicker(ticker, address),
                    onRowUpdate: ({ ticker, address }) => setTicker(ticker, address),
                    onRowDelete: ({ ticker }) => deleteTicker(ticker),
                }}
            />
            <SEmergencyButton onClick={transfer}>
                Transfer
            </SEmergencyButton>
        </div>
    );
};

export default BackupTable;
