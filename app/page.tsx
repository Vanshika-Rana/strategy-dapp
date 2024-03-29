"use client";
import { Suspense } from "react";
import Image from "next/image";
import { IoCopyOutline } from "react-icons/io5";
import { useWeb3Modal, useWeb3ModalProvider } from "@web3modal/ethers5/react";
import { ethers } from "ethers";
import {
	AwaitedReactNode,
	JSXElementConstructor,
	ReactElement,
	ReactNode,
	useEffect,
	useState,
} from "react";
import avoForwarderV1ABI from "../constants/avo-forwarder-v1-abi.json";
import Link from "next/link";
import PolygonUSDC from "../components/PolygonUSDC";
const chains = {
	avocado: {
		rpcUrl: "https://rpc.avocado.instadapp.io/",
		forwarderAddress: "0x46978CD477A496028A18c02F07ab7F35EDBa5A54",
	},
	polygon: {
		rpcUrl: "https://polygon-rpc.com/",
		forwarderAddress: "0x46978CD477A496028A18c02F07ab7F35EDBa5A54",
	},
};
export default function Home() {
	const [connectedAddress, setConnectedAddress] = useState("");
	const [avocadoAddress, setAvocadoAddress] = useState("");
	const { open } = useWeb3Modal();
	const { walletProvider } = useWeb3ModalProvider();
	const [showSendComponent, setShowSendComponent] = useState(false);

	const generateWallet = async () => {
		if (walletProvider) {
			const web3Provider = new ethers.providers.Web3Provider(
				walletProvider
			);
			const signer = web3Provider.getSigner();
			const address = await signer.getAddress();
			setConnectedAddress(address);
			await createAvoWallet(address);
		}
	};

	const createAvoWallet = async (address: any) => {
		try {
			const provider = new ethers.providers.JsonRpcProvider(
				chains.polygon.rpcUrl
			);
			const forwarder = new ethers.Contract(
				chains.polygon.forwarderAddress,
				avoForwarderV1ABI,
				provider
			);

			const index = 0;
			const avocadoAddress = await forwarder.computeAvocado(
				address,
				index
			);
			setAvocadoAddress(avocadoAddress);
		} catch (err) {
			console.error("Error creating Avocado wallet:", err);
		}
	};

	useEffect(() => {
		generateWallet();
	}, [walletProvider]);

	return (
		<main className='flex flex-col items-center justify-between min-h-screen'>
			<section className='flex flex-col h-[80vh] items-center justify-center px-4 sm:px-6 lg:px-8'>
				{!connectedAddress && (
					<button
						onClick={() => open()}
						className='flex items-center justify-center gap-2 px-6 py-2 font-semibold text-white transition-transform duration-500 transform rounded-lg bg-emerald-950 hover:scale-95'>
						<span>Connect wallet</span>
					</button>
				)}
				{connectedAddress && (
					<div className='grid w-full grid-cols-1 gap-4 mt-8 md:grid-cols-2'>
						{/* Existing code... */}
						{showSendComponent ? (
							<PolygonUSDC
								connectedAddress={connectedAddress}
								avocadoAddress={avocadoAddress}
							/>
						) : (
							<>
								{renderAddressItem(
									"Connected EOA Address",
									connectedAddress
								)}
								{renderAddressItem(
									"Avocado Address",
									avocadoAddress
								)}
								<button
									onClick={() => setShowSendComponent(true)} // Toggle the visibility of the component
									className='flex items-center justify-center gap-2 px-6 py-2 font-semibold text-white transition-transform duration-500 transform rounded-lg bg-emerald-950 hover:scale-95'>
									<span>Send USDC on Polygon</span>
								</button>

								<Link href='/arbitrumArb'>
									<button className='flex items-center justify-center gap-2 px-6 py-2 font-semibold text-white transition-transform duration-500 transform rounded-lg bg-emerald-950 hover:scale-95'>
										<span>Send Arb on Arbitrum</span>
									</button>
								</Link>
							</>
						)}
					</div>
				)}
			</section>
		</main>
	);
}

const copyToClipboard = (text: string) => {
	navigator.clipboard.writeText(text);
};

function renderAddressItem(
	title:
		| string
		| number
		| boolean
		| ReactElement<any, string | JSXElementConstructor<any>>
		| Iterable<ReactNode>
		| Promise<AwaitedReactNode>
		| null
		| undefined,
	address: string | undefined
) {
	return (
		<div className='flex flex-col items-center p-4 border border-gray-300 rounded-lg'>
			<h2 className='mb-4 font-bold'>{title}</h2>
			<div className='flex items-center'>
				<p className='mr-2' title={address ?? ""}>
					{address?.slice(0, 6) + "..." + address?.slice(-4)}
				</p>
				<button
					onClick={() => copyToClipboard(address ?? "")}
					className='px-4 py-1 text-green-600 rounded-full hover:text-green-700 hover:scale-95'>
					<IoCopyOutline />
				</button>
			</div>
		</div>
	);
}
