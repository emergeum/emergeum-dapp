import * as React from "react";

import MaterialTable from 'material-table';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';

const columns = [
    { title: 'Ticker', field: 'ticker' },
    { title: 'Address', field: 'address' },
];

let id = 0;

const NewAssetsTableModal = (props) => {
    const { open, handleClose, onSubmit } = props;
    const [data, setData] = React.useState([]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="draggable-dialog-title"
        >
            <DialogContent>
                <div style={{ width: "100%" }}>
                    <MaterialTable
                        options={{
                            search: false
                        }}
                        title="Backup addresses"
                        columns={columns}
                        data={data}
                        editable={{
                            onRowAdd: async (newData) => setData([...data, {
                                ...newData,
                                id: id++,
                            }]),
                            onRowUpdate: async (newData, oldData) => {
                                setData(data.map(it => {
                                    if (it.id === oldData.id) {
                                        return {
                                            ...newData,
                                            id: oldData.id,
                                        }
                                    }

                                    return it;
                                }));
                            },
                            onRowDelete: async (oldData) => {
                                setData(data.filter(it => it.id !== oldData.id));
                            },
                        }}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">
                    Cancel
                </Button>
                <Button disabled={!data.length} onClick={() => onSubmit(data)} color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NewAssetsTableModal;
