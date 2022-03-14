import "ramda";

declare module "ramda" {
  type Chain<T> = { "fantasy-land/chain": T };

  // This is a shim for Ramda's "chain" function. The TS types for Ramda do not include chain's ability to
  // interoperate with the fantasy-land (a proper FP/categories library) "chain" concept. This is a crude
  // fix for that.
  export function chain<A, ChainA extends Chain<unknown>, ChainB extends Chain<unknown>>(fn: (n: A) => ChainB): (chain: ChainA) => ChainB
}
