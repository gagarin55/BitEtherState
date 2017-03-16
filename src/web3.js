import Web3 from 'web3';

const uri = 'https://mewapi.epool.io';
//const uri = 'https://api.gastracker.io/web3';

const Web3Instance = new Web3(new Web3.providers.HttpProvider(uri));

export default Web3Instance;