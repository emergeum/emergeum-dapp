import React, { PureComponent } from 'react';
import BackupTable from '../components/BackupTable';
import Loader from '../components/Loader';
import { getTickers, createRegistry, setTicker, deleteTicker } from '../helpers/api';

export default class BackupAddresses extends PureComponent {
    public state = {
        tickers: null,
        isLoading: false,
    };

    public async componentDidMount() {
        try {
            this.setState({ isLoading: true });
            const tickers = await getTickers();
            this.setState({
                tickers,
                isLoading: false,
            });
        } catch (e) {
            this.setState({ isLoading: false });
        }
    }

    public createBackup = async (data: any) => {
        try {
            this.setState({ isLoading: true });
            await createRegistry(data);
            const tickers = await getTickers();
            this.setState({
                tickers,
                isLoading: false,
            });
        } catch (e) {
            this.setState({ isLoading: false });
        }
    };

    public setTicker = async (ticker: string, address: string) => {
        try {
            await setTicker(ticker, address);
            const tickers = await getTickers();
            this.setState({tickers});
        } catch (e) {
            console.log(e)
        }
    };

    public deleteTicker = async (ticker: string) => {
        try {
            await deleteTicker(ticker);
            const tickers = await getTickers();
            this.setState({ tickers });
        } catch (e) {
            console.log(e)
        }

    };

    public render() {
        const { tickers, isLoading } = this.state;

        if (isLoading) {
            return (
                <Loader />
            );
        }

        return (
            <BackupTable
                tickers={tickers}
                createBackup={this.createBackup}
                setTicker={this.setTicker}
                deleteTicker={this.deleteTicker}
            />
        );
    }
}
