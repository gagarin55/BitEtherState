import React, {Component} from 'react';
import Immutable from 'immutable';
import BigNumber from 'bignumber.js';

import logo from './bec.jpg';
import './App.css';
import Web3 from './web3';
import {default as contract} from 'truffle-contract'
import token_artifacts from './contracts/BitEtherCoin.json';

const tokenAddress = '0x085fb4f24031eaedbc2b611aa528f22343eb52db';
const satoshiAddress = '0x381c6ea3208c3bd2c19eb93b394bcd05f71e9581';
const BecToken = contract(token_artifacts);
BecToken.setProvider(Web3.currentProvider);

const unitsToString = (value) => value.div(100000000).toFixed(8);

const ExplorerLink = (props) => (
    <a href={"http://gastracker.io/token/0x085fb4f24031eaedbc2b611aa528f22343eb52db/"+props.address} target="_blank">
        {props.address}
    </a>
);

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            events: [],
            satoshiBalance: new BigNumber(0),
            fetching: true
        };
    }

    buildState(events) {
        const applyEvent = (state, event) => {
            const value = event.args._value;
            switch (event.event) {
                case 'Reward':
                    const address = event.args._miner;
                    const currentBalance = state.get(address, new BigNumber(0));
                    state = state.set(address, currentBalance.add(value));
                    break;

                case 'Transfer':
                    const from = event.args._from;
                    const to = event.args._to;
                    const currentFromBalance = state.get(from, new BigNumber(0));
                    state = state.set(from, currentFromBalance.sub(value));
                    const currentToBalance = state.get(to, new BigNumber(0));
                    state = state.set(to, currentToBalance.add(value));
                    break;
            }
            return state;
        };
        events = events.filter(e => ((e.event === 'Reward') && e.args._current) || e.event === 'Transfer');
        let state = new Immutable.Map();
        events.forEach(e => {
            state = applyEvent(state, e);
        });
        return state;
    }

    componentDidMount() {
        const self = this;
        let contract;

        BecToken.at(tokenAddress).then(instance => {
            contract = instance;
            self.setState({fetching: true});
            // get total supply
            return contract.totalSupply.call();
        }).then((total) => {
            self.setState({totalSupply: total});
        }).then(() => {
            // get satoshi balance
            return contract.balanceOf.call(satoshiAddress);
        }).then((balance) => {
            self.setState({satoshiBalance: balance});
        }).then(() => {
            const events = contract.allEvents({fromBlock: 2700000/*2726892*/, toBlock: 'latest'});
            events.get(function (error, logs) {
                console.log('Got ' + logs.length + ' events');
                self.setState({events: logs, fetching: false});
            });
        }).catch(error => {
            console.error(error);
        });
    }

    render() {
        const { totalSupply, events, fetching, satoshiBalance } = this.state;
        let state = this.buildState(events).set(satoshiAddress, satoshiBalance);
        const totals = state.reduce((r, v, k) => r.add(v), new BigNumber(0));
        state = state.sort((a, b) => -a.comparedTo(b));

        return (
            <div className="App">
                <div className="App-header">
                    <img src={logo} className="App-logo" alt="logo"/>
                    <h2>Welcome to BitEther</h2>
                </div>
                <p className="App-intro">
                    {totalSupply && <code>TOTAL: {unitsToString(totalSupply)} BEC</code>}
                </p>
                {fetching && (<div>Fetching smart contract events...</div>)}
                {!fetching && (
                    <div>
                        <table>
                            <thead>
                            <tr>
                                <th>Address</th>
                                <th>BEC</th>
                            </tr>
                            </thead>
                            <tbody>
                            {
                                state.entrySeq().map(([key, value]) => (
                                    <tr key={ key }>
                                        <td className="address">
                                            <ExplorerLink address={ key } />
                                        </td>
                                        <td className="balance">{unitsToString(value)}</td>
                                    </tr>
                                ))
                            }
                            <tr><td>TOTAL</td><td>{unitsToString(totals)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }
}

export default App;
