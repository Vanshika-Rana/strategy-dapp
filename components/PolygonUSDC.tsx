"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers"; // ethers@v5
import { useSearchParams } from "next/navigation";
import avocadoV1ABI from "../constants/avocado-v1-abi.json";
import avoForwarderV1ABI from "../constants/avo-forwarder-v1-abi.json";
import { Suspense } from "react";
// -------------------------------- Types etc. -----------------------------------

interface ITransactionParams {
	id: string; // id for actions, e.g. 0 = CALL, 1 = MIXED (call and delegatecall), 20 = FLASHLOAN_CALL, 21 = FLASHLOAN_MIXED. Default value of 0 will work for all most common use-cases.
	salt: string; // salt to customize non-sequential nonce (if `avoNonce` is set to -1), we recommend at least to send `Date.now()`
	source: string; // source address for referral system
	actions: ITransactionAction[]; // actions to execute
	metadata: string; // generic additional metadata
	avoNonce: string; // sequential avoNonce as current value on the smart wallet contract or set to `-1`to use a non-sequential nonce
}

interface ITransactionAction {
	target: string; // the target address to execute the action on
	data: string; // the calldata to be passed to the call for each target
	value: string; // the msg.value to be passed to the call for each target. set to 0 if none
	operation: string; // type of operation to execute: 0 -> .call; 1 -> .delegateCall, 2 -> flashloan (via .call)
}

interface ITransactionForwardParams {
	gas: string; // minimum amount of gas that the relayer (AvoForwarder) is expected to send along for successful execution
	gasPrice: string; // UNUSED: maximum gas price at which the signature is valid and can be executed. Not implemented yet.
	validAfter: string; // time in seconds after which the signature is valid and can be executed
	validUntil: string; // time in seconds until which the signature is valid and can be executed
	value: string; // UNUSED: msg.value that broadcaster should send along. Not implemented yet.
}

interface ITransactionPayload {
	params: ITransactionParams;
	forwardParams: ITransactionForwardParams;
}

const types = {
	Cast: [
		{ name: "params", type: "CastParams" },
		{ name: "forwardParams", type: "CastForwardParams" },
	],
	CastParams: [
		{ name: "actions", type: "Action[]" },
		{ name: "id", type: "uint256" },
		{ name: "avoNonce", type: "int256" },
		{ name: "salt", type: "bytes32" },
		{ name: "source", type: "address" },
		{ name: "metadata", type: "bytes" },
	],
	Action: [
		{ name: "target", type: "address" },
		{ name: "data", type: "bytes" },
		{ name: "value", type: "uint256" },
		{ name: "operation", type: "uint256" },
	],
	CastForwardParams: [
		{ name: "gas", type: "uint256" },
		{ name: "gasPrice", type: "uint256" },
		{ name: "validAfter", type: "uint256" },
		{ name: "validUntil", type: "uint256" },
		{ name: "value", type: "uint256" },
	],
};
interface PolygonUSDCProps {
	connectedAddress: string;
	avocadoAddress: string;
  }
