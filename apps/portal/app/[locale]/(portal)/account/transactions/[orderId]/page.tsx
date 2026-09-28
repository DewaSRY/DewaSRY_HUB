import type { Metadata } from "next";
import { TransactionDetail } from "@/feature/billing";

// Client-rendered shell; the order id is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/account/transactions/[orderId]">): Promise<Metadata> {
  const { orderId } = await params;
  return { title: decodeURIComponent(orderId) };
}

export default async function TransactionPage({ params }: PageProps<"/[locale]/account/transactions/[orderId]">) {
  const { orderId } = await params;
  return <TransactionDetail orderId={decodeURIComponent(orderId)} />;
}
