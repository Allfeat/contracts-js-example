import { CodePromise } from '@polkadot/api-contract';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import * as fs from "fs";
import path from "path";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN, BN_ONE } from "@polkadot/util";
import type { WeightV2 } from '@polkadot/types/interfaces'

function loadContract() {
    const contract_path = path.join(__dirname, "..", "contracts", "aft34", "my_aft34.contract");

    const contractBuffer = fs.readFileSync(contract_path);
    const contractContent = contractBuffer.toString();

    try {
        return JSON.parse(contractContent);
    } catch (error) {
        console.error(error);
    }
}

async function main() {
    await cryptoWaitReady();

    // (Advanced, development-only) add with an implied dev seed and hard derivation
    const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice', { name: 'Alice default' });
    const contractMetadata = loadContract();

    console.log("Initializing connection to node...")

    const endpoint: string = "ws://localhost:9944";
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({ provider: wsProvider });

    console.log(
        `Connected to node: ${endpoint} | ${(await api.rpc.system.chain()).toHuman()} [ss58: ${
            api.registry.chainSS58
        }]`
    );

    console.log("Initializing my_aft34 code deployment to chain...")

    const wasm: string = contractMetadata.source.wasm;

    const code = new CodePromise(api, contractMetadata, wasm);

    console.log("Dry-running the tx...")

    const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
    const PROOFSIZE = new BN(1_000_000);

    const gasLimit = api?.registry.createType('WeightV2', {
            refTime: 445076379,
            proofSize: 16689,
        }) as WeightV2;
    // a limit to how much Balance to be used to pay for the storage created by the instantiation
    // if null is passed, unlimited balance can be used
    const storageDepositLimit = null
    // used to derive contract address,
    // use null to prevent duplicate contracts
    const salt = new Uint8Array()
    // balance to transfer to the contract account, formerly known as "endowment".
    // use only with payable constructors, will fail otherwise.
    // const value = api.registry.createType('Balance', 1000)
    //const initValue = 1;

    const tx = code.tx.new({ gasLimit, storageDepositLimit })
    const result = await tx.dryRun(alicePair);

    const unsub = await tx.signAndSend(alicePair, ({ status }) => {
        if (status.isInBlock || status.isFinalized) {
            //address = contract.address.toString();
            unsub();
        }
    });
}

main().catch(console.error);