export default function PolygonUSDC({ connectedAddress, avocadoAddress }: PolygonUSDCProps) {
	const [receiver, setReceiver] = useState("");
	const [amount, setAmount] = useState("0");
	//const [avocadoAddress, setAvocadoAddress] = useState("");
	//const [connectedAddress, setConnectedAddress] = useState("");
	const [isDeployed, setIsDeployed] = useState(false);
	const [nonce, setNonce] = useState("0");
	const searchParams = useSearchParams();

	// Router params
	const initialConnectedAddress = searchParams.get("connectedAddress") || "";
	const initialAvocadoAddress = searchParams.get("avocadoAddress") || "";

	const handleSendTokens = async () => {
		console.log("Receiver:", receiver);
		console.log("Amount:", amount);

		// -------------------------------- Setup -----------------------------------

		const avocadoRPCChainId = "634";

		const avocadoProvider = new ethers.providers.JsonRpcProvider(
			"https://rpc.avocado.instadapp.io"
		);
		console.log("Initialized avocadoProvider");

		// can use any other RPC on the network you want to interact with:
		const polygonProvider = new ethers.providers.JsonRpcProvider(
			"https://polygon-rpc.com"
		);
		console.log("Initialized polygonProvider");

		const chainId = (await polygonProvider.getNetwork()).chainId; // e.g. when executing later on Polygon
		console.log("Chain ID:", chainId);

		// Should be connected to chainId 634 (https://rpc.avocado.instadapp.io), before doing any transaction

		// request connection
		const provider = new ethers.providers.JsonRpcProvider(
			"https://rpc.avocado.instadapp.io"
		);
		console.log("Initialized provider");

		const avoForwarderAddress =
			"0x46978CD477A496028A18c02F07ab7F35EDBa5A54"; // available on 10+ networks
		console.log("AvoForwarder Address:", avoForwarderAddress);

		// set up AvoForwarder contract (main interaction point) on e.g. Polygon
		const forwarder = new ethers.Contract(
			avoForwarderAddress,
			avoForwarderV1ABI,
			polygonProvider
		);
		console.log("Initialized forwarder contract");

		const ownerAddress = connectedAddress; // Vitalik as owner EOA example
		console.log("Owner Address:", ownerAddress);

		const index = "0";

		const avocadoAddress = await forwarder.computeAvocado(
			ownerAddress,
			index
		);
		console.log("Computed Avocado Address:", avocadoAddress);

		// set up Avocado
		const avocado = new ethers.Contract(
			avocadoAddress,
			avocadoV1ABI,
			polygonProvider
		);
		console.log("Initialized avocado contract");

		const isDeployed =
			(await polygonProvider.getCode(avocadoAddress)) !== "0x";
		console.log("Is Avocado Deployed:", isDeployed);

		// -------------------------------- Read values -----------------------------------

		let domainName, domainVersion; // domain separator name & version required for building signatures

		if (isDeployed) {
			// if avocado is deployed, can read values directly from there
			[domainName, domainVersion] = await Promise.all([
				avocado.DOMAIN_SEPARATOR_NAME(),
				avocado.DOMAIN_SEPARATOR_VERSION(),
			]);
		} else {
			// if avocado is not deployed yet, AvoForwarder will resolve to the default values set when deploying the Avocado
			[domainName, domainVersion] = await Promise.all([
				forwarder.avocadoVersionName(ownerAddress, index),
				forwarder.avocadoVersion(ownerAddress, index),
			]);
		}
		console.log("Domain Name:", domainName);
		console.log("Domain Version:", domainVersion);

		const nonce = isDeployed ? await avocado.avoNonce() : "0";
		console.log("Nonce:", nonce);

		const requiredSigners = isDeployed
			? await avocado.requiredSigners()
			: 1;
		console.log("Required Signers:", requiredSigners);

		if (requiredSigners > 1) {
			throw new Error(
				"Example is for Avocado personal with only owner as signer"
			);
		}
		console.log("Checking required signers...");

		let txPayload; // Declare txPayload variable outside the try block

		try {
			// Build transaction payload
			// USDC address on Polygon (different on other networks)
			const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
			console.log("USDC Address:", usdcAddress);

			const usdcAmount = ethers.utils.parseUnits("10", 6);
			console.log("USDC Amount:", usdcAmount.toString());

			// sending to owner EOA address

			const usdcInterface = new ethers.utils.Interface([
				"function transfer(address to, uint amount) returns (bool)",
			]);
			const calldata = usdcInterface.encodeFunctionData("transfer", [
				receiver,
				usdcAmount,
			]); // create calldata from interface
			console.log("Encoded calldata:", calldata);

			const action: ITransactionAction = {
				target: usdcAddress,
				data: calldata,
				value: "0",
				operation: "0",
			};
			console.log("Action:", action);

			// transaction with action to transfer USDC
			txPayload = {
				params: {
					actions: [action],
					id: "0",
					avoNonce: nonce.toString(), // setting nonce to previously obtained value for sequential avoNonce
					salt: ethers.utils.defaultAbiCoder.encode(
						["uint256"],
						[Date.now()]
					),
					source: "0x000000000000000000000000000000000000Cad0", // could set source here for referral system
					metadata: "0x",
				},

				forwardParams: {
					gas: "0",
					gasPrice: "0",
					validAfter: "0",
					validUntil: "0",
					value: "0",
				},
			};
			console.log("Transaction Payload:", txPayload);

			// -------------------------------- Estimate fee -----------------------------------

			const estimate = await avocadoProvider.send(
				"txn_multisigEstimateFeeWithoutSignature",
				[
					{
						message: txPayload, // transaction payload as built in previous step
						owner: connectedAddress, // avocado owner EOA address
						safe: avocadoAddress, // avocado address
						index: 0,
						targetChainId: chainId,
					},
				]
			);
			// convert fee from hex and 1e18, is in USDC:
			console.log("Estimate:", Number(estimate.fee) / 1e18);
		} catch (error) {
			console.error("Error:", error);
			return; // Return early in case of error
		}
		console.log("Transaction payload built successfully");

		// -------------------------------- Sign -----------------------------------

		const domain = {
			name: domainName, // see previous steps
			version: domainVersion, // see previous steps
			chainId: avocadoRPCChainId,
			verifyingContract: avocadoAddress, // see previous steps
			salt: ethers.utils.solidityKeccak256(["uint256"], [chainId]), // salt is set to actual chain id where execution happens
		};

		console.log("Domain for signing:", domain);

		// make sure you are on chain id 634 (to interact with Avocado RPC) with expected owner
		const avoSigner = provider.getSigner();
		console.log("Avocado signer:", avoSigner);

		if ((await provider.getNetwork()).chainId !== 634) {
			throw new Error("Not connected to Avocado network");
		}
		if ((await avoSigner.getAddress()) !== ownerAddress) {
			throw new Error("Not connected with expected owner address");
		}

		// transaction payload as built in previous step
		const signature = await avoSigner._signTypedData(
			domain,
			types,
			txPayload
		);

		console.log("Signature:", signature);

		// -------------------------------- Execute -----------------------------------

		const txHash = await avocadoProvider.send("txn_broadcast", [
			{
				signatures: [
					{
						signature, // signature as built in previous step
						signer: ownerAddress, // signer address that signed the signature
					},
				],
				message: txPayload, // transaction payload as built in previous step
				owner: ownerAddress, // avocado owner EOA address
				safe: avocadoAddress, // avocado address
				index,
				targetChainId: chainId,
				executionSignature: undefined, // not required for Avocado personal
			},
		]);

		console.log("Transaction Hash:", txHash);

		// -------------------------------- Check status -----------------------------------

		const txDetails = await avocadoProvider.send(
			"api_getTransactionByHash",
			[txHash]
		);

		console.log("Transaction Details:", txDetails);

		// txDetails.status is of type 'pending' | 'success' | 'failed' | 'confirming'
		// in case of 'failed', use the error message: txDetails.revertReason
		if (txDetails.status === "failed") {
			// handle errors
			console.log("Transaction failed:", txDetails.revertReason);
		} else {
			// status might still be pending or confirming
			console.log(
				"Transaction executed successfully! Hash:",
				txHash,
				", Avoscan: https://avoscan.co/tx/" + txHash
			);
		}
	};

	// useEffect(() => {
	// 	setConnectedAddress(initialConnectedAddress);
	// 	setAvocadoAddress(initialAvocadoAddress);
	// }, [initialConnectedAddress, initialAvocadoAddress]);
	useEffect(() => {
		const checkDeployment = async () => {
			try {
				const polygonProvider = new ethers.providers.JsonRpcProvider(
					"https://polygon-rpc.com"
				);
				const code = await polygonProvider.getCode(avocadoAddress);
				setIsDeployed(code !== "0x");
				if (code !== "0x") {
					const avocadoContract = new ethers.Contract(
						avocadoAddress,
						avocadoV1ABI,
						polygonProvider
					);
					const contractNonce = await avocadoContract.avoNonce();
					setNonce(contractNonce.toString());
				} else {
					setNonce("0");
				}
			} catch (error) {
				console.error(error);
				setIsDeployed(false);
				setNonce("0");
			}
		};
		checkDeployment();
	});

	return (
		<div className='container mx-auto px-4'>
			<h1 className='text-2xl font-bold mb-4'>Send Polygon Tokens</h1>
			<div className='flex flex-col space-y-2'>
				<div>
					Connected Address: <span>{connectedAddress}</span>
				</div>
				<div>
					Avocado Address: <span>{avocadoAddress}</span>
				</div>
				<input
					type='text'
					placeholder='Receiver Address'
					className='border border-gray-300 px-3 py-2 rounded-md'
					value={receiver}
					onChange={(e) => setReceiver(e.target.value)}
				/>
				<input
					type='text'
					placeholder='Token Amount'
					className='border border-gray-300 px-3 py-2 rounded-md'
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
				<button
					className='bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors'
					onClick={handleSendTokens}>
					Send Tokens
				</button>
			</div>
		</div>
	);
}
