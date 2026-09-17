"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartButton() {
  const [totalItems, setTotalItems] = useState(0);

  function updateCartCount() {
    const savedCart = JSON.parse(
      localStorage.getItem("newclothes-cart") || "[]"
    );

    const total = savedCart.reduce(
      (sum: number, item: { quantity?: number }) =>
        sum + (item.quantity || 1),
      0
    );

    setTotalItems(total);
  }

  useEffect(() => {
    updateCartCount();

    window.addEventListener(
      "newclothes-cart-updated",
      updateCartCount
    );

    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener(
        "newclothes-cart-updated",
        updateCartCount
      );

      window.removeEventListener(
        "storage",
        updateCartCount
      );
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="group flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[9px] font-black tracking-[0.2em] text-white transition-all duration-300 hover:border-white/35 hover:bg-white hover:text-black"
    >
      <span>
        BAG
      </span>

      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[8px] font-black text-black transition-colors duration-300 group-hover:bg-black group-hover:text-white">
        {totalItems}
      </span>

      <span className="text-sm leading-none opacity-60 transition-transform duration-300 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}