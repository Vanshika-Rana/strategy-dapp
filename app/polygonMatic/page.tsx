"use client";
import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers"; // ethers@v5
import { useSearchParams } from "next/navigation";
// Import ABI JSON files
import avocadoV1ABI from "../../constants/avocado-v1-abi.json";
import avoForwarderV1ABI from "../../constants/avocado-v1-abi.json";

declare let window: any;
const chains = {
	avocado: {
		rpcUrl: "https://rpc.avocado.instadapp.io/",
		
	},
	polygon: {
		rpcUrl: "https://polygon-rpc.com/",
		
	},
};
export default function SendTokens() {
	const [receiver, setReceiver] = useState("");
	const [amount, setAmount] = useState("");
	const [avocadoAddress, setAvocadoAddress] = useState("");
	const [connectedAddress, setConnectedAddress] = useState("");
	const searchParams = useSearchParams();
	const initialConnectedAddress = searchParams.get("connectedAddress") || "";
	console.log(initialConnectedAddress);
    const initialAvocadoAddress = searchParams.get("avocadoAddress") || "";
	console.log(initialAvocadoAddress);
	useEffect(() => {
		setConnectedAddress(initialConnectedAddress);
        setAvocadoAddress(initialAvocadoAddress);
	}, [initialConnectedAddress,initialAvocadoAddress]);

	// Ethereum provider setup
	const polygonProvider = new ethers.providers.JsonRpcProvider(
		"https://polygon-rpc.com"
	);

	// Avocado forwarder contract address
	const avoForwarderAddress = "0x46978CD477A496028A18c02F07ab7F35EDBa5A54"; // Available on 10+ networks

	

	// Function to send Polygon tokens
	const sendTokens = async () => {
		try {
			// Convert amount to token units
			const tokenAmount = ethers.utils.parseUnits(amount.toString(), 18); // Assuming token has 18 decimal places

			// Get USDC address on Polygon (change for other tokens)
			const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC address on Polygon

			// Encode transfer function data
			const usdcInterface = new ethers.utils.Interface([
				"function transfer(address to, uint256 amount)",
			]);
			const calldata = usdcInterface.encodeFunctionData("transfer", [
				receiver,
				tokenAmount,
			]);

			// Action to transfer tokens
			const action = {
				target: usdcAddress,
				data: calldata,
				value: ethers.utils.parseEther("0"), // Value in Wei (here, 0 ETH)
				operation: 0, // Call operation
			};

			// Transaction payload
			const txPayload = {
				actions: [action],
				id: 0,
				avoNonce: -1, // Using non-sequential nonce
				salt: ethers.utils.defaultAbiCoder.encode(
					["uint256"],
					[Date.now()]
				),
				source: "0x000000000000000000000000000000000000Cad0", // Source address (if required)
				metadata: "0x", // Metadata
			};

			// Check if window and window.ethereum is defined
			if (
				typeof window !== "undefined" &&
				typeof window.ethereum !== "undefined"
			) {
				// Sign transaction
				const signature = await window.ethereum.request({
					method: "eth_signTypedData",
					params: [txPayload, "AVOCADO_SIGNATURE"],
				});

				// Execute transaction
				const txHash = await forwarder.txn_broadcast({
					signatures: [{ signature, signer: "OWNER_ADDRESS" }],
					message: txPayload,
					owner: "OWNER_ADDRESS", // Replace with actual owner address
					safe: "AVOCADO_ADDRESS", // Replace with actual Avocado contract address
					index: "0", // Index
					targetChainId: "POLYGON_CHAIN_ID", // Polygon chain ID
					executionSignature: undefined, // Not required for Avocado personal
				});

				console.log("Transaction sent:", txHash);
			} else {
				console.error("Metamask or similar provider not detected.");
			}
		} catch (error: any) {
			console.error("Error sending tokens:", error.message);
		}
	};

	const handleSendTokens = () => {
		// Validate input
		if (!receiver || !amount) {
			console.error("Receiver address and amount are required");
			return;
		}

		// Send tokens
		sendTokens();
	};

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